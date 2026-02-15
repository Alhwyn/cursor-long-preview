import { afterEach, describe, expect, test } from "bun:test";
import { clearSessions, createSession, getSession, joinSession, observeSession, performAction, stepSession } from "./sessions";

afterEach(() => {
  clearSessions();
});

describe("session manager", () => {
  test("createSession returns persisted session and player", () => {
    const { session, player } = createSession({ playerName: "Runner" });
    const stored = getSession(session.sessionId);

    expect(session.state.players[player.id]?.name).toBe("Runner");
    expect(stored?.state.sessionId).toBe(session.sessionId);
  });

  test("joinSession adds another player", () => {
    const created = createSession({ playerName: "Runner-1" });
    const joined = joinSession({ sessionId: created.session.sessionId, playerName: "Runner-2" });
    const players = Object.values(joined.session.state.players);

    expect(players.length).toBe(2);
    expect(players.some(player => player.name === "Runner-2")).toBe(true);
  });

  test("performAction updates authoritative session state", () => {
    const created = createSession({ playerName: "Runner-1" });
    const moved = performAction(created.session.sessionId, created.player.id, { type: "move", direction: "right" });

    expect(moved.state.tick).toBe(1);
    expect(moved.state.players[created.player.id]?.position).toEqual({ x: 3, y: 2 });
  });

  test("stepSession manually advances zombies", () => {
    const created = createSession({ playerName: "Runner-1" });
    const stepped = stepSession(created.session.sessionId);

    expect(stepped.state.tick).toBe(1);
  });

  test("observeSession returns expected player-centric payload", () => {
    const created = createSession({ playerName: "Scout" });
    const observation = observeSession(created.session.sessionId, created.player.id);

    expect(observation.playerId).toBe(created.player.id);
    expect(observation.self.id).toBe(created.player.id);
    expect(Array.isArray(observation.entities)).toBe(true);
  });
});
