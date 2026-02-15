import { serve } from "bun";
import index from "./index.html";
import {
  asHttpError,
  HttpError,
  ok,
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
  createSession,
  getSession,
  getState,
  joinSession,
  observeSession,
  performAction,
  type SessionRecord,
  stepSession,
} from "./game/sessions";
import type { Action, Direction, Player } from "./game/types";
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
      return new HttpError(404, errorValue.code, errorValue.message);
    case "INVALID_SERVER_NAME":
    case "INVALID_MAX_PLAYERS":
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
      return new HttpError(409, errorValue.code, errorValue.message);
    default:
      return new HttpError(500, errorValue.code, errorValue.message);
  }
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
      targetId: optionalString(payload.targetId, "targetId"),
    };
  }

  throw new HttpError(400, "INVALID_ACTION", 'type must be one of "move", "attack", "wait".');
}

async function createOrJoinGameSession(request: Request): Promise<Response> {
  const rawBody = await parseJsonBody(request);
  const body = requireObject(rawBody);
  const existingSessionId = optionalString(body.session, "session");
  const playerId = optionalString(body.playerId, "playerId");
  const playerName = optionalString(body.playerName, "playerName");
  const serverId = optionalString(body.serverId, "serverId");
  const zombieCount = optionalNumber(body.zombieCount, "zombieCount");

  try {
    if (existingSessionId) {
      const { session, player } = joinSession({
        sessionId: existingSessionId,
        playerId,
        playerName,
      });
      if (session.serverId) {
        await recordServerJoin(session.serverId, player.id, player.name);
      }
      return ok({
        sessionId: session.sessionId,
        playerId: player.id,
        playerName: player.name,
        state: session.state,
        observation: observeSession(session.sessionId, player.id),
      });
    }

    const { session, player } = createSession({
      serverId,
      playerId,
      playerName,
      zombieCount,
    });

    if (serverId) {
      setActiveSessionId(serverId, session.sessionId);
      await recordServerJoin(serverId, player.id, player.name);
      await recordSnapshot({ serverId, state: session.state });
    }

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
  const requestedPlayerId = optionalString(url.searchParams.get("player"), "player");
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
  const serverId = params.id;
  if (!serverId) {
    throw new HttpError(400, "MISSING_SERVER_ID", "Route parameter \"id\" is required.");
  }

  const rawBody = await parseJsonBody(request);
  const body = requireObject(rawBody);
  const playerName = optionalString(body.playerName, "playerName");
  const playerId = optionalString(body.playerId, "playerId");

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

configureServerPlayerCountResolver(sessionId => {
  const session = getSession(sessionId);
  if (!session) {
    return 0;
  }
  return Object.keys(session.state.players).length;
});

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
    "/*": index,
  },
  development: process.env.NODE_ENV !== "production" && {
    hmr: true,
    console: true,
  },
});

console.log(`🚀 Server running at ${server.url}`);
