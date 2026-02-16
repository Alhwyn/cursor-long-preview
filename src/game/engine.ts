import type {
  Action,
  CompanionAgent,
  Direction,
  GameMode,
  GameMap,
  GameState,
  GameStatus,
  MapTile,
  Observation,
  ObservationEntity,
  Player,
  Vec2,
  Zombie,
  ZombieType,
} from "./types";

export class GameRuleError extends Error {
  public readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "GameRuleError";
    this.code = code;
  }
}

interface CreateStateInput {
  sessionId: string;
  serverId?: string;
  playerId?: string;
  playerName?: string;
  zombieCount?: number;
  agentEnabled?: boolean;
  mode?: GameMode;
}

interface AddPlayerInput {
  state: GameState;
  playerId?: string;
  playerName?: string;
}

const MAP_WIDTH = 20;
const MAP_HEIGHT = 20;
const PLAYER_START: Vec2 = { x: 2, y: 2 };
const PLAYER_MAX_HP = 120;
const PLAYER_DAMAGE = 28;
const PLAYER_ATTACK_RANGE = 1;
const PLAYER_ATTACK_COOLDOWN = 2;
const NORMAL_ZOMBIE_HP = 70;
const NORMAL_ZOMBIE_DAMAGE = 12;
const NORMAL_ZOMBIE_COOLDOWN = 2;
const FAST_ZOMBIE_HP = 52;
const FAST_ZOMBIE_DAMAGE = 10;
const FAST_ZOMBIE_COOLDOWN = 1;
const EXPLOSIVE_ZOMBIE_HP = 46;
const EXPLOSIVE_ZOMBIE_DAMAGE = 14;
const EXPLOSIVE_ZOMBIE_COOLDOWN = 2;
const GIANT_ZOMBIE_HP = 210;
const GIANT_ZOMBIE_DAMAGE = 30;
const GIANT_ZOMBIE_COOLDOWN = 3;
const ZOMBIE_ATTACK_RANGE = 1;
const EXPLOSION_DAMAGE = 140;
const EXPLOSION_SPLASH_RADIUS = 1;
const AGENT_ID = "cai-agent";
const AGENT_NAME = "CAI";
const AGENT_MAX_HP = 180;
const AGENT_DAMAGE = 22;
const AGENT_ATTACK_RANGE = 1;
const AGENT_ATTACK_COOLDOWN = 1;
const AGENT_START: Vec2 = { x: 3, y: 2 };
const DEFAULT_ZOMBIE_POSITIONS: Vec2[] = [
  { x: 16, y: 16 },
  { x: 16, y: 3 },
  { x: 3, y: 16 },
  { x: 12, y: 12 },
];

function nextStateTimestamp(previous: number): number {
  return previous + 1;
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    map: {
      ...state.map,
      tiles: state.map.tiles.map(tile => ({ ...tile })),
    },
    players: Object.fromEntries(Object.entries(state.players).map(([id, player]) => [id, { ...player, position: { ...player.position } }])),
    zombies: Object.fromEntries(Object.entries(state.zombies).map(([id, zombie]) => [id, { ...zombie, position: { ...zombie.position } }])),
    companion: state.companion
      ? {
          ...state.companion,
          position: { ...state.companion.position },
        }
      : undefined,
  };
}

function toTileKey(position: Vec2): string {
  return `${position.x},${position.y}`;
}

function manhattanDistance(a: Vec2, b: Vec2): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function createInitialMap(width = MAP_WIDTH, height = MAP_HEIGHT): GameMap {
  const tiles: MapTile[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const boundary = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      const deterministicObstacle = !boundary && x % 6 === 0 && y % 5 === 0;
      tiles.push({
        x,
        y,
        type: boundary || deterministicObstacle ? "wall" : "grass",
      });
    }
  }

  return { width, height, tiles };
}

function tileAt(map: GameMap, position: Vec2): MapTile | undefined {
  return map.tiles.find(tile => tile.x === position.x && tile.y === position.y);
}

