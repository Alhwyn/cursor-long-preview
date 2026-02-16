import type { GameState, Observation, PartyState } from "./types";

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiSuccess<T> {
  ok: true;
  data: T;
}

export interface ApiFailure {
  ok: false;
  error: ApiError;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export interface JoinGameResponse {
  sessionId: string;
  playerId: string;
  playerName: string;
  state: GameState;
  observation: Observation;
}

export interface SessionStateResponse {
  sessionId: string;
  state: GameState;
}

export interface ObserveResponse {
  sessionId: string;
  playerId: string;
  observation: Observation;
}

export interface LobbyServer {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  maxPlayers: number;
  currentPlayers: number;
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ServersResponse {
  mode: "enabled" | "disabled";
  servers: LobbyServer[];
}

export interface CreateServerResponse {
  mode: "enabled" | "disabled";
  server: LobbyServer;
}

export interface JoinServerResponse {
  sessionId: string;
  playerId: string;
  playerName: string;
  state: GameState;
  observation: Observation;
  server: LobbyServer;
}

export interface PartySnapshot extends PartyState {
  readyCount: number;
  allReady: boolean;
}

export interface PartyResponse {
  party: PartySnapshot;
  player: {
    playerId: string;
    playerName: string;
    ready: boolean;
    joinedAt: number;
  };
}

export interface PartyStateResponse {
  party: PartySnapshot;
  state?: GameState;
}

export interface PartyStartResponse {
  party: PartySnapshot;
  sessionId: string;
  state: GameState;
}

export interface PartyLeaveResponse {
  party: PartySnapshot | null;
}

export interface RealtimeEnvelope<T = unknown> {
  type: string;
  timestamp: number;
  data: T;
}

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json()) as ApiResponse<T>;
  if (!payload.ok) {
    throw new Error(`${payload.error.code}: ${payload.error.message}`);
  }
  return payload.data;
}
