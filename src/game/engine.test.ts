import { describe, expect, test } from "bun:test";
import { addPlayerToState, applyAction, createInitialGameState, createInitialMap, GameRuleError, tickGame, toObservation } from "./engine";
import type { GameState } from "./types";

function makeState(): GameState {
  const { state } = createInitialGameState({
    sessionId: "session-test",
    playerId: "p-1",
    playerName: "Tester",
    zombieCount: 1,
    mode: "classic",
  });
  return state;
}

function makeStateWithAgent(): GameState {
  const { state } = createInitialGameState({
    sessionId: "session-agent",
    playerId: "p-1",
    playerName: "Tester",
    zombieCount: 1,
    agentEnabled: true,
  });
  return state;
}

describe("engine", () => {
  test("move action advances tick and updates position", () => {
    const state = makeState();
    const next = applyAction(state, "p-1", { type: "move", direction: "right" });
    expect(next.tick).toBe(1);
    expect(next.players["p-1"]?.position).toEqual({ x: 3, y: 2 });
    expect(state.players["p-1"]?.position).toEqual({ x: 2, y: 2 });
    expect(next.updatedAt).toBe(state.updatedAt + 1);
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

  test("build barricade spends scrap and converts tile to wall", () => {
    const state = makeState();
    state.scrap = 30;

    const next = applyAction(state, "p-1", {
      type: "build",
      buildType: "barricade",
      direction: "right",
    });

    expect(next.scrap).toBe(6);
    expect(next.map.tiles.find(tile => tile.x === 3 && tile.y === 2)?.type).toBe("wall");
  });

  test("build ally robot consumes scrap and deploys guardian bot", () => {
    const state = makeState();
    state.scrap = 90;
    state.zombies["z-1"]!.position = { x: 4, y: 2 };

    const next = applyAction(state, "p-1", {
      type: "build",
      buildType: "ally_robot",
      direction: "right",
    });

    expect(next.scrap).toBe(10);
    const builtRobot = Object.values(next.builtRobots)[0];
    expect(builtRobot).toBeDefined();
    expect(builtRobot?.name).toBe("Guardian Bot");
    expect(next.zombies["z-1"]?.hp).toBeLessThan(70);
  });

  test("build action requires enough scrap", () => {
    const state = makeState();
    state.scrap = 0;
    expect(() =>
      applyAction(state, "p-1", {
        type: "build",
        buildType: "ally_robot",
        direction: "right",
      }),
    ).toThrow("Need 80 scrap");
  });

  test("explosive terminator moves toward nearest player on tick", () => {
    const state = makeState();
    state.zombies["z-1"]!.zombieType = "explosive";
    state.zombies["z-1"]!.attackRange = 1;
    state.zombies["z-1"]!.position = { x: 4, y: 2 };
    const ticked = tickGame(state);
    expect(ticked.zombies["z-1"]?.position).toEqual({ x: 3, y: 2 });
    expect(ticked.updatedAt).toBe(state.updatedAt + 1);
  });

  test("adjacent zombie attacks player and respects cooldown across ticks", () => {
    const state = makeState();
    state.zombies["z-1"]!.position = { x: 3, y: 2 };

    const tick1 = tickGame(state);
    expect(tick1.players["p-1"]?.hp).toBe(108);

    const tick2 = tickGame(tick1);
    expect(tick2.players["p-1"]?.hp).toBe(108);

    const tick3 = tickGame(tick2);
    expect(tick3.players["p-1"]?.hp).toBe(96);
  });

  test("normal terminator shoots from range without moving into melee", () => {
    const state = makeState();
    state.zombies["z-1"]!.zombieType = "normal";
    state.zombies["z-1"]!.position = { x: 5, y: 2 };

    const ticked = tickGame(state);
    expect(ticked.players["p-1"]?.hp).toBe(108);
    expect(ticked.zombies["z-1"]?.position).toEqual({ x: 5, y: 2 });
  });

  test("game status flips to won when final zombie dies", () => {
    const state = makeState();
    state.zombies["z-1"]!.position = { x: 3, y: 2 };
    state.zombies["z-1"]!.hp = 10;
    const next = applyAction(state, "p-1", { type: "attack" });
    expect(next.zombies["z-1"]?.alive).toBe(false);
    expect(next.scrap).toBeGreaterThan(0);
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

  test("observation tie-breaks nearest zombie by id and keeps entities sorted", () => {
    const state = makeState();
    state.zombies["z-1"]!.position = { x: 3, y: 2 };
    state.zombies["a-zombie"] = {
      ...state.zombies["z-1"]!,
      id: "a-zombie",
      position: { x: 2, y: 3 },
    };

    const observation = toObservation(state, "p-1");
    expect(observation.nearestZombie?.distance).toBe(1);
    expect(observation.nearestZombie?.id).toBe("a-zombie");

    const entityIds = observation.entities.map(entity => entity.id);
    const sortedEntityIds = [...entityIds].sort((left, right) => left.localeCompare(right));
    expect(entityIds).toEqual(sortedEntityIds);
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

  test("createInitialMap is deterministic and walls surround boundaries", () => {
    const left = createInitialMap();
    const right = createInitialMap();

    expect(left).toEqual(right);
    expect(left.width).toBe(36);
    expect(left.height).toBe(36);
    expect(left.tiles.find(tile => tile.x === 0 && tile.y === 0)?.type).toBe("wall");
    expect(left.tiles.find(tile => tile.x === left.width - 1 && tile.y === left.height - 1)?.type).toBe("wall");
    expect(left.tiles.find(tile => tile.x === 1 && tile.y === 1)?.type).toBe("grass");
    expect(left.tiles.find(tile => tile.x === 18 && tile.y === 12)?.type).toBe("grass");
    expect(left.tiles.find(tile => tile.x === 7 && tile.y === 6)?.type).toBe("wall");
  });

  test("tick is rejected after game completion", () => {
    const state = makeState();
    state.status = "lost";
    expect(() => tickGame(state)).toThrow("already completed");
  });

  test("agent-enabled state includes CAI companion and observation data", () => {
    const state = makeStateWithAgent();
    expect(state.companion).toBeDefined();
    expect(state.companion?.name).toBe("CAI");

    const observation = toObservation(state, "p-1");
    expect(observation.companion).toBeDefined();
    expect(observation.companion?.kind).toBe("agent");
    expect(observation.entities.some(entity => entity.kind === "agent")).toBe(true);
  });

  test("companion attacks nearby zombie during tick", () => {
    const state = makeStateWithAgent();
    state.zombies["z-1"]!.position = { x: 4, y: 2 };
    state.companion!.position = { x: 3, y: 2 };
    state.companion!.lastAttackTick = -99;

    const ticked = tickGame(state);
    expect(ticked.zombies["z-1"]?.hp).toBe(48);
    expect(ticked.companion).toBeDefined();
    const companionEmote = ticked.companion!.emote;
    expect(["attack", "hurt"]).toContain(companionEmote);
  });

  test("flying terminator can move two tiles in one tick", () => {
    const state = makeState();
    state.zombies["z-1"]!.zombieType = "flying";
    state.zombies["z-1"]!.position = { x: 6, y: 2 };

    const ticked = tickGame(state);
    expect(ticked.zombies["z-1"]?.position).toEqual({ x: 4, y: 2 });
  });

  test("explosive zombie death damages nearby zombies and defenders", () => {
    const { state } = createInitialGameState({
      sessionId: "explosive-test",
      playerId: "p-1",
      playerName: "Exploder",
      zombieCount: 2,
      mode: "classic",
    });
    state.zombies["z-1"]!.zombieType = "explosive";
    state.zombies["z-1"]!.hp = 10;
    state.zombies["z-1"]!.position = { x: 3, y: 2 };
    state.zombies["z-2"]!.position = { x: 4, y: 2 };

    const afterAttack = applyAction(state, "p-1", { type: "attack", targetId: "z-1" });
    expect(afterAttack.zombies["z-1"]?.alive).toBe(false);
    expect(afterAttack.zombies["z-2"]?.alive).toBe(false);
    expect(afterAttack.players["p-1"]?.hp).toBeLessThan(afterAttack.players["p-1"]!.maxHp);
  });

  test("mech terminators move only on even ticks", () => {
    const state = makeState();
    state.zombies["z-1"]!.zombieType = "mech";
    state.zombies["z-1"]!.position = { x: 6, y: 2 };

    const firstTick = tickGame(state);
    expect(firstTick.zombies["z-1"]?.position).toEqual({ x: 6, y: 2 });

    const secondTick = tickGame(firstTick);
    expect(secondTick.zombies["z-1"]?.position).toEqual({ x: 5, y: 2 });
  });

  test("endless mode respawns new wave instead of winning", () => {
    const { state } = createInitialGameState({
      sessionId: "endless-test",
      playerId: "p-1",
      playerName: "Runner",
      zombieCount: 1,
      mode: "endless",
    });
    state.zombies["z-1"]!.position = { x: 3, y: 2 };
    state.zombies["z-1"]!.hp = 10;

    const next = applyAction(state, "p-1", { type: "attack", targetId: "z-1" });
    expect(next.status).toBe("active");
    expect(next.wave).toBeGreaterThan(1);
    expect(Object.values(next.zombies).some(zombie => zombie.alive)).toBe(true);
  });
});