function directionOffset(direction: Direction): Vec2 {
  switch (direction) {
    case "up":
      return { x: 0, y: -1 };
    case "down":
      return { x: 0, y: 1 };
    case "left":
      return { x: -1, y: 0 };
    case "right":
      return { x: 1, y: 0 };
    default:
      return assertNever(direction);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}

function isPassable(map: GameMap, position: Vec2): boolean {
  const tile = tileAt(map, position);
  return tile?.type === "grass";
}

function findAlivePlayers(state: GameState): Player[] {
  return Object.values(state.players).filter(player => player.alive);
}

function findAliveZombies(state: GameState): Zombie[] {
  return Object.values(state.zombies).filter(zombie => zombie.alive);
}

function findAliveDefenders(state: GameState): Array<Player | CompanionAgent> {
  const defenders: Array<Player | CompanionAgent> = [...findAlivePlayers(state)];
  if (state.companion?.alive) {
    defenders.push(state.companion);
  }
  return defenders;
}

function isOccupiedByLivingEntity(state: GameState, position: Vec2, excludedEntityId?: string): boolean {
  const key = toTileKey(position);
  const playerBlocked = Object.values(state.players).some(
    player => player.alive && player.id !== excludedEntityId && toTileKey(player.position) === key,
  );
  if (playerBlocked) {
    return true;
  }

  const zombieBlocked = Object.values(state.zombies).some(
    zombie => zombie.alive && zombie.id !== excludedEntityId && toTileKey(zombie.position) === key,
  );
  if (zombieBlocked) {
    return true;
  }

  return Boolean(
    state.companion &&
      state.companion.alive &&
      state.companion.id !== excludedEntityId &&
      toTileKey(state.companion.position) === key,
  );
}

function ensureSessionIsActive(state: GameState): void {
  if (state.status !== "active") {
    throw new GameRuleError("GAME_COMPLETED", "Game session is already completed.");
  }
}

function ensurePlayerCanAct(state: GameState, playerId: string): Player {
  const player = state.players[playerId];
  if (!player) {
    throw new GameRuleError("PLAYER_NOT_FOUND", "Player does not exist in this session.");
  }
  if (!player.alive) {
    throw new GameRuleError("PLAYER_DEAD", "Player is dead and cannot act.");
  }
  return player;
}

function validateAttackCooldown(lastAttackTick: number, cooldownTicks: number, currentTick: number, attackerKind: string): void {
  if (currentTick - lastAttackTick < cooldownTicks) {
    throw new GameRuleError("ATTACK_COOLDOWN", `${attackerKind} attack is still on cooldown.`);
  }
}

function pickZombieTarget(state: GameState, actor: Player, targetId?: string): Zombie {
  const aliveZombies = findAliveZombies(state);
  if (aliveZombies.length === 0) {
    throw new GameRuleError("NO_ZOMBIES", "There are no living zombies to attack.");
  }

  if (targetId) {
    const explicitTarget = state.zombies[targetId];
    if (!explicitTarget || !explicitTarget.alive) {
      throw new GameRuleError("TARGET_NOT_FOUND", "Target zombie does not exist or is already dead.");
    }
    return explicitTarget;
  }

  const nearestZombie = aliveZombies
    .map(zombie => ({ zombie, distance: manhattanDistance(actor.position, zombie.position) }))
    .sort((a, b) => a.distance - b.distance || a.zombie.id.localeCompare(b.zombie.id))[0];

  if (!nearestZombie) {
    throw new GameRuleError("TARGET_NOT_FOUND", "No valid zombie target was found.");
  }
  return nearestZombie.zombie;
}

function nextZombieNumericId(state: GameState): number {
  let maxId = 0;
  for (const zombieId of Object.keys(state.zombies)) {
    const parsed = Number.parseInt(zombieId.replace(/^z-/, ""), 10);
    if (Number.isInteger(parsed) && parsed > maxId) {
      maxId = parsed;
    }
  }
  return maxId + 1;
}

function zombieTypeForWaveSlot(wave: number, slot: number): ZombieType {
  if (wave >= 4 && slot % 8 === 0) {
    return "giant";
  }
  if (wave >= 3 && slot % 5 === 0) {
    return "explosive";
  }
  if (wave >= 2 && slot % 3 === 0) {
    return "fast";
  }
  return "normal";
}

function enumerateSpawnCandidates(state: GameState): Vec2[] {
  const defaultCandidates = DEFAULT_ZOMBIE_POSITIONS.map(position => ({ ...position }));
  const edgeTiles = state.map.tiles
    .filter(tile => tile.type === "grass")
    .map(tile => ({ x: tile.x, y: tile.y }))
    .sort((left, right) => {
      const edgeLeft = Math.min(left.x, left.y, state.map.width - 1 - left.x, state.map.height - 1 - left.y);
      const edgeRight = Math.min(right.x, right.y, state.map.width - 1 - right.x, state.map.height - 1 - right.y);
      if (edgeLeft !== edgeRight) {
        return edgeLeft - edgeRight;
      }
      const depthLeft = left.x + left.y;
      const depthRight = right.x + right.y;
      if (depthLeft !== depthRight) {
        return depthRight - depthLeft;
      }
      if (left.x !== right.x) {
        return right.x - left.x;
      }
      return right.y - left.y;
    });

  return [...defaultCandidates, ...edgeTiles];
}

function spawnWave(state: GameState, wave: number, count: number): void {
  const occupied = new Set<string>([
    ...Object.values(state.players)
      .filter(player => player.alive)
      .map(player => toTileKey(player.position)),
    ...Object.values(state.zombies)
      .filter(zombie => zombie.alive)
      .map(zombie => toTileKey(zombie.position)),
    ...(state.companion?.alive ? [toTileKey(state.companion.position)] : []),
  ]);

  const candidates = enumerateSpawnCandidates(state);
  let nextId = nextZombieNumericId(state);
  let spawned = 0;

  for (const candidate of candidates) {
    if (spawned >= count) {
      break;
    }
    const tileKey = toTileKey(candidate);
    if (occupied.has(tileKey)) {
      continue;
    }
    if (!isPassable(state.map, candidate)) {
      continue;
    }

    const zombieType = zombieTypeForWaveSlot(wave, spawned + 1);
    const zombieId = `z-${nextId}`;
    state.zombies[zombieId] = createZombie(zombieId, candidate, zombieType);
    occupied.add(tileKey);
    nextId += 1;
    spawned += 1;
  }
}

function maybeSpawnEndlessWave(state: GameState): void {
  if (state.mode !== "endless") {
    return;
  }

  const hasAliveZombies = findAliveZombies(state).length > 0;
  if (hasAliveZombies) {
    return;
  }

  state.wave += 1;
  const spawnCount = Math.min(32, Math.max(3, 2 + state.wave * 2));
  spawnWave(state, state.wave, spawnCount);
}

function updateGameStatus(state: GameState): void {
  const aliveDefenders = findAliveDefenders(state);
  const aliveZombies = findAliveZombies(state);

  if (aliveDefenders.length === 0) {
    state.status = "lost";
    return;
  }

  if (aliveZombies.length === 0) {
    if (state.mode === "endless") {
      maybeSpawnEndlessWave(state);
      state.status = "active";
      return;
    }
    state.status = "won";
    return;
  }

  state.status = "active";
}

function deterministicInitialPlayerId(sessionId: string): string {
  return `p-${sessionId}-1`;
}

function deterministicJoinPlayerId(state: GameState): string {
  let index = Object.keys(state.players).length + 1;
  while (state.players[`p-${index}`]) {
    index += 1;
  }
  return `p-${index}`;
}

function zombieBaseStats(zombieType: ZombieType): { hp: number; damage: number; cooldown: number } {
  switch (zombieType) {
    case "normal":
      return { hp: NORMAL_ZOMBIE_HP, damage: NORMAL_ZOMBIE_DAMAGE, cooldown: NORMAL_ZOMBIE_COOLDOWN };
    case "fast":
      return { hp: FAST_ZOMBIE_HP, damage: FAST_ZOMBIE_DAMAGE, cooldown: FAST_ZOMBIE_COOLDOWN };
    case "explosive":
      return { hp: EXPLOSIVE_ZOMBIE_HP, damage: EXPLOSIVE_ZOMBIE_DAMAGE, cooldown: EXPLOSIVE_ZOMBIE_COOLDOWN };
    case "giant":
      return { hp: GIANT_ZOMBIE_HP, damage: GIANT_ZOMBIE_DAMAGE, cooldown: GIANT_ZOMBIE_COOLDOWN };
    default:
      return assertNever(zombieType);
  }
}

function createZombie(zombieId: string, position: Vec2, zombieType: ZombieType): Zombie {
  const stats = zombieBaseStats(zombieType);
  return {
    id: zombieId,
    zombieType,
    position,
    hp: stats.hp,
    maxHp: stats.hp,
    alive: true,
    attackDamage: stats.damage,
    attackRange: ZOMBIE_ATTACK_RANGE,
    attackCooldownTicks: stats.cooldown,
    lastAttackTick: -stats.cooldown,
  };
}

function createPlayer(playerId: string, playerName: string, position: Vec2): Player {
  return {
    id: playerId,
    name: playerName,
    position,
    hp: PLAYER_MAX_HP,
    maxHp: PLAYER_MAX_HP,
    alive: true,
    attackDamage: PLAYER_DAMAGE,
    attackRange: PLAYER_ATTACK_RANGE,
    attackCooldownTicks: PLAYER_ATTACK_COOLDOWN,
    lastAttackTick: -PLAYER_ATTACK_COOLDOWN,
  };
}

function createCompanion(position: Vec2): CompanionAgent {
  return {
    id: AGENT_ID,
    name: AGENT_NAME,
    position,
    hp: AGENT_MAX_HP,
    maxHp: AGENT_MAX_HP,
    alive: true,
    attackDamage: AGENT_DAMAGE,
    attackRange: AGENT_ATTACK_RANGE,
    attackCooldownTicks: AGENT_ATTACK_COOLDOWN,
    lastAttackTick: -AGENT_ATTACK_COOLDOWN,
    emote: "idle",
  };
}

function candidateZombieMoveDirections(zombie: Zombie, target: Player | CompanionAgent): Direction[] {
  const dx = target.position.x - zombie.position.x;
  const dy = target.position.y - zombie.position.y;

  const horizontalPrimary: Direction = dx < 0 ? "left" : "right";
  const verticalPrimary: Direction = dy < 0 ? "up" : "down";

  if (Math.abs(dx) >= Math.abs(dy)) {
    return [horizontalPrimary, verticalPrimary];
  }

  return [verticalPrimary, horizontalPrimary];
}

function tryMoveZombie(state: GameState, zombie: Zombie, target: Player | CompanionAgent): boolean {
  for (const direction of candidateZombieMoveDirections(zombie, target)) {
    const offset = directionOffset(direction);
    const candidatePosition: Vec2 = {
      x: zombie.position.x + offset.x,
      y: zombie.position.y + offset.y,
    };

    if (!isPassable(state.map, candidatePosition)) {
      continue;
    }
    if (isOccupiedByLivingEntity(state, candidatePosition, zombie.id)) {
      continue;
    }

    zombie.position = candidatePosition;
    return true;
  }
  return false;
}

function zombieAttackDefender(zombie: Zombie, defender: Player | CompanionAgent, tick: number): void {
  if (!defender.alive) {
    return;
  }
  validateAttackCooldown(zombie.lastAttackTick, zombie.attackCooldownTicks, tick, "Zombie");
  defender.hp = Math.max(0, defender.hp - zombie.attackDamage);
  defender.alive = defender.hp > 0;
  if ("emote" in defender) {
    defender.emote = defender.alive ? "hurt" : "idle";
  }
  zombie.lastAttackTick = tick;
}

function resolveZombieTurn(state: GameState): void {
  if (state.status !== "active") {
    return;
  }

  const zombies = Object.values(state.zombies)
    .filter(zombie => zombie.alive)
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const zombie of zombies) {
    const defenders = findAliveDefenders(state);
    if (defenders.length === 0) {
      break;
    }

    const nearestPlayer = defenders
      .map(player => ({ player, distance: manhattanDistance(player.position, zombie.position) }))
      .sort((a, b) => a.distance - b.distance || a.player.id.localeCompare(b.player.id))[0];

    if (!nearestPlayer) {
      continue;
    }

    if (nearestPlayer.distance <= zombie.attackRange) {
      try {
        zombieAttackDefender(zombie, nearestPlayer.player, state.tick);
      } catch (error) {
        if (!(error instanceof GameRuleError) || error.code !== "ATTACK_COOLDOWN") {
          throw error;
        }
      }
      continue;
    }

    const movementSteps = zombie.zombieType === "fast" ? 2 : zombie.zombieType === "giant" ? (state.tick % 2 === 0 ? 1 : 0) : 1;
    for (let step = 0; step < movementSteps; step += 1) {
      const moved = tryMoveZombie(state, zombie, nearestPlayer.player);
      if (!moved) {
        break;
      }
    }
  }
}

