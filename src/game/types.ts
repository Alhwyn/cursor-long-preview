export type TileType = "grass" | "wall";

export type GameStatus = "active" | "won" | "lost";
export type GameMode = "classic" | "endless";

export type Direction = "up" | "down" | "left" | "right";

export interface Vec2 {
  x: number;
  y: number;
}

export interface MapTile {
  x: number;
  y: number;
  type: TileType;
}

export interface GameMap {
  width: number;
  height: number;
  tiles: MapTile[];
}

export interface CombatStats {
  attackDamage: number;
  attackRange: number;
  attackCooldownTicks: number;
}

export interface Player extends CombatStats {
  id: string;
  name: string;
  position: Vec2;
  hp: number;
  maxHp: number;
  alive: boolean;
  lastAttackTick: number;
}

export interface Zombie extends CombatStats {
  id: string;
  zombieType: ZombieType;
  position: Vec2;
  hp: number;
  maxHp: number;
  alive: boolean;
  lastAttackTick: number;
}

export type ZombieType = "normal" | "fast" | "explosive" | "giant";

export interface CompanionAgent extends CombatStats {
  id: string;
  name: string;
  position: Vec2;
  hp: number;
  maxHp: number;
  alive: boolean;
  lastAttackTick: number;
  emote: "idle" | "focus" | "attack" | "hurt";
}

export type Action =
  | {
      type: "move";
      direction: Direction;
    }
  | {
      type: "attack";
      targetId?: string;
    }
  | {
      type: "wait";
    };

export interface GameState {
  sessionId: string;
  serverId?: string;
  tick: number;
  wave: number;
  mode: GameMode;
  status: GameStatus;
  createdAt: number;
  updatedAt: number;
  map: GameMap;
  players: Record<string, Player>;
  zombies: Record<string, Zombie>;
  companion?: CompanionAgent;
}

export interface ObservationEntity {
  id: string;
  kind: "player" | "zombie" | "agent";
  zombieType?: ZombieType;
  name?: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  alive: boolean;
}

export interface NearestZombieInfo {
  id: string;
  distance: number;
  dx: number;
  dy: number;
  x: number;
  y: number;
  hp: number;
  alive: boolean;
}

export interface Observation {
  sessionId: string;
  playerId: string;
  tick: number;
  status: GameStatus;
  self: ObservationEntity;
  nearestZombie: NearestZombieInfo | null;
  players: ObservationEntity[];
  zombies: ObservationEntity[];
  companion?: ObservationEntity;
  entities: ObservationEntity[];
}

export type PartyStatus = "open" | "in_game" | "closed";

export interface PartyMember {
  playerId: string;
  playerName: string;
  ready: boolean;
  joinedAt: number;
}

export interface PartyState {
  partyId: string;
  partyCode: string;
  status: PartyStatus;
  leaderPlayerId: string;
  maxPlayers: number;
  members: PartyMember[];
  sessionId?: string;
  createdAt: number;
  updatedAt: number;
}
