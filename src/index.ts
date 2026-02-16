import { serve } from "bun";
import index from "./index.html";
import {
  asHttpError,
  HttpError,
  ok,
  optionalBoolean,
  optionalNonEmptyString,
  optionalNumber,
  optionalString,
  parseJsonBody,
  queryString,
  requireObject,
  requireString,
  withErrorBoundary,
} from "./api/http";
import { GameRuleError } from "./game/engine";
import {
  configureServerPlayerCountResolver,
  createServer,
  getActiveSessionId,
  getServer,
  listServers,
  recordServerJoin,
  recordSnapshot,
  setActiveSessionId,
} from "./game/servers";
import {
  createParty,
  getParty,
  getPartyBySessionId,
  joinPartyByCode,
  leaveParty,
  linkPartySession,
  reopenParty,
  setPartyReady,
  startParty,
} from "./game/parties";
import { createRealtimeStream, publishPartyUpdate, publishSessionState, publishSystemNotice, startRealtimeHeartbeat } from "./game/realtime";
import {
  createSession,
  getSession,
  getState,
  joinSession,
  observeSession,
  performAction,
  type SessionRecord,
  stepSession,
} from "./game/sessions";
import type { Action, Direction, PartyState, Player } from "./game/types";
import { getSupabaseMode, verifyBearerToken } from "./supabase/client";

const VALID_DIRECTIONS: ReadonlyArray<Direction> = ["up", "down", "left", "right"];
const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);

function bunParams(request: Request): Record<string, string> {
  const req = request as Request & { params?: Record<string, string> };
  return req.params ?? {};
}

function mapDomainError(errorValue: unknown): HttpError {
  if (!(errorValue instanceof GameRuleError)) {
    return asHttpError(errorValue);
  }

  switch (errorValue.code) {
    case "SESSION_NOT_FOUND":
    case "PLAYER_NOT_FOUND":
    case "TARGET_NOT_FOUND":
    case "PARTY_NOT_FOUND":
    case "PARTY_MEMBER_NOT_FOUND":
      return new HttpError(404, errorValue.code, errorValue.message);
    case "PARTY_NOT_LEADER":
      return new HttpError(403, errorValue.code, errorValue.message);
    case "INVALID_SERVER_NAME":
    case "INVALID_MAX_PLAYERS":
    case "INVALID_ZOMBIE_COUNT":
    case "INVALID_PARTY_CODE":
    case "NO_SPAWN":
      return new HttpError(400, errorValue.code, errorValue.message);
    case "GAME_COMPLETED":
    case "PLAYER_DEAD":
    case "ATTACK_COOLDOWN":
    case "MOVE_BLOCKED":
    case "MOVE_OCCUPIED":
    case "TARGET_OUT_OF_RANGE":
    case "NO_ZOMBIES":
    case "PLAYER_EXISTS":
    case "SERVER_FULL":
    case "PARTY_FULL":
    case "PARTY_MEMBER_EXISTS":
    case "PARTY_NOT_OPEN":
    case "PARTY_NOT_READY":
      return new HttpError(409, errorValue.code, errorValue.message);
    default:
      return new HttpError(500, errorValue.code, errorValue.message);
  }
}

function partyPayload(party: PartyState): PartyState & { readyCount: number; allReady: boolean } {
  const readyCount = party.members.filter(member => member.ready).length;
  return {
    ...party,
    readyCount,
    allReady: readyCount === party.members.length,
  };
}

function resolveObservationPlayerId(sessionId: string, requestedPlayerId?: string): string {
  if (requestedPlayerId) {
    return requestedPlayerId;
  }

  const session = getSession(sessionId);
  if (!session) {
    throw new HttpError(404, "SESSION_NOT_FOUND", `Session "${sessionId}" was not found.`);
  }

  const firstPlayer = Object.values(session.state.players).sort((a, b) => a.id.localeCompare(b.id))[0];
  if (!firstPlayer) {
    throw new HttpError(404, "PLAYER_NOT_FOUND", "No players exist in this session.");
  }
  return firstPlayer.id;
}

function broadcastPartySessionIfPresent(sessionId: string): void {
  const party = getPartyBySessionId(sessionId);
  if (!party) {
    return;
  }

  const session = getSession(sessionId);
  if (!session) {
    return;
  }
  publishSessionState(party.partyId, session.state);
}