function candidateCompanionMoveDirections(companion: CompanionAgent, target: Zombie): Direction[] {
  const dx = target.position.x - companion.position.x;
  const dy = target.position.y - companion.position.y;

  const horizontalPrimary: Direction = dx < 0 ? "left" : "right";
  const verticalPrimary: Direction = dy < 0 ? "up" : "down";
  if (Math.abs(dx) >= Math.abs(dy)) {
    return [horizontalPrimary, verticalPrimary];
  }
  return [verticalPrimary, horizontalPrimary];
}

function tryMoveCompanion(state: GameState, companion: CompanionAgent, target: Zombie): void {
  for (const direction of candidateCompanionMoveDirections(companion, target)) {
    const offset = directionOffset(direction);
    const candidatePosition: Vec2 = {
      x: companion.position.x + offset.x,
      y: companion.position.y + offset.y,
    };

    if (!isPassable(state.map, candidatePosition)) {
      continue;
    }
    if (isOccupiedByLivingEntity(state, candidatePosition, companion.id)) {
      continue;
    }
    companion.position = candidatePosition;
    companion.emote = "focus";
    return;
  }
}

function resolveCompanionTurn(state: GameState): void {
  const companion = state.companion;
  if (!companion || !companion.alive || state.status !== "active") {
    return;
  }

  const target = findAliveZombies(state)
    .map(zombie => ({ zombie, distance: manhattanDistance(companion.position, zombie.position) }))
    .sort((a, b) => a.distance - b.distance || a.zombie.id.localeCompare(b.zombie.id))[0];

  if (!target) {
    companion.emote = "idle";
    return;
  }

  if (target.distance <= companion.attackRange) {
    try {
      validateAttackCooldown(companion.lastAttackTick, companion.attackCooldownTicks, state.tick, "Companion");
      applyDamageToZombie(state, target.zombie.id, companion.attackDamage);
      companion.lastAttackTick = state.tick;
      companion.emote = "attack";
      return;
    } catch (error) {
      if (!(error instanceof GameRuleError) || error.code !== "ATTACK_COOLDOWN") {
        throw error;
      }
    }
  }

  tryMoveCompanion(state, companion, target.zombie);
}

