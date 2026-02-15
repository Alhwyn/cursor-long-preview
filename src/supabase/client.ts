import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

interface SupabaseEnv {
  url?: string;
  anonKey?: string;
  serviceRoleKey?: string;
}

interface CachedClient {
  key: string;
  client: SupabaseClient | null;
}

let cachedPublicClient: CachedClient | null = null;
let cachedAdminClient: CachedClient | null = null;

function readSupabaseEnv(): SupabaseEnv {
  return {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
}

function clientCacheKey(url?: string, key?: string): string {
  return `${url ?? ""}|${key ?? ""}`;
}

export interface AuthContext {
  mode: "disabled" | "enabled";
  user: User | null;
  token?: string;
  errorCode?: "MISSING_TOKEN" | "INVALID_TOKEN";
  errorMessage?: string;
}

export function isSupabaseEnabled(): boolean {
  const { url, anonKey, serviceRoleKey } = readSupabaseEnv();
  return Boolean(url && anonKey && serviceRoleKey);
}

function createSupabaseClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export function getSupabasePublicClient(): SupabaseClient | null {
  const { url, anonKey } = readSupabaseEnv();
  const cacheKey = clientCacheKey(url, anonKey);

  if (cachedPublicClient?.key === cacheKey) {
    return cachedPublicClient.client;
  }

  if (!url || !anonKey) {
    cachedPublicClient = { key: cacheKey, client: null };
    return null;
  }

  const client = createSupabaseClient(url, anonKey);
  cachedPublicClient = { key: cacheKey, client };
  return client;
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  const { url, serviceRoleKey } = readSupabaseEnv();
  const cacheKey = clientCacheKey(url, serviceRoleKey);

  if (cachedAdminClient?.key === cacheKey) {
    return cachedAdminClient.client;
  }

  if (!url || !serviceRoleKey) {
    cachedAdminClient = { key: cacheKey, client: null };
    return null;
  }

  const client = createSupabaseClient(url, serviceRoleKey);
  cachedAdminClient = { key: cacheKey, client };
  return client;
}

export function clearSupabaseClientsForTests(): void {
  cachedPublicClient = null;
  cachedAdminClient = null;
}

export function parseBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const match = authorizationHeader.trim().match(/^bearer\s+(.+)$/i);
  if (!match) {
    return null;
  }
  const token = match[1]?.trim();
  return token ? token : null;
}

export async function verifyBearerToken(authorizationHeader: string | null): Promise<AuthContext> {
  if (!isSupabaseEnabled()) {
    return {
      mode: "disabled",
      user: null,
    };
  }

  const token = parseBearerToken(authorizationHeader);
  if (!token) {
    return {
      mode: "enabled",
      user: null,
      errorCode: "MISSING_TOKEN",
      errorMessage: "Missing or malformed Bearer token.",
    };
  }

  const publicClient = getSupabasePublicClient();
  if (!publicClient) {
    return {
      mode: "enabled",
      user: null,
      errorCode: "INVALID_TOKEN",
      errorMessage: "Supabase is enabled but public client could not be created.",
    };
  }

  const { data, error } = await publicClient.auth.getUser(token);
  if (error || !data.user) {
    return {
      mode: "enabled",
      user: null,
      token,
      errorCode: "INVALID_TOKEN",
      errorMessage: error?.message ?? "Bearer token is invalid.",
    };
  }

  return {
    mode: "enabled",
    user: data.user,
    token,
  };
}

export function getSupabaseMode(): "enabled" | "disabled" {
  return isSupabaseEnabled() ? "enabled" : "disabled";
}
