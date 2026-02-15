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
});