function applyExplosionDamageToDefenders(state: GameState, center: Vec2): void {
  for (const player of Object.values(state.players)) {
    if (!player.alive) {
      continue;
    }
    if (manhattanDistance(player.position, center) > EXPLOSION_SPLASH_RADIUS) {
      continue;
    }
    player.hp = Math.max(0, player.hp - Math.ceil(EXPLOSION_DAMAGE * 0.3));
    player.alive = player.hp > 0;
  }

  if (state.companion?.alive && manhattanDistance(state.companion.position, center) <= EXPLOSION_SPLASH_RADIUS) {
    state.companion.hp = Math.max(0, state.companion.hp - Math.ceil(EXPLOSION_DAMAGE * 0.35));
    state.companion.alive = state.companion.hp > 0;
    state.companion.emote = state.companion.alive ? "hurt" : "idle";
  }
}

function resolveZombieExplosions(state: GameState, initialExploderId: string): void {
  const queue: string[] = [initialExploderId];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const zombieId = queue.shift();
    if (!zombieId || visited.has(zombieId)) {
      continue;
    }
    visited.add(zombieId);

    const exploder = state.zombies[zombieId];
    if (!exploder) {
      continue;
    }

    applyExplosionDamageToDefenders(state, exploder.position);

    for (const target of Object.values(state.zombies)) {
      if (!target.alive || target.id === zombieId) {
        continue;
      }
      if (manhattanDistance(target.position, exploder.position) > EXPLOSION_SPLASH_RADIUS) {
        continue;
      }
      target.hp = Math.max(0, target.hp - EXPLOSION_DAMAGE);
      if (target.hp <= 0) {
        target.hp = 0;
        target.alive = false;
        if (target.zombieType === "explosive") {
          queue.push(target.id);
        }
      }
    }
  }
}

