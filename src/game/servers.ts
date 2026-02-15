import { GameRuleError } from "./engine";
import type { GameState } from "./types";
import { getSupabaseAdminClient, isSupabaseEnabled } from "../supabase/client";

interface ServerRow {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  max_players: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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

interface CreateServerInput {
  name: string;
  description?: string;
  maxPlayers?: number;
  createdBy?: string;
}

interface LocalServerRecord extends LobbyServer {}

interface SnapshotInput {
  serverId: string;
  state: GameState;
}

const DEFAULT_MAX_PLAYERS = 4;
const localServerStore = new Map<string, LocalServerRecord>();
const activeSessionByServerId = new Map<string, string>();
let sessionPlayerCountResolver: ((sessionId: string) => number) | null = null;

function nowTimestamp(): number {
  return Date.now();
}

function mapRowToLobbyServer(row: ServerRow): LobbyServer {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    isPublic: row.is_public,
    maxPlayers: row.max_players,
    currentPlayers: 0,
    createdBy: row.created_by ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

function toSessionPlayerCount(serverId: string): number {
  const sessionId = activeSessionByServerId.get(serverId);
  if (!sessionId || !sessionPlayerCountResolver) {
    return 0;
  }

  return Number(sessionPlayerCountResolver(sessionId) ?? 0);
}

export function configureServerPlayerCountResolver(resolver: (sessionId: string) => number): void {
  sessionPlayerCountResolver = resolver;
}

function normalizeCreateInput(input: CreateServerInput): Required<CreateServerInput> {
  const name = input.name.trim();
  if (!name) {
    throw new GameRuleError("INVALID_SERVER_NAME", "Server name is required.");
  }

  const maxPlayers = input.maxPlayers ?? DEFAULT_MAX_PLAYERS;
  if (!Number.isInteger(maxPlayers) || maxPlayers < 1 || maxPlayers > 32) {
    throw new GameRuleError("INVALID_MAX_PLAYERS", "maxPlayers must be an integer between 1 and 32.");
  }

  return {
    name,
    description: input.description?.trim() ?? "",
    maxPlayers,
    createdBy: input.createdBy ?? "",
  };
}

async function listSupabaseServers(): Promise<LobbyServer[]> {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    throw new GameRuleError("SUPABASE_UNAVAILABLE", "Supabase admin client is unavailable.");
  }

  const { data, error } = await adminClient
    .from("servers")
    .select("id,name,description,is_public,max_players,created_by,created_at,updated_at")
    .eq("is_public", true)
    .order("created_at", { ascending: true });

  if (error) {
    throw new GameRuleError("SUPABASE_QUERY_FAILED", `Failed to list servers: ${error.message}`);
  }

  const rows = (data ?? []) as ServerRow[];
  return rows.map(row => ({
    ...mapRowToLobbyServer(row),
    currentPlayers: toSessionPlayerCount(row.id),
  }));
}

function listLocalServers(): LobbyServer[] {
  return Array.from(localServerStore.values())
    .map(server => ({
      ...server,
      currentPlayers: toSessionPlayerCount(server.id),
    }))
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function listServers(): Promise<LobbyServer[]> {
  if (isSupabaseEnabled()) {
    return listSupabaseServers();
  }

  return listLocalServers();
}

async function createSupabaseServer(input: Required<CreateServerInput>): Promise<LobbyServer> {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    throw new GameRuleError("SUPABASE_UNAVAILABLE", "Supabase admin client is unavailable.");
  }

  const { data, error } = await adminClient
    .from("servers")
    .insert({
      name: input.name,
      description: input.description || null,
      is_public: true,
      max_players: input.maxPlayers,
      created_by: input.createdBy || null,
    })
    .select("id,name,description,is_public,max_players,created_by,created_at,updated_at")
    .single();

  if (error || !data) {
    throw new GameRuleError("SUPABASE_CREATE_FAILED", `Failed to create server: ${error?.message ?? "no row returned"}`);
  }

  const server = mapRowToLobbyServer(data as ServerRow);
  return {
    ...server,
    currentPlayers: 0,
  };
}

function createLocalServer(input: Required<CreateServerInput>): LobbyServer {
  const id = `srv-${crypto.randomUUID()}`;
  const timestamp = nowTimestamp();
  const server: LocalServerRecord = {
    id,
    name: input.name,
    description: input.description || undefined,
    isPublic: true,
    maxPlayers: input.maxPlayers,
    currentPlayers: 0,
    createdBy: input.createdBy || undefined,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  localServerStore.set(id, server);
  return server;
}

export async function createServer(input: CreateServerInput): Promise<LobbyServer> {
  const normalizedInput = normalizeCreateInput(input);
  if (isSupabaseEnabled()) {
    return createSupabaseServer(normalizedInput);
  }

  return createLocalServer(normalizedInput);
}

async function getSupabaseServer(serverId: string): Promise<LobbyServer | null> {
  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    throw new GameRuleError("SUPABASE_UNAVAILABLE", "Supabase admin client is unavailable.");
  }

  const { data, error } = await adminClient
    .from("servers")
    .select("id,name,description,is_public,max_players,created_by,created_at,updated_at")
    .eq("id", serverId)
    .eq("is_public", true)
    .maybeSingle();

  if (error) {
    throw new GameRuleError("SUPABASE_QUERY_FAILED", `Failed to get server: ${error.message}`);
  }
  if (!data) {
    return null;
  }

  return {
    ...mapRowToLobbyServer(data as ServerRow),
    currentPlayers: toSessionPlayerCount(serverId),
  };
}

export async function getServer(serverId: string): Promise<LobbyServer | null> {
  if (isSupabaseEnabled()) {
    return getSupabaseServer(serverId);
  }

  const localServer = localServerStore.get(serverId);
  if (!localServer) {
    return null;
  }

  return {
    ...localServer,
    currentPlayers: toSessionPlayerCount(serverId),
  };
}

export function getActiveSessionId(serverId: string): string | undefined {
  return activeSessionByServerId.get(serverId);
}

export function setActiveSessionId(serverId: string, sessionId: string): void {
  activeSessionByServerId.set(serverId, sessionId);
  const localServer = localServerStore.get(serverId);
  if (localServer) {
    localServer.updatedAt = nowTimestamp();
  }
}

export async function recordServerJoin(serverId: string, playerId: string, playerName: string): Promise<void> {
  if (!isSupabaseEnabled()) {
    return;
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return;
  }

  const { error } = await adminClient.from("server_players").upsert(
    {
      server_id: serverId,
      player_id: playerId,
      player_name: playerName,
      joined_at: new Date().toISOString(),
    },
    {
      onConflict: "server_id,player_id",
    },
  );

  if (error) {
    throw new GameRuleError("SUPABASE_JOIN_FAILED", `Failed to record server join: ${error.message}`);
  }
}

export async function recordSnapshot(input: SnapshotInput): Promise<void> {
  if (!isSupabaseEnabled()) {
    return;
  }

  const adminClient = getSupabaseAdminClient();
  if (!adminClient) {
    return;
  }

  const { error } = await adminClient.from("game_snapshots").insert({
    server_id: input.serverId,
    session_id: input.state.sessionId,
    tick: input.state.tick,
    status: input.state.status,
    snapshot: input.state,
  });

  if (error) {
    throw new GameRuleError("SUPABASE_SNAPSHOT_FAILED", `Failed to persist snapshot: ${error.message}`);
  }
}