function parseActionBody(payload: Record<string, unknown>): Action {
  const actionType = requireString(payload.type, "type");

  if (actionType === "wait") {
    return { type: "wait" };
  }

  if (actionType === "move") {
    const directionRaw = requireString(payload.direction, "direction");
    if (!VALID_DIRECTIONS.includes(directionRaw as Direction)) {
      throw new HttpError(400, "INVALID_DIRECTION", `direction must be one of: ${VALID_DIRECTIONS.join(", ")}`);
    }
    return {
      type: "move",
      direction: directionRaw as Direction,
    };
  }

  if (actionType === "attack") {
    return {
      type: "attack",
      targetId: optionalNonEmptyString(payload.targetId, "targetId"),
    };
  }

  throw new HttpError(400, "INVALID_ACTION", 'type must be one of "move", "attack", "wait".');
}

async function createOrJoinGameSession(request: Request): Promise<Response> {
  const rawBody = await parseJsonBody(request);
  const body = requireObject(rawBody);
  const existingSessionId = optionalNonEmptyString(body.session, "session");
  const playerId = optionalNonEmptyString(body.playerId, "playerId");
  const playerName = optionalString(body.playerName, "playerName");
  const serverId = optionalNonEmptyString(body.serverId, "serverId");
  const zombieCount = optionalNumber(body.zombieCount, "zombieCount");
  const agentEnabled = optionalBoolean(body.agentEnabled, "agentEnabled");

  try {
    if (existingSessionId) {
      const existingSession = getSession(existingSessionId);
      if (serverId && existingSession && existingSession.serverId !== serverId) {
        throw new HttpError(
          409,
          "SESSION_SERVER_MISMATCH",
          `Session "${existingSessionId}" is not linked to server "${serverId}".`,
        );
      }

      if (existingSession?.serverId) {
        const linkedServer = await getServer(existingSession.serverId);
        if (linkedServer) {
          const currentPlayers = Object.keys(existingSession.state.players).length;
          if (currentPlayers >= linkedServer.maxPlayers) {
            throw new GameRuleError("SERVER_FULL", `Server "${linkedServer.name}" is full.`);
          }
        }
      }

      const { session, player } = joinSession({
        sessionId: existingSessionId,
        playerId,
        playerName,
      });
      if (session.serverId) {
        await recordServerJoin(session.serverId, player.id, player.name);
      }
      broadcastPartySessionIfPresent(session.sessionId);
      return ok({
        sessionId: session.sessionId,
        playerId: player.id,
        playerName: player.name,
        state: session.state,
        observation: observeSession(session.sessionId, player.id),
      });
    }

    if (serverId) {
      const existingServer = await getServer(serverId);
      if (!existingServer) {
        throw new HttpError(404, "SERVER_NOT_FOUND", `Server "${serverId}" was not found.`);
      }
    }

    const { session, player } = createSession({
      serverId,
      playerId,
      playerName,
      zombieCount,
      agentEnabled,
    });

    if (serverId) {
      setActiveSessionId(serverId, session.sessionId);
      await recordServerJoin(serverId, player.id, player.name);
      await recordSnapshot({ serverId, state: session.state });
    }
    broadcastPartySessionIfPresent(session.sessionId);

    return ok(
      {
        sessionId: session.sessionId,
        playerId: player.id,
        playerName: player.name,
        state: session.state,
        observation: observeSession(session.sessionId, player.id),
      },
      201,
    );
  } catch (errorValue) {
    throw mapDomainError(errorValue);
  }
}

async function getGameStateBySession(request: Request): Promise<Response> {
  const sessionId = queryString(new URL(request.url), "session");
  try {
    const state = getState(sessionId);
    return ok({ sessionId, state });
  } catch (errorValue) {
    throw mapDomainError(errorValue);
  }
}

async function observeGameSession(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const sessionId = queryString(url, "session");
  const requestedPlayerId = optionalNonEmptyString(url.searchParams.get("player"), "player");
  const playerId = resolveObservationPlayerId(sessionId, requestedPlayerId);

  try {
    return ok({
      sessionId,
      playerId,
      observation: observeSession(sessionId, playerId),
    });
  } catch (errorValue) {
    throw mapDomainError(errorValue);
  }
}