function applyDamageToZombie(state: GameState, zombieId: string, damage: number): void {
  const target = state.zombies[zombieId];
  if (!target || !target.alive) {
    return;
  }

  target.hp = Math.max(0, target.hp - damage);
  if (target.hp > 0) {
    return;
  }

  target.hp = 0;
  target.alive = false;
  if (target.zombieType === "explosive") {
    resolveZombieExplosions(state, target.id);
  }
}

function resolveAction(state: GameState, playerId: string, action: Action): void {
  const player = ensurePlayerCanAct(state, playerId);

  if (action.type === "wait") {
    return;
  }

  if (action.type === "move") {
    const delta = directionOffset(action.direction);
    const candidatePosition = {
      x: player.position.x + delta.x,
      y: player.position.y + delta.y,
    };

    if (!isPassable(state.map, candidatePosition)) {
      throw new GameRuleError("MOVE_BLOCKED", "Movement blocked by map boundary or wall.");
    }

    if (isOccupiedByLivingEntity(state, candidatePosition, player.id)) {
      throw new GameRuleError("MOVE_OCCUPIED", "Movement blocked by another living entity.");
    }

    player.position = candidatePosition;
    return;
  }

  if (action.type === "attack") {
    validateAttackCooldown(player.lastAttackTick, player.attackCooldownTicks, state.tick, "Player");
    const target = pickZombieTarget(state, player, action.targetId);
    const distance = manhattanDistance(player.position, target.position);
    if (distance > player.attackRange) {
      throw new GameRuleError("TARGET_OUT_OF_RANGE", "Target zombie is out of attack range.");
    }

    applyDamageToZombie(state, target.id, player.attackDamage);
    player.lastAttackTick = state.tick;
    return;
  }

  assertNever(action);
}

