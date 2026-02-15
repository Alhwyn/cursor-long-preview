import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  clearSupabaseClientsForTests,
  getSupabaseMode,
  getSupabasePublicClient,
  isSupabaseEnabled,
  parseBearerToken,
  verifyBearerToken,
} from "./client";

const ORIGINAL_ENV = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
};

function setSupabaseEnv(values: { url?: string; anon?: string; service?: string }): void {
  if (values.url === undefined) {
    delete process.env.SUPABASE_URL;
  } else {
    process.env.SUPABASE_URL = values.url;
  }

  if (values.anon === undefined) {
    delete process.env.SUPABASE_ANON_KEY;
  } else {
    process.env.SUPABASE_ANON_KEY = values.anon;
  }

  if (values.service === undefined) {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  } else {
    process.env.SUPABASE_SERVICE_ROLE_KEY = values.service;
  }
  clearSupabaseClientsForTests();
}

describe("supabase client helpers", () => {
  beforeEach(() => {
    setSupabaseEnv({
      url: undefined,
      anon: undefined,
      service: undefined,
    });
  });

  afterEach(() => {
    setSupabaseEnv({
      url: ORIGINAL_ENV.SUPABASE_URL,
      anon: ORIGINAL_ENV.SUPABASE_ANON_KEY,
      service: ORIGINAL_ENV.SUPABASE_SERVICE_ROLE_KEY,
    });
  });

  test("parseBearerToken accepts bearer and trims token", () => {
    expect(parseBearerToken("Bearer abc-token")).toBe("abc-token");
    expect(parseBearerToken("bearer   token-space")).toBe("token-space");
  });

  test("parseBearerToken rejects malformed authorization headers", () => {
    expect(parseBearerToken(null)).toBeNull();
    expect(parseBearerToken("Basic abc")).toBeNull();
    expect(parseBearerToken("Bearer")).toBeNull();
    expect(parseBearerToken("")).toBeNull();
  });

  test("supabase mode reflects current environment values", () => {
    expect(isSupabaseEnabled()).toBe(false);
    expect(getSupabaseMode()).toBe("disabled");

    setSupabaseEnv({
      url: "https://example.supabase.co",
      anon: "anon-key",
      service: "service-key",
    });

    expect(isSupabaseEnabled()).toBe(true);
    expect(getSupabaseMode()).toBe("enabled");
  });

  test("verifyBearerToken short-circuits disabled mode", async () => {
    const auth = await verifyBearerToken(null);
    expect(auth.mode).toBe("disabled");
    expect(auth.user).toBeNull();
    expect(auth.errorCode).toBeUndefined();
  });

  test("verifyBearerToken requires token in enabled mode", async () => {
    setSupabaseEnv({
      url: "https://example.supabase.co",
      anon: "anon-key",
      service: "service-key",
    });

    const missing = await verifyBearerToken(null);
    expect(missing.mode).toBe("enabled");
    expect(missing.user).toBeNull();
    expect(missing.errorCode).toBe("MISSING_TOKEN");
  });

  test("public client cache updates when env changes", () => {
    setSupabaseEnv({
      url: "https://example.supabase.co",
      anon: "anon-1",
      service: "service-key",
    });

    const first = getSupabasePublicClient();
    const second = getSupabasePublicClient();
    expect(first).toBe(second);

    setSupabaseEnv({
      url: "https://example.supabase.co",
      anon: "anon-2",
      service: "service-key",
    });

    const third = getSupabasePublicClient();
    expect(first).not.toBe(third);
  });
});