async function executeGameAction(request: Request): Promise<Response> {
  const rawBody = await parseJsonBody(request);
  const body = requireObject(rawBody);
  const sessionId = requireString(body.session, "session");
  const playerId = requireString(body.playerId, "playerId");
  const actionBody = requireObject(body.action, "Field \"action\" must be an object.");
  const action = parseActionBody(actionBody);

  try {
    const session = performAction(sessionId, playerId, action);
    if (session.serverId) {
      await recordSnapshot({ serverId: session.serverId, state: session.state });
    }
    broadcastPartySessionIfPresent(session.sessionId);

    return ok({
      sessionId: session.sessionId,
      playerId,
      state: session.state,
      observation: observeSession(session.sessionId, playerId),
    });
  } catch (errorValue) {
    throw mapDomainError(errorValue);
  }
}

async function tickGameSession(request: Request): Promise<Response> {
  const rawBody = await parseJsonBody(request);
  const body = requireObject(rawBody);
  const sessionId = requireString(body.session, "session");

  try {
    const session = stepSession(sessionId);
    if (session.serverId) {
      await recordSnapshot({ serverId: session.serverId, state: session.state });
    }
    broadcastPartySessionIfPresent(session.sessionId);
    return ok({
      sessionId: session.sessionId,
      state: session.state,
    });
  } catch (errorValue) {
    throw mapDomainError(errorValue);
  }
}

async function listLobbyServers(): Promise<Response> {
  try {
    const servers = await listServers();
    return ok({
      mode: getSupabaseMode(),
      servers,
    });
  } catch (errorValue) {
    throw mapDomainError(errorValue);
  }
}

async function createLobbyServer(request: Request): Promise<Response> {
  const auth = await verifyBearerToken(request.headers.get("authorization"));
  if (auth.mode === "enabled" && !auth.user) {
    if (auth.errorCode === "MISSING_TOKEN") {
      throw new HttpError(401, "UNAUTHORIZED", auth.errorMessage ?? "Missing bearer token.");
    }
    throw new HttpError(403, "FORBIDDEN", auth.errorMessage ?? "Bearer token is invalid.");
  }

  const rawBody = await parseJsonBody(request);
  const body = requireObject(rawBody);
  const name = requireString(body.name, "name");
  const description = optionalString(body.description, "description");
  const maxPlayers = optionalNumber(body.maxPlayers, "maxPlayers");

  try {
    const server = await createServer({
      name,
      description,
      maxPlayers,
      createdBy: auth.user?.id,
    });

    return ok(
      {
        mode: getSupabaseMode(),
        server,
      },
      201,
    );
  } catch (errorValue) {
    throw mapDomainError(errorValue);
  }
}

async function joinLobbyServer(request: Request): Promise<Response> {
  const params = bunParams(request);
  const rawServerId = params.id;
  if (!rawServerId || rawServerId.trim().length === 0) {
    throw new HttpError(400, "MISSING_SERVER_ID", "Route parameter \"id\" is required.");
  }
  const serverId = rawServerId.trim();

  const rawBody = await parseJsonBody(request);
  const body = requireObject(rawBody);
  const playerName = optionalString(body.playerName, "playerName");
  const playerId = optionalNonEmptyString(body.playerId, "playerId");

  const server = await getServer(serverId);
  if (!server) {
    throw new HttpError(404, "SERVER_NOT_FOUND", `Server "${serverId}" was not found.`);
  }

  try {
    const activeSessionId = getActiveSessionId(serverId);
    const activeSession = activeSessionId ? getSession(activeSessionId) : undefined;
    const playerCount = activeSession ? Object.keys(activeSession.state.players).length : 0;

    let sessionResult: { session: SessionRecord; player: Player };
    if (!activeSession || activeSession.state.status !== "active") {
      sessionResult = createSession({
        serverId,
        playerId,
        playerName,
      });
      setActiveSessionId(serverId, sessionResult.session.sessionId);
    } else if (playerCount >= server.maxPlayers) {
      throw new GameRuleError("SERVER_FULL", `Server "${server.name}" is full.`);
    } else {
      sessionResult = joinSession({
        sessionId: activeSession.sessionId,
        playerId,
        playerName,
      });
    }

    await recordServerJoin(serverId, sessionResult.player.id, sessionResult.player.name);
    await recordSnapshot({ serverId, state: sessionResult.session.state });

    return ok({
      server,
      sessionId: sessionResult.session.sessionId,
      playerId: sessionResult.player.id,
      playerName: sessionResult.player.name,
      state: sessionResult.session.state,
      observation: observeSession(sessionResult.session.sessionId, sessionResult.player.id),
    });
  } catch (errorValue) {
    throw mapDomainError(errorValue);
  }
}