export function addPlayerToState({ state, playerId, playerName }: AddPlayerInput): { state: GameState; player: Player } {
  if (state.status !== "active") {
    throw new GameRuleError("GAME_COMPLETED", "Cannot join a completed game.");
  }

  const nextPlayerId = playerId ?? deterministicJoinPlayerId(state);
  const nextPlayerName = playerName?.trim() || `Survivor-${Object.keys(state.players).length + 1}`;
  if (state.players[nextPlayerId]) {
    throw new GameRuleError("PLAYER_EXISTS", "Player already exists in this session.");
  }

  const occupiedKeys = new Set<string>([
    ...Object.values(state.players)
      .filter(player => player.alive)
      .map(player => toTileKey(player.position)),
    ...Object.values(state.zombies)
      .filter(zombie => zombie.alive)
      .map(zombie => toTileKey(zombie.position)),
    ...(state.companion && state.companion.alive ? [toTileKey(state.companion.position)] : []),
  ]);

  let spawn: Vec2 | undefined;
  for (const tile of state.map.tiles) {
    if (tile.type !== "grass") {
      continue;
    }
    const key = `${tile.x},${tile.y}`;
    if (!occupiedKeys.has(key)) {
      spawn = { x: tile.x, y: tile.y };
      break;
    }
  }

  if (!spawn) {
    throw new GameRuleError("NO_SPAWN", "Could not find available spawn tile.");
  }

  const nextState = cloneState(state);
  const player = createPlayer(nextPlayerId, nextPlayerName, spawn);
  nextState.players[player.id] = player;
  nextState.updatedAt = nextStateTimestamp(nextState.updatedAt);
  updateGameStatus(nextState);
  return { state: nextState, player };
}

