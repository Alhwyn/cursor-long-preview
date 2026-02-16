import { afterEach, describe, expect, test } from "bun:test";
import { GameRuleError } from "./engine";
import {
  clearLocalServersForTests,
  configureServerPlayerCountResolver,
  createServer,
  getActiveSessionId,
  getServer,
  listServers,
  setActiveSessionId,
} from "./servers";

afterEach(() => {
  clearLocalServersForTests();
});

describe("local lobby server store", () => {
  test("create/list/get server in fallback mode", async () => {
    const created = await createServer({
      name: "Test Lobby",
      description: "Integration-free local lobby",
      maxPlayers: 3,
    });

    expect(created.id.startsWith("srv-")).toBe(true);
    expect(created.maxPlayers).toBe(3);

    const listed = await listServers();
    expect(listed.length).toBe(1);
    expect(listed[0]?.id).toBe(created.id);

    const fetched = await getServer(created.id);
    expect(fetched?.name).toBe("Test Lobby");
    expect(fetched?.description).toBe("Integration-free local lobby");
  });

  test("create server enforces name and max player validation", async () => {
    await expect(
      createServer({
        name: "   ",
      }),
    ).rejects.toThrow(GameRuleError);

    await expect(
      createServer({
        name: "Invalid Max",
        maxPlayers: 33,
      }),
    ).rejects.toThrow(GameRuleError);
  });

  test("create server trims name and description and applies defaults", async () => {
    const created = await createServer({
      name: "  Trimmed Lobby  ",
      description: "  Relaxed run  ",
    });

    expect(created.name).toBe("Trimmed Lobby");
    expect(created.description).toBe("Relaxed run");
    expect(created.maxPlayers).toBe(4);
  });

  test("blank description normalizes to undefined", async () => {
    const created = await createServer({
      name: "No Description Lobby",
      description: "   ",
      maxPlayers: 2,
    });

    expect(created.description).toBeUndefined();
  });

  test("listServers returns servers ordered by creation time", async () => {
    const first = await createServer({
      name: "First Lobby",
      maxPlayers: 2,
    });
    await Bun.sleep(2);
    const second = await createServer({
      name: "Second Lobby",
      maxPlayers: 2,
    });

    const listed = await listServers();
    expect(listed).toHaveLength(2);
    expect(listed[0]?.id).toBe(first.id);
    expect(listed[1]?.id).toBe(second.id);
  });

  test("active session tracking integrates resolver player count", async () => {
    const created = await createServer({
      name: "Session Lobby",
      maxPlayers: 4,
    });

    configureServerPlayerCountResolver(sessionId => {
      if (sessionId === "session-1") {
        return 2;
      }
      return 0;
    });
    setActiveSessionId(created.id, "session-1");

    expect(getActiveSessionId(created.id)).toBe("session-1");

    const listed = await listServers();
    expect(listed[0]?.currentPlayers).toBe(2);
  });

  test("unknown server lookups return empty values", async () => {
    const fetched = await getServer("missing-server");
    expect(fetched).toBeNull();
    expect(getActiveSessionId("missing-server")).toBeUndefined();
  });

  test("setActiveSessionId updates local server metadata timestamp", async () => {
    const created = await createServer({
      name: "Timestamp Lobby",
      maxPlayers: 4,
    });

    const before = await getServer(created.id);
    expect(before).not.toBeNull();

    await Bun.sleep(2);
    setActiveSessionId(created.id, "session-ts-1");
    const after = await getServer(created.id);

    expect(after).not.toBeNull();
    expect(after?.updatedAt).toBeGreaterThanOrEqual(before!.updatedAt);
  });

  test("currentPlayers defaults to zero when resolver is missing", async () => {
    const created = await createServer({
      name: "Resolverless Lobby",
      maxPlayers: 2,
    });

    setActiveSessionId(created.id, "session-resolverless");
    const listed = await listServers();
    const server = listed.find(entry => entry.id === created.id);

    expect(server).toBeDefined();
    expect(server?.currentPlayers).toBe(0);
  });

  test("getServer reflects resolver player count for active session", async () => {
    const created = await createServer({
      name: "Resolved Lobby",
      maxPlayers: 5,
    });

    configureServerPlayerCountResolver(sessionId => (sessionId === "session-resolved" ? 4 : 0));
    setActiveSessionId(created.id, "session-resolved");

    const fetched = await getServer(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched?.currentPlayers).toBe(4);
  });
});