async function createPartyLobby(request: Request): Promise<Response> {
  const rawBody = await parseJsonBody(request);
  const body = requireObject(rawBody);
  const playerId = optionalNonEmptyString(body.playerId, "playerId");
  const playerName = optionalString(body.playerName, "playerName");

  try {
    const created = createParty({
      playerId,
      playerName,
    });
    publishPartyUpdate(created.party);
    return ok(
      {
        party: partyPayload(created.party),
        player: created.member,
      },
      201,
    );
  } catch (errorValue) {
    throw mapDomainError(errorValue);
  }
}

async function joinPartyLobby(request: Request): Promise<Response> {
  const rawBody = await parseJsonBody(request);
  const body = requireObject(rawBody);
  const partyCode = requireString(body.partyCode, "partyCode");
  const playerId = optionalNonEmptyString(body.playerId, "playerId");
  const playerName = optionalString(body.playerName, "playerName");

  try {
    const joined = joinPartyByCode({
      partyCode,
      playerId,
      playerName,
    });
    publishPartyUpdate(joined.party);
    return ok({
      party: partyPayload(joined.party),
      player: joined.member,
    });
  } catch (errorValue) {
    throw mapDomainError(errorValue);
  }
}

async function getPartyState(request: Request): Promise<Response> {
  const partyId = queryString(new URL(request.url), "partyId");
  const party = getParty(partyId);
  if (!party) {
    throw new HttpError(404, "PARTY_NOT_FOUND", `Party "${partyId}" was not found.`);
  }

  const session = party.sessionId ? getSession(party.sessionId) : null;
  return ok({
    party: partyPayload(party),
    state: session?.state,
  });
}

async function setPartyMemberReadyState(request: Request): Promise<Response> {
  const rawBody = await parseJsonBody(request);
  const body = requireObject(rawBody);
  const partyId = requireString(body.partyId, "partyId");
  const playerId = requireString(body.playerId, "playerId");
  if (typeof body.ready !== "boolean") {
    throw new HttpError(400, "INVALID_FIELD", 'Field "ready" must be a boolean.');
  }
  const ready = body.ready as boolean;

  try {
    const updatedParty = setPartyReady({
      partyId,
      playerId,
      ready,
    });
    publishPartyUpdate(updatedParty);
    return ok({
      party: partyPayload(updatedParty),
    });
  } catch (errorValue) {
    throw mapDomainError(errorValue);
  }
}

async function leavePartyLobby(request: Request): Promise<Response> {
  const rawBody = await parseJsonBody(request);
  const body = requireObject(rawBody);
  const partyId = requireString(body.partyId, "partyId");
  const playerId = requireString(body.playerId, "playerId");

  try {
    const updated = leaveParty({
      partyId,
      playerId,
    });

    if (!updated) {
      return ok({
        party: null,
      });
    }

    publishPartyUpdate(updated);
    return ok({
      party: partyPayload(updated),
    });
  } catch (errorValue) {
    throw mapDomainError(errorValue);
  }
}

