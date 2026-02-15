import { afterAll, beforeAll, describe, expect, test } from "bun:test";

interface RunningServer {
  process: Bun.Subprocess<"ignore", "pipe", "pipe">;
  baseUrl: string;
}

const BUN_BINARY = process.execPath;

async function waitForServer(baseUrl: string, timeoutMs = 10000): Promise<void> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(`${baseUrl}/api/servers`);
      if (response.ok || response.status >= 400) {
        return;
      }
    } catch {
      // Retry until timeout.
    }

    await Bun.sleep(150);
  }

  throw new Error(`Server did not become ready at ${baseUrl} within ${timeoutMs}ms`);
}

function startServer(port: number, envOverrides: Record<string, string>): RunningServer {
  const spawned = Bun.spawn([BUN_BINARY, "src/index.ts"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      SUPABASE_URL: "",
      SUPABASE_ANON_KEY: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      ...envOverrides,
    },
    stdin: "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });

  return {
    process: spawned,
    baseUrl: `http://127.0.0.1:${port}`,
  };
}

async function stopServer(server: RunningServer | null): Promise<void> {
  if (!server || server.process.killed) {
    return;
  }
  server.process.kill();
  await server.process.exited;
}

describe("RPC API integration (fallback mode)", () => {
  let server: RunningServer | null = null;

  beforeAll(async () => {
    server = startServer(3101, {});
    await waitForServer(server.baseUrl);
  });

  afterAll(async () => {
    await stopServer(server);
  });

  test("join -> action -> state loop succeeds", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;
    const joinResponse = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "IntegrationRunner" }),
    });
    const joinPayload = await joinResponse.json();
    expect(joinResponse.status).toBe(201);
    expect(joinPayload.ok).toBe(true);
    const sessionId = joinPayload.data.sessionId as string;
    const playerId = joinPayload.data.playerId as string;

    const actionResponse = await fetch(`${baseUrl}/api/game/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: sessionId,
        playerId,
        action: { type: "move", direction: "right" },
      }),
    });
    const actionPayload = await actionResponse.json();
    expect(actionResponse.status).toBe(200);
    expect(actionPayload.ok).toBe(true);

    const stateResponse = await fetch(`${baseUrl}/api/game/state?session=${encodeURIComponent(sessionId)}`);
    const statePayload = await stateResponse.json();
    expect(stateResponse.status).toBe(200);
    expect(statePayload.ok).toBe(true);
    expect(statePayload.data.state.tick).toBeGreaterThanOrEqual(1);
  });

  test("join defaults player naming and deterministic ids when not provided", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const firstJoin = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const firstPayload = await firstJoin.json();
    expect(firstJoin.status).toBe(201);
    expect(firstPayload.ok).toBe(true);

    const sessionId = firstPayload.data.sessionId as string;
    expect(firstPayload.data.playerName).toBe("Survivor-1");
    expect(firstPayload.data.playerId).toBe(`p-${sessionId}-1`);

    const secondJoin = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session: sessionId }),
    });
    const secondPayload = await secondJoin.json();
    expect(secondJoin.status).toBe(200);
    expect(secondPayload.ok).toBe(true);
    expect(secondPayload.data.playerName).toBe("Survivor-2");
    expect(secondPayload.data.playerId).toBe("p-2");
  });

  test("join accepts explicit playerId for session creation and joining", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const firstJoin = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId: "custom-player-1",
        playerName: "CustomOne",
      }),
    });
    const firstPayload = await firstJoin.json();
    expect(firstJoin.status).toBe(201);
    expect(firstPayload.ok).toBe(true);
    expect(firstPayload.data.playerId).toBe("custom-player-1");

    const sessionId = firstPayload.data.sessionId as string;

    const secondJoin = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: sessionId,
        playerId: "custom-player-2",
        playerName: "CustomTwo",
      }),
    });
    const secondPayload = await secondJoin.json();
    expect(secondJoin.status).toBe(200);
    expect(secondPayload.ok).toBe(true);
    expect(secondPayload.data.playerId).toBe("custom-player-2");
  });

  test("joining session with blank playerName falls back to Survivor naming", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const firstJoin = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "Host" }),
    });
    const firstPayload = await firstJoin.json();
    const sessionId = firstPayload.data.sessionId as string;

    const secondJoin = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: sessionId,
        playerName: "   ",
      }),
    });
    const secondPayload = await secondJoin.json();

    expect(secondJoin.status).toBe(200);
    expect(secondPayload.ok).toBe(true);
    expect(secondPayload.data.playerName).toBe("Survivor-2");
  });

  test("invalid direction is rejected with 400", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const joinResponse = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "IntegrationRunner2" }),
    });
    const joinPayload = await joinResponse.json();

    const response = await fetch(`${baseUrl}/api/game/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: joinPayload.data.sessionId,
        playerId: joinPayload.data.playerId,
        action: { type: "move", direction: "north" },
      }),
    });

    const payload = await response.json();
    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("INVALID_DIRECTION");
  });

  test("invalid join field types return INVALID_FIELD", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const joinResponse = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: 123 }),
    });
    const joinPayload = await joinResponse.json();

    expect(joinResponse.status).toBe(400);
    expect(joinPayload.ok).toBe(false);
    expect(joinPayload.error.code).toBe("INVALID_FIELD");
  });

  test("invalid action payload field types return INVALID_FIELD", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const joinResponse = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "FieldTypeRunner" }),
    });
    const joinPayload = await joinResponse.json();
    const sessionId = joinPayload.data.sessionId as string;
    const playerId = joinPayload.data.playerId as string;

    const moveMissingDirection = await fetch(`${baseUrl}/api/game/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: sessionId,
        playerId,
        action: { type: "move" },
      }),
    });
    const moveMissingDirectionPayload = await moveMissingDirection.json();

    expect(moveMissingDirection.status).toBe(400);
    expect(moveMissingDirectionPayload.ok).toBe(false);
    expect(moveMissingDirectionPayload.error.code).toBe("INVALID_FIELD");

    const attackInvalidTarget = await fetch(`${baseUrl}/api/game/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: sessionId,
        playerId,
        action: { type: "attack", targetId: 42 },
      }),
    });
    const attackInvalidTargetPayload = await attackInvalidTarget.json();

    expect(attackInvalidTarget.status).toBe(400);
    expect(attackInvalidTargetPayload.ok).toBe(false);
    expect(attackInvalidTargetPayload.error.code).toBe("INVALID_FIELD");
  });

  test("fractional zombieCount is rejected with INVALID_ZOMBIE_COUNT", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const response = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName: "FractionalZombieCount",
        zombieCount: 1.5,
      }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("INVALID_ZOMBIE_COUNT");
  });

  test("move blocked by map wall returns conflict", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const joinResponse = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "WallRunner" }),
    });
    const joinPayload = await joinResponse.json();
    const sessionId = joinPayload.data.sessionId as string;
    const playerId = joinPayload.data.playerId as string;

    const left1 = await fetch(`${baseUrl}/api/game/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: sessionId,
        playerId,
        action: { type: "move", direction: "left" },
      }),
    });
    expect(left1.status).toBe(200);

    const left2 = await fetch(`${baseUrl}/api/game/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: sessionId,
        playerId,
        action: { type: "move", direction: "left" },
      }),
    });
    const left2Payload = await left2.json();
    expect(left2.status).toBe(409);
    expect(left2Payload.ok).toBe(false);
    expect(left2Payload.error.code).toBe("MOVE_BLOCKED");
  });

  test("move into occupied tile returns conflict", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const hostJoinResponse = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "OccupyHost" }),
    });
    const hostJoinPayload = await hostJoinResponse.json();
    const sessionId = hostJoinPayload.data.sessionId as string;
    const hostPlayerId = hostJoinPayload.data.playerId as string;

    const guestJoinResponse = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session: sessionId, playerName: "OccupyGuest" }),
    });
    const guestJoinPayload = await guestJoinResponse.json();
    expect(guestJoinResponse.status).toBe(200);
    expect(guestJoinPayload.ok).toBe(true);

    const moveUp = await fetch(`${baseUrl}/api/game/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: sessionId,
        playerId: hostPlayerId,
        action: { type: "move", direction: "up" },
      }),
    });
    expect(moveUp.status).toBe(200);

    const moveLeft = await fetch(`${baseUrl}/api/game/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: sessionId,
        playerId: hostPlayerId,
        action: { type: "move", direction: "left" },
      }),
    });
    const moveLeftPayload = await moveLeft.json();
    expect(moveLeft.status).toBe(409);
    expect(moveLeftPayload.ok).toBe(false);
    expect(moveLeftPayload.error.code).toBe("MOVE_OCCUPIED");
  });

  test("invalid zombieCount is rejected with 400", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const response = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName: "InvalidZombieCount",
        zombieCount: 1.5,
      }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("INVALID_ZOMBIE_COUNT");
  });

  test("joining game with unknown serverId returns 404", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const response = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName: "UnknownServerJoin",
        serverId: "srv-missing",
      }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("SERVER_NOT_FOUND");
  });

  test("joining unknown existing session returns 404", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const response = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: "missing-session-id",
        playerName: "GhostJoiner",
      }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("SESSION_NOT_FOUND");
  });

  test("joining existing server session honors server max player limit", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const createServerResponse = await fetch(`${baseUrl}/api/servers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Session Capacity",
        maxPlayers: 1,
      }),
    });
    const createServerPayload = await createServerResponse.json();
    const serverId = createServerPayload.data.server.id as string;

    const joinServerResponse = await fetch(`${baseUrl}/api/servers/${encodeURIComponent(serverId)}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "Host" }),
    });
    const joinServerPayload = await joinServerResponse.json();
    const sessionId = joinServerPayload.data.sessionId as string;

    const secondJoinResponse = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: sessionId,
        playerName: "Guest",
      }),
    });
    const secondJoinPayload = await secondJoinResponse.json();

    expect(secondJoinResponse.status).toBe(409);
    expect(secondJoinPayload.ok).toBe(false);
    expect(secondJoinPayload.error.code).toBe("SERVER_FULL");
  });

  test("joining existing session with mismatched serverId returns 409", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const createPrimary = await fetch(`${baseUrl}/api/servers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Primary Lobby",
        maxPlayers: 3,
      }),
    });
    const primaryPayload = await createPrimary.json();
    const primaryServerId = primaryPayload.data.server.id as string;

    const createSecondary = await fetch(`${baseUrl}/api/servers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Secondary Lobby",
        maxPlayers: 3,
      }),
    });
    const secondaryPayload = await createSecondary.json();
    const secondaryServerId = secondaryPayload.data.server.id as string;

    const joinPrimary = await fetch(`${baseUrl}/api/servers/${encodeURIComponent(primaryServerId)}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "Host" }),
    });
    const joinPrimaryPayload = await joinPrimary.json();
    const sessionId = joinPrimaryPayload.data.sessionId as string;

    const mismatchJoin = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: sessionId,
        serverId: secondaryServerId,
        playerName: "Intruder",
      }),
    });
    const mismatchPayload = await mismatchJoin.json();

    expect(mismatchJoin.status).toBe(409);
    expect(mismatchPayload.ok).toBe(false);
    expect(mismatchPayload.error.code).toBe("SESSION_SERVER_MISMATCH");
  });

  test("observe defaults to first player when player query omitted", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const joinResponse = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "Observer" }),
    });
    const joinPayload = await joinResponse.json();
    const sessionId = joinPayload.data.sessionId as string;
    const expectedPlayerId = joinPayload.data.playerId as string;

    const observeResponse = await fetch(`${baseUrl}/api/game/observe?session=${encodeURIComponent(sessionId)}`);
    const observePayload = await observeResponse.json();

    expect(observeResponse.status).toBe(200);
    expect(observePayload.ok).toBe(true);
    expect(observePayload.data.playerId).toBe(expectedPlayerId);
    expect(observePayload.data.observation.playerId).toBe(expectedPlayerId);
  });

  test("observe with unknown player returns 404", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const joinResponse = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "Observer2" }),
    });
    const joinPayload = await joinResponse.json();
    const sessionId = joinPayload.data.sessionId as string;

    const observeResponse = await fetch(
      `${baseUrl}/api/game/observe?session=${encodeURIComponent(sessionId)}&player=${encodeURIComponent("ghost-player")}`,
    );
    const observePayload = await observeResponse.json();

    expect(observeResponse.status).toBe(404);
    expect(observePayload.ok).toBe(false);
    expect(observePayload.error.code).toBe("PLAYER_NOT_FOUND");
  });

  test("state and observe reject unknown sessions", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const stateResponse = await fetch(`${baseUrl}/api/game/state?session=${encodeURIComponent("missing-session-id")}`);
    const statePayload = await stateResponse.json();
    expect(stateResponse.status).toBe(404);
    expect(statePayload.ok).toBe(false);
    expect(statePayload.error.code).toBe("SESSION_NOT_FOUND");

    const observeResponse = await fetch(`${baseUrl}/api/game/observe?session=${encodeURIComponent("missing-session-id")}`);
    const observePayload = await observeResponse.json();
    expect(observeResponse.status).toBe(404);
    expect(observePayload.ok).toBe(false);
    expect(observePayload.error.code).toBe("SESSION_NOT_FOUND");
  });

  test("action and tick reject unknown sessions", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const actionResponse = await fetch(`${baseUrl}/api/game/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: "missing-session-id",
        playerId: "missing-player-id",
        action: { type: "wait" },
      }),
    });
    const actionPayload = await actionResponse.json();
    expect(actionResponse.status).toBe(404);
    expect(actionPayload.ok).toBe(false);
    expect(actionPayload.error.code).toBe("SESSION_NOT_FOUND");

    const tickResponse = await fetch(`${baseUrl}/api/game/tick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: "missing-session-id",
      }),
    });
    const tickPayload = await tickResponse.json();
    expect(tickResponse.status).toBe(404);
    expect(tickPayload.ok).toBe(false);
    expect(tickPayload.error.code).toBe("SESSION_NOT_FOUND");
  });

  test("observe without session query returns 400", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const response = await fetch(`${baseUrl}/api/game/observe`);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("MISSING_QUERY");
  });

  test("tick without session field returns 400", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const response = await fetch(`${baseUrl}/api/game/tick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("INVALID_FIELD");
  });

  test("invalid action type returns 400", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const joinResponse = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "BadActionUser" }),
    });
    const joinPayload = await joinResponse.json();
    const sessionId = joinPayload.data.sessionId as string;
    const playerId = joinPayload.data.playerId as string;

    const actionResponse = await fetch(`${baseUrl}/api/game/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: sessionId,
        playerId,
        action: { type: "dance" },
      }),
    });
    const actionPayload = await actionResponse.json();

    expect(actionResponse.status).toBe(400);
    expect(actionPayload.ok).toBe(false);
    expect(actionPayload.error.code).toBe("INVALID_ACTION");
  });

  test("out-of-range attack returns conflict", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const joinResponse = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "OutOfRangeAttacker" }),
    });
    const joinPayload = await joinResponse.json();

    const attackResponse = await fetch(`${baseUrl}/api/game/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: joinPayload.data.sessionId,
        playerId: joinPayload.data.playerId,
        action: { type: "attack", targetId: "z-1" },
      }),
    });
    const attackPayload = await attackResponse.json();

    expect(attackResponse.status).toBe(409);
    expect(attackPayload.ok).toBe(false);
    expect(attackPayload.error.code).toBe("TARGET_OUT_OF_RANGE");
  });

  test("attack cooldown is enforced once in range", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const joinResponse = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "CooldownTester", zombieCount: 1 }),
    });
    const joinPayload = await joinResponse.json();
    const sessionId = joinPayload.data.sessionId as string;
    const playerId = joinPayload.data.playerId as string;

    let inRange = false;
    for (let step = 0; step < 80; step++) {
      const tickResponse = await fetch(`${baseUrl}/api/game/tick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: sessionId }),
      });
      const tickPayload = await tickResponse.json();
      expect(tickResponse.status).toBe(200);
      expect(tickPayload.ok).toBe(true);

      const observeResponse = await fetch(
        `${baseUrl}/api/game/observe?session=${encodeURIComponent(sessionId)}&player=${encodeURIComponent(playerId)}`,
      );
      const observePayload = await observeResponse.json();
      expect(observeResponse.status).toBe(200);
      expect(observePayload.ok).toBe(true);
      const nearestDistance = observePayload.data.observation.nearestZombie?.distance as number | undefined;

      if (nearestDistance !== undefined && nearestDistance <= 1) {
        inRange = true;
        break;
      }
    }

    expect(inRange).toBe(true);

    const firstAttack = await fetch(`${baseUrl}/api/game/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: sessionId,
        playerId,
        action: { type: "attack" },
      }),
    });
    const firstAttackPayload = await firstAttack.json();
    expect(firstAttack.status).toBe(200);
    expect(firstAttackPayload.ok).toBe(true);

    const secondAttack = await fetch(`${baseUrl}/api/game/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: sessionId,
        playerId,
        action: { type: "attack" },
      }),
    });
    const secondAttackPayload = await secondAttack.json();
    expect(secondAttack.status).toBe(409);
    expect(secondAttackPayload.ok).toBe(false);
    expect(secondAttackPayload.error.code).toBe("ATTACK_COOLDOWN");
  });

  test("non-object action payload returns 400", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const joinResponse = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "BadActionShape" }),
    });
    const joinPayload = await joinResponse.json();

    const actionResponse = await fetch(`${baseUrl}/api/game/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: joinPayload.data.sessionId,
        playerId: joinPayload.data.playerId,
        action: "not-an-object",
      }),
    });
    const actionPayload = await actionResponse.json();

    expect(actionResponse.status).toBe(400);
    expect(actionPayload.ok).toBe(false);
    expect(actionPayload.error.code).toBe("INVALID_BODY");
  });

  test("invalid JSON body returns 400", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const response = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{invalid-json",
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("INVALID_JSON");
  });

  test("invalid JSON for action and tick returns 400", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const actionResponse = await fetch(`${baseUrl}/api/game/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{invalid-json",
    });
    const actionPayload = await actionResponse.json();
    expect(actionResponse.status).toBe(400);
    expect(actionPayload.ok).toBe(false);
    expect(actionPayload.error.code).toBe("INVALID_JSON");

    const tickResponse = await fetch(`${baseUrl}/api/game/tick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{invalid-json",
    });
    const tickPayload = await tickResponse.json();
    expect(tickResponse.status).toBe(400);
    expect(tickPayload.ok).toBe(false);
    expect(tickPayload.error.code).toBe("INVALID_JSON");
  });

  test("non-object JSON body returns INVALID_BODY across key endpoints", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const joinResponse = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([]),
    });
    const joinPayload = await joinResponse.json();
    expect(joinResponse.status).toBe(400);
    expect(joinPayload.ok).toBe(false);
    expect(joinPayload.error.code).toBe("INVALID_BODY");

    const actionResponse = await fetch(`${baseUrl}/api/game/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([]),
    });
    const actionPayload = await actionResponse.json();
    expect(actionResponse.status).toBe(400);
    expect(actionPayload.ok).toBe(false);
    expect(actionPayload.error.code).toBe("INVALID_BODY");

    const serverCreateResponse = await fetch(`${baseUrl}/api/servers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([]),
    });
    const serverCreatePayload = await serverCreateResponse.json();
    expect(serverCreateResponse.status).toBe(400);
    expect(serverCreatePayload.ok).toBe(false);
    expect(serverCreatePayload.error.code).toBe("INVALID_BODY");

    const serverJoinResponse = await fetch(`${baseUrl}/api/servers/not-a-server/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([]),
    });
    const serverJoinPayload = await serverJoinResponse.json();
    expect(serverJoinResponse.status).toBe(400);
    expect(serverJoinPayload.ok).toBe(false);
    expect(serverJoinPayload.error.code).toBe("INVALID_BODY");
  });

  test("actions are rejected after game is completed", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const joinResponse = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName: "Winner",
        zombieCount: 1,
      }),
    });
    const joinPayload = await joinResponse.json();
    const sessionId = joinPayload.data.sessionId as string;
    const playerId = joinPayload.data.playerId as string;
    let latestStatus: string = "active";
    for (let index = 0; index < 80; index++) {
      const tickResponse = await fetch(`${baseUrl}/api/game/tick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: sessionId }),
      });
      const tickPayload = await tickResponse.json();
      expect(tickResponse.status).toBe(200);
      expect(tickPayload.ok).toBe(true);
      latestStatus = tickPayload.data.state.status as string;
      if (latestStatus !== "active") {
        break;
      }
    }

    expect(latestStatus).toBe("lost");

    const rejectedAction = await fetch(`${baseUrl}/api/game/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: sessionId,
        playerId,
        action: { type: "wait" },
      }),
    });
    const rejectedPayload = await rejectedAction.json();
    expect(rejectedAction.status).toBe(409);
    expect(rejectedPayload.ok).toBe(false);
    expect(rejectedPayload.error.code).toBe("GAME_COMPLETED");
  });

  test("manual tick is rejected after game completion", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const joinResponse = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName: "TickWinner",
        zombieCount: 1,
      }),
    });
    const joinPayload = await joinResponse.json();
    const sessionId = joinPayload.data.sessionId as string;
    const playerId = joinPayload.data.playerId as string;
    let latestStatus: string = "active";
    for (let index = 0; index < 80; index++) {
      const tickProgress = await fetch(`${baseUrl}/api/game/tick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: sessionId }),
      });
      const progressPayload = await tickProgress.json();
      expect(tickProgress.status).toBe(200);
      expect(progressPayload.ok).toBe(true);
      latestStatus = progressPayload.data.state.status as string;
      if (latestStatus !== "active") {
        break;
      }
    }

    expect(latestStatus).toBe("lost");

    const tickResponse = await fetch(`${baseUrl}/api/game/tick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session: sessionId }),
    });
    const tickPayload = await tickResponse.json();

    expect(tickResponse.status).toBe(409);
    expect(tickPayload.ok).toBe(false);
    expect(tickPayload.error.code).toBe("GAME_COMPLETED");
  });

  test("server join enforces max player capacity", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const createResponse = await fetch(`${baseUrl}/api/servers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Capacity Test",
        maxPlayers: 2,
      }),
    });
    const createPayload = await createResponse.json();
    expect(createResponse.status).toBe(201);
    expect(createPayload.ok).toBe(true);
    const serverId = createPayload.data.server.id as string;

    const join1 = await fetch(`${baseUrl}/api/servers/${encodeURIComponent(serverId)}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "Player-1" }),
    });
    expect(join1.status).toBe(200);

    const join2 = await fetch(`${baseUrl}/api/servers/${encodeURIComponent(serverId)}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "Player-2" }),
    });
    expect(join2.status).toBe(200);

    const join3 = await fetch(`${baseUrl}/api/servers/${encodeURIComponent(serverId)}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "Player-3" }),
    });
    const join3Payload = await join3.json();
    expect(join3.status).toBe(409);
    expect(join3Payload.ok).toBe(false);
    expect(join3Payload.error.code).toBe("SERVER_FULL");
  });

  test("server join reuses active session until completion", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const createResponse = await fetch(`${baseUrl}/api/servers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Session Reuse",
        maxPlayers: 3,
      }),
    });
    const createPayload = await createResponse.json();
    const serverId = createPayload.data.server.id as string;

    const firstJoin = await fetch(`${baseUrl}/api/servers/${encodeURIComponent(serverId)}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "Reuse-A" }),
    });
    const firstJoinPayload = await firstJoin.json();
    const sessionId = firstJoinPayload.data.sessionId as string;
    expect(firstJoin.status).toBe(200);

    const secondJoin = await fetch(`${baseUrl}/api/servers/${encodeURIComponent(serverId)}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "Reuse-B" }),
    });
    const secondJoinPayload = await secondJoin.json();
    expect(secondJoin.status).toBe(200);
    expect(secondJoinPayload.data.sessionId).toBe(sessionId);
  });

  test("server join starts a new session after active one completes", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const createResponse = await fetch(`${baseUrl}/api/servers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Session Rotation",
        maxPlayers: 3,
      }),
    });
    const createPayload = await createResponse.json();
    const serverId = createPayload.data.server.id as string;

    const firstJoin = await fetch(`${baseUrl}/api/servers/${encodeURIComponent(serverId)}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "Rotate-A" }),
    });
    const firstJoinPayload = await firstJoin.json();
    const firstSessionId = firstJoinPayload.data.sessionId as string;
    expect(firstJoin.status).toBe(200);

    let finalStatus = "active";
    for (let index = 0; index < 80; index++) {
      const tickResponse = await fetch(`${baseUrl}/api/game/tick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: firstSessionId }),
      });
      const tickPayload = await tickResponse.json();
      expect(tickResponse.status).toBe(200);
      expect(tickPayload.ok).toBe(true);
      finalStatus = tickPayload.data.state.status as string;
      if (finalStatus !== "active") {
        break;
      }
    }
    expect(finalStatus).not.toBe("active");

    const secondJoin = await fetch(`${baseUrl}/api/servers/${encodeURIComponent(serverId)}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "Rotate-B" }),
    });
    const secondJoinPayload = await secondJoin.json();

    expect(secondJoin.status).toBe(200);
    expect(secondJoinPayload.ok).toBe(true);
    expect(secondJoinPayload.data.sessionId).not.toBe(firstSessionId);
  });

  test("joining same session with duplicate playerId is rejected", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const joinResponse = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerName: "DuplicateIdHost",
      }),
    });
    const joinPayload = await joinResponse.json();
    const sessionId = joinPayload.data.sessionId as string;
    const playerId = joinPayload.data.playerId as string;

    const duplicateJoin = await fetch(`${baseUrl}/api/game/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session: sessionId,
        playerId,
        playerName: "DuplicateIdHost",
      }),
    });
    const duplicatePayload = await duplicateJoin.json();

    expect(duplicateJoin.status).toBe(409);
    expect(duplicatePayload.ok).toBe(false);
    expect(duplicatePayload.error.code).toBe("PLAYER_EXISTS");
  });

  test("joining unknown server returns 404", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const response = await fetch(`${baseUrl}/api/servers/${encodeURIComponent("not-a-server")}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "Ghost" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("SERVER_NOT_FOUND");
  });

  test("server join rejects invalid player field type", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const createResponse = await fetch(`${baseUrl}/api/servers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Invalid Join Player",
        maxPlayers: 2,
      }),
    });
    const createPayload = await createResponse.json();
    const serverId = createPayload.data.server.id as string;

    const response = await fetch(`${baseUrl}/api/servers/${encodeURIComponent(serverId)}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: 123 }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("INVALID_FIELD");
  });

  test("servers endpoint reports disabled mode without Supabase env", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const response = await fetch(`${baseUrl}/api/servers`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.mode).toBe("disabled");
  });

  test("server create rejects invalid maxPlayers value", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const response = await fetch(`${baseUrl}/api/servers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Invalid Capacity",
        maxPlayers: 64,
      }),
    });
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("INVALID_MAX_PLAYERS");
  });

  test("servers list reflects current player counts for active server session", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const createServerResponse = await fetch(`${baseUrl}/api/servers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Counted Lobby",
        maxPlayers: 4,
      }),
    });
    const createServerPayload = await createServerResponse.json();
    const serverId = createServerPayload.data.server.id as string;

    const firstJoin = await fetch(`${baseUrl}/api/servers/${encodeURIComponent(serverId)}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "CountA" }),
    });
    expect(firstJoin.status).toBe(200);

    const secondJoin = await fetch(`${baseUrl}/api/servers/${encodeURIComponent(serverId)}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: "CountB" }),
    });
    expect(secondJoin.status).toBe(200);

    const listResponse = await fetch(`${baseUrl}/api/servers`);
    const listPayload = await listResponse.json();
    expect(listResponse.status).toBe(200);
    expect(listPayload.ok).toBe(true);

    const serverRow = (listPayload.data.servers as Array<{ id: string; currentPlayers: number }>).find(
      entry => entry.id === serverId,
    );
    expect(serverRow).toBeDefined();
    expect(serverRow?.currentPlayers).toBe(2);
  });
});

describe("RPC API integration (supabase auth gate)", () => {
  let server: RunningServer | null = null;

  beforeAll(async () => {
    server = startServer(3102, {
      SUPABASE_URL: "https://example.supabase.co",
      SUPABASE_ANON_KEY: "example-anon",
      SUPABASE_SERVICE_ROLE_KEY: "example-service",
    });
    await waitForServer(server.baseUrl);
  });

  afterAll(async () => {
    await stopServer(server);
  });

  test("create server requires bearer token in enabled mode", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const response = await fetch(`${baseUrl}/api/servers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Auth Required Server" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("UNAUTHORIZED");
  });

  test("invalid bearer token returns forbidden", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const response = await fetch(`${baseUrl}/api/servers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid-token",
      },
      body: JSON.stringify({ name: "Forbidden Server" }),
    });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("FORBIDDEN");
  });

  test("servers endpoint reports enabled mode with Supabase env", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const response = await fetch(`${baseUrl}/api/servers`);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("SUPABASE_QUERY_FAILED");
  });

  test("server create rejects invalid bearer token before body parsing", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const response = await fetch(`${baseUrl}/api/servers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer invalid-token",
      },
      body: "{invalid-json",
    });
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("FORBIDDEN");
  });
});
