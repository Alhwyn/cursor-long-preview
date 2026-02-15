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

  test("servers endpoint reports disabled mode without Supabase env", async () => {
    expect(server).not.toBeNull();
    const baseUrl = server!.baseUrl;

    const response = await fetch(`${baseUrl}/api/servers`);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.ok).toBe(true);
    expect(payload.data.mode).toBe("disabled");
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
});
