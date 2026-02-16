import { addPlayerToState, applyAction, createInitialGameState, GameRuleError, tickGame, toObservation } from "./engine";
import type { Action, GameState, Observation, Player } from "./types";

export interface SessionRecord {
  sessionId: string;
  serverId?: string;
  state: GameState;
  createdAt: number;
  updatedAt: number;
}

interface CreateSessionInput {
  serverId?: string;
  playerId?: string;
  playerName?: string;
  zombieCount?: number;
  agentEnabled?: boolean;
  gameMode?: "classic" | "endless";
}

interface JoinSessionInput {
  sessionId: string;
  playerId?: string;
  playerName?: string;
}

type SessionMutator = (state: GameState) => GameState;

const sessionStore = new Map<string, SessionRecord>();

function nowTimestamp(): number {
  return Date.now();
}

function ensureSessionRecord(sessionId: string): SessionRecord {
  const session = sessionStore.get(sessionId);
  if (!session) {
    throw new GameRuleError("SESSION_NOT_FOUND", `Session "${sessionId}" was not found.`);
  }
  return session;
}

function writeSession(sessionId: string, state: GameState, serverId?: string): SessionRecord {
  const previous = sessionStore.get(sessionId);
  const nextTimestamp = nowTimestamp();
  const record: SessionRecord = {
    sessionId,
    serverId: serverId ?? previous?.serverId,
    state,
    createdAt: previous?.createdAt ?? nextTimestamp,
    updatedAt: nextTimestamp,
  };
  sessionStore.set(sessionId, record);
  return record;
}

export function listSessions(): SessionRecord[] {
  return Array.from(sessionStore.values()).sort((a, b) => a.createdAt - b.createdAt);
}

export function createSession(input: CreateSessionInput): { session: SessionRecord; player: Player } {
  const sessionId = crypto.randomUUID();
  const { state, player } = createInitialGameState({
    sessionId,
    serverId: input.serverId,
    playerId: input.playerId,
    playerName: input.playerName,
    zombieCount: input.zombieCount,
    agentEnabled: input.agentEnabled,
    mode: input.gameMode,
  });

  const session = writeSession(sessionId, state, input.serverId);
  return { session, player };
}

export function getSession(sessionId: string): SessionRecord | undefined {
  return sessionStore.get(sessionId);
}

export function requireSession(sessionId: string): SessionRecord {
  return ensureSessionRecord(sessionId);
}

export function updateSession(sessionId: string, mutator: SessionMutator): SessionRecord {
  const session = ensureSessionRecord(sessionId);
  const nextState = mutator(session.state);
  return writeSession(sessionId, nextState, session.serverId);
}

export function joinSession(input: JoinSessionInput): { session: SessionRecord; player: Player } {
  const session = ensureSessionRecord(input.sessionId);
  const { state, player } = addPlayerToState({
    state: session.state,
    playerId: input.playerId,
    playerName: input.playerName,
  });

  const updated = writeSession(input.sessionId, state, session.serverId);
  return { session: updated, player };
}

export function performAction(sessionId: string, playerId: string, action: Action): SessionRecord {
  return updateSession(sessionId, state => applyAction(state, playerId, action));
}

export function stepSession(sessionId: string): SessionRecord {
  return updateSession(sessionId, state => tickGame(state));
}

export function getState(sessionId: string): GameState {
  return ensureSessionRecord(sessionId).state;
}

export function observeSession(sessionId: string, playerId: string): Observation {
  const state = ensureSessionRecord(sessionId).state;
  return toObservation(state, playerId);
}

export function clearSessions(): void {
  sessionStore.clear();
}