async function startPartyMatch(request: Request): Promise<Response> {
  const rawBody = await parseJsonBody(request);
  const body = requireObject(rawBody);
  const partyId = requireString(body.partyId, "partyId");
  const playerId = requireString(body.playerId, "playerId");
  const zombieCount = optionalNumber(body.zombieCount, "zombieCount");
  const agentEnabled = optionalBoolean(body.agentEnabled, "agentEnabled") ?? true;

  let startedParty: PartyState | null = null;

  try {
    const activeParty = startParty({
      partyId,
      playerId,
    });
    startedParty = activeParty;

    const leaderMember = activeParty.members.find(member => member.playerId === activeParty.leaderPlayerId);
    if (!leaderMember) {
      throw new GameRuleError("PARTY_MEMBER_NOT_FOUND", "Party leader is not present in party roster.");
    }

    const { session } = createSession({
      playerId: leaderMember.playerId,
      playerName: leaderMember.playerName,
      zombieCount,
      agentEnabled,
    });

    for (const member of activeParty.members) {
      if (member.playerId === leaderMember.playerId) {
        continue;
      }
      joinSession({
        sessionId: session.sessionId,
        playerId: member.playerId,
        playerName: member.playerName,
      });
    }

    const linkedParty = linkPartySession(activeParty.partyId, session.sessionId);
    const activeSession = getSession(session.sessionId);
    if (!activeSession) {
      throw new GameRuleError("SESSION_NOT_FOUND", `Session "${session.sessionId}" was not found after start.`);
    }

    publishPartyUpdate(linkedParty);
    publishSessionState(linkedParty.partyId, activeSession.state);
    publishSystemNotice(linkedParty.partyId, "info", `Party match started by ${leaderMember.playerName}.`);

    return ok({
      party: partyPayload(linkedParty),
      sessionId: activeSession.sessionId,
      state: activeSession.state,
    });
  } catch (errorValue) {
    if (startedParty) {
      try {
        const reopened = reopenParty(startedParty.partyId);
        publishPartyUpdate(reopened);
      } catch {
        // no-op
      }
    }
    throw mapDomainError(errorValue);
  }
}

async function openRealtimeStream(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const partyId = queryString(url, "partyId");
  const playerId = queryString(url, "playerId");
  const party = getParty(partyId);
  if (!party) {
    throw new HttpError(404, "PARTY_NOT_FOUND", `Party "${partyId}" was not found.`);
  }

  const partyMember = party.members.find(member => member.playerId === playerId);
  if (!partyMember) {
    throw new HttpError(404, "PARTY_MEMBER_NOT_FOUND", `Player "${playerId}" was not found in this party.`);
  }

  const streamResponse = createRealtimeStream({
    partyId,
    playerId,
    signal: request.signal,
  });

  return streamResponse;
}

configureServerPlayerCountResolver(sessionId => {
  const session = getSession(sessionId);
  if (!session) {
    return 0;
  }
  return Object.keys(session.state.players).length;
});

startRealtimeHeartbeat();

const server = serve({
  port: Number.isFinite(PORT) ? PORT : 3000,
  routes: {
    "/api/game/join": {
      POST: req => withErrorBoundary(() => createOrJoinGameSession(req)),
    },
    "/api/game/state": {
      GET: req => withErrorBoundary(() => getGameStateBySession(req)),
    },
    "/api/game/observe": {
      GET: req => withErrorBoundary(() => observeGameSession(req)),
    },
    "/api/game/action": {
      POST: req => withErrorBoundary(() => executeGameAction(req)),
    },
    "/api/game/tick": {
      POST: req => withErrorBoundary(() => tickGameSession(req)),
    },
    "/api/servers": {
      GET: () => withErrorBoundary(() => listLobbyServers()),
      POST: req => withErrorBoundary(() => createLobbyServer(req)),
    },
    "/api/servers/:id/join": {
      POST: req => withErrorBoundary(() => joinLobbyServer(req)),
    },
    "/api/party/create": {
      POST: req => withErrorBoundary(() => createPartyLobby(req)),
    },
    "/api/party/join": {
      POST: req => withErrorBoundary(() => joinPartyLobby(req)),
    },
    "/api/party/state": {
      GET: req => withErrorBoundary(() => getPartyState(req)),
    },
    "/api/party/ready": {
      POST: req => withErrorBoundary(() => setPartyMemberReadyState(req)),
    },
    "/api/party/start": {
      POST: req => withErrorBoundary(() => startPartyMatch(req)),
    },
    "/api/party/leave": {
      POST: req => withErrorBoundary(() => leavePartyLobby(req)),
    },
    "/api/realtime/stream": {
      GET: req => withErrorBoundary(() => openRealtimeStream(req)),
    },
    "/*": index,
  },
  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
