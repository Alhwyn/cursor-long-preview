import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

let cachedPublicClient: SupabaseClient | null | undefined;
let cachedAdminClient: SupabaseClient | null | undefined;

export interface AuthContext {
  mode: "disabled" | "enabled";
  user: User | null;
  token?: string;
  errorCode?: "MISSING_TOKEN" | "INVALID_TOKEN";
  errorMessage?: string;
}

export function isSupabaseEnabled(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey && supabaseServiceRoleKey);
}

export function getSupabasePublicClient(): SupabaseClient | null {
  if (cachedPublicClient !== undefined) {
    return cachedPublicClient;
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    cachedPublicClient = null;
    return cachedPublicClient;
  }

  cachedPublicClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return cachedPublicClient;
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  if (cachedAdminClient !== undefined) {
    return cachedAdminClient;
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    cachedAdminClient = null;
    return cachedAdminClient;
  }

  cachedAdminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return cachedAdminClient;
}

export function parseBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(" ", 2);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }
  return token.trim();
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