function resolveCompanionSpawn(map: GameMap, occupiedKeys: Set<string>): Vec2 {
  const preferred = [AGENT_START, { x: PLAYER_START.x + 1, y: PLAYER_START.y + 1 }, { x: PLAYER_START.x, y: PLAYER_START.y + 1 }];
  for (const candidate of preferred) {
    const tile = tileAt(map, candidate);
    if (tile?.type === "grass" && !occupiedKeys.has(toTileKey(candidate))) {
      return candidate;
    }
  }

  for (const tile of map.tiles) {
    if (tile.type !== "grass") {
      continue;
    }
    const key = toTileKey({ x: tile.x, y: tile.y });
    if (!occupiedKeys.has(key)) {
      return { x: tile.x, y: tile.y };
    }
  }

  throw new GameRuleError("NO_SPAWN", "Could not find available spawn tile for companion.");
}

export function createInitialGameState(input: CreateStateInput): { state: GameState; player: Player } {
  const sessionId = input.sessionId;
  const serverId = input.serverId;
  const mode = input.mode ?? "classic";
  const playerId = input.playerId ?? deterministicInitialPlayerId(sessionId);
  const playerName = input.playerName?.trim() || "Survivor-1";
  const requestedZombieCount = input.zombieCount ?? DEFAULT_ZOMBIE_POSITIONS.length;
  if (!Number.isInteger(requestedZombieCount) || requestedZombieCount < 1 || requestedZombieCount > 32) {
    throw new GameRuleError("INVALID_ZOMBIE_COUNT", "zombieCount must be an integer between 1 and 32.");
  }
  const zombieCount = requestedZombieCount;
  const map = createInitialMap();
  const createdAt = 0;

  const player = createPlayer(playerId, playerName, PLAYER_START);
  const zombies: Record<string, Zombie> = {};

  for (let index = 0; index < zombieCount; index++) {
    const fallbackPosition: Vec2 = {
      x: Math.max(1, map.width - 2 - index),
      y: Math.max(1, map.height - 2 - index),
    };
    const position = DEFAULT_ZOMBIE_POSITIONS[index] ?? fallbackPosition;
    const tile = tileAt(map, position);
    const finalPosition = tile?.type === "grass" ? position : fallbackPosition;
    const zombieType = zombieTypeForWaveSlot(1, index + 1);
    zombies[`z-${index + 1}`] = createZombie(`z-${index + 1}`, finalPosition, zombieType);
  }

  let companion: CompanionAgent | undefined;
  if (input.agentEnabled) {
    const occupiedKeys = new Set<string>([
      toTileKey(player.position),
      ...Object.values(zombies).filter(zombie => zombie.alive).map(zombie => toTileKey(zombie.position)),
    ]);
    const companionSpawn = resolveCompanionSpawn(map, occupiedKeys);
    companion = createCompanion(companionSpawn);
  }

  const state: GameState = {
    sessionId,
    serverId,
    tick: 0,
    wave: 1,
    mode,
    status: "active",
    createdAt,
    updatedAt: createdAt,
    map,
    players: { [player.id]: player },
    zombies,
    companion,
  };

  updateGameStatus(state);
  return { state, player };
}

