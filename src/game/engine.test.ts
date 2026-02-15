import { describe, expect, test } from "bun:test";
import { addPlayerToState, applyAction, createInitialGameState, GameRuleError, tickGame, toObservation } from "./engine";
import type { GameState } from "./types";

function makeState(): GameState {
  const { state } = createInitialGameState({
    sessionId: "session-test",
    playerId: "p-1",
    playerName: "Tester",
    zombieCount: 1,
  });
  return state;
}

describe("engine", () => {
  test("move action advances tick and updates position", () => {
    const state = makeState();
    const next = applyAction(state, "p-1", { type: "move", direction: "right" });
    expect(next.tick).toBe(1);
    expect(next.players["p-1"]?.position).toEqual({ x: 3, y: 2 });
  });

  test("move into wall throws conflict error", () => {
    const state = makeState();
    state.players["p-1"]!.position = { x: 1, y: 1 };

    expect(() => applyAction(state, "p-1", { type: "move", direction: "left" })).toThrowError(GameRuleError);
    expect(() => applyAction(state, "p-1", { type: "move", direction: "up" })).toThrowError(GameRuleError);
  });

  test("attack applies damage and enforces cooldown", () => {
    const state = makeState();
    state.zombies["z-1"]!.position = { x: 3, y: 2 };

    const afterAttack = applyAction(state, "p-1", { type: "attack" });
    expect(afterAttack.zombies["z-1"]?.hp).toBe(42);
    expect(afterAttack.tick).toBe(1);

    expect(() => applyAction(afterAttack, "p-1", { type: "attack" })).toThrow("cooldown");
  });

  test("attack out of range is rejected", () => {
    const state = makeState();
    state.zombies["z-1"]!.position = { x: 12, y: 12 };

    expect(() => applyAction(state, "p-1", { type: "attack", targetId: "z-1" })).toThrow("out of attack range");
  });

  test("zombie moves toward nearest player on tick", () => {
    const state = makeState();
    state.zombies["z-1"]!.position = { x: 4, y: 2 };
    const ticked = tickGame(state);
    expect(ticked.zombies["z-1"]?.position).toEqual({ x: 3, y: 2 });
  });

  test("game status flips to won when final zombie dies", () => {
    const state = makeState();
    state.zombies["z-1"]!.position = { x: 3, y: 2 };
    state.zombies["z-1"]!.hp = 10;
    const next = applyAction(state, "p-1", { type: "attack" });
    expect(next.zombies["z-1"]?.alive).toBe(false);
    expect(next.status).toBe("won");
  });

  test("completed game cannot accept additional actions", () => {
    const state = makeState();
    state.status = "won";

    expect(() => applyAction(state, "p-1", { type: "wait" })).toThrow("already completed");
  });

  test("game status flips to lost when all players die", () => {
    const state = makeState();
    state.players["p-1"]!.hp = 8;
    state.zombies["z-1"]!.position = { x: 3, y: 2 };
    const next = tickGame(state);
    expect(next.players["p-1"]?.alive).toBe(false);
    expect(next.status).toBe("lost");
  });

  test("observation picks nearest living zombie", () => {
    const state = makeState();
    state.zombies["z-1"]!.position = { x: 10, y: 10 };
    state.zombies["z-2"] = {
      ...state.zombies["z-1"]!,
      id: "z-2",
      position: { x: 3, y: 2 },
    };

    const observation = toObservation(state, "p-1");
    expect(observation.nearestZombie?.id).toBe("z-2");
    expect(observation.nearestZombie?.distance).toBe(1);
  });

  test("same input state and action produces deterministic output", () => {
    const state = makeState();
    state.zombies["z-1"]!.position = { x: 4, y: 2 };

    const left = applyAction(state, "p-1", { type: "move", direction: "right" });
    const right = applyAction(state, "p-1", { type: "move", direction: "right" });
    expect(left).toEqual(right);
  });

  test("initial state derives deterministic player id from session", () => {
    const created = createInitialGameState({
      sessionId: "alpha",
      zombieCount: 1,
    });
    expect(created.player.id).toBe("p-alpha-1");
  });

  test("joining without explicit id uses deterministic sequence", () => {
    const state = makeState();
    const joined = addPlayerToState({ state, playerName: "Tester-2" });
    expect(joined.player.id).toBe("p-2");
  });

  test("invalid zombie count is rejected during bootstrap", () => {
    expect(() =>
      createInitialGameState({
        sessionId: "alpha-invalid",
        zombieCount: 1.5,
      }),
    ).toThrow("zombieCount must be an integer");
  });
});