export function tickGame(state: GameState): GameState {
  const nextState = cloneState(state);
  ensureSessionIsActive(nextState);
  nextState.tick += 1;
  resolveCompanionTurn(nextState);
  resolveZombieTurn(nextState);
  updateGameStatus(nextState);
  nextState.updatedAt = nextStateTimestamp(nextState.updatedAt);
  return nextState;
}

export function applyAction(state: GameState, playerId: string, action: Action): GameState {
  const nextState = cloneState(state);
  ensureSessionIsActive(nextState);
  resolveAction(nextState, playerId, action);
  nextState.tick += 1;
  resolveCompanionTurn(nextState);
  resolveZombieTurn(nextState);
  updateGameStatus(nextState);
  nextState.updatedAt = nextStateTimestamp(nextState.updatedAt);
  return nextState;
}

function playerToObservationEntity(player: Player): ObservationEntity {
  return {
    id: player.id,
    kind: "player",
    name: player.name,
    x: player.position.x,
    y: player.position.y,
    hp: player.hp,
    maxHp: player.maxHp,
    alive: player.alive,
  };
}

function zombieToObservationEntity(zombie: Zombie): ObservationEntity {
  return {
    id: zombie.id,
    kind: "zombie",
    zombieType: zombie.zombieType,
    x: zombie.position.x,
    y: zombie.position.y,
    hp: zombie.hp,
    maxHp: zombie.maxHp,
    alive: zombie.alive,
  };
}

function companionToObservationEntity(companion: CompanionAgent): ObservationEntity {
  return {
    id: companion.id,
    kind: "agent",
    name: companion.name,
    x: companion.position.x,
    y: companion.position.y,
    hp: companion.hp,
    maxHp: companion.maxHp,
    alive: companion.alive,
  };
}

export function toObservation(state: GameState, playerId: string): Observation {
  const player = state.players[playerId];
  if (!player) {
    throw new GameRuleError("PLAYER_NOT_FOUND", "Player does not exist in this session.");
  }

  const players = Object.values(state.players)
    .map(playerEntity => playerToObservationEntity(playerEntity))
    .sort((a, b) => a.id.localeCompare(b.id));
  const zombies = Object.values(state.zombies)
    .map(zombieEntity => zombieToObservationEntity(zombieEntity))
    .sort((a, b) => a.id.localeCompare(b.id));
  const aliveZombieEntities = zombies.filter(zombie => zombie.alive);
  const companion = state.companion ? companionToObservationEntity(state.companion) : undefined;

  const nearestZombie = aliveZombieEntities
    .map(zombie => {
      const dx = zombie.x - player.position.x;
      const dy = zombie.y - player.position.y;
      return {
        id: zombie.id,
        distance: Math.abs(dx) + Math.abs(dy),
        dx,
        dy,
        x: zombie.x,
        y: zombie.y,
        hp: zombie.hp,
        alive: zombie.alive,
      };
    })
    .sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))[0] ?? null;

  return {
    sessionId: state.sessionId,
    playerId,
    tick: state.tick,
    status: state.status,
    self: playerToObservationEntity(player),
    nearestZombie,
    players,
    zombies,
    companion,
    entities: [...players, ...zombies, ...(companion ? [companion] : [])].sort((a, b) => a.id.localeCompare(b.id)),
  };
}

export function getGameStatus(state: GameState): GameStatus {
  return state.status;
}
