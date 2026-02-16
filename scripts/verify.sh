#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

cleanup_server() {
  if [[ -n "${SERVER_PID:-}" ]]; then
    kill "${SERVER_PID}" >/dev/null 2>&1 || true
    wait "${SERVER_PID}" 2>/dev/null || true
    unset SERVER_PID
  fi
}

trap cleanup_server EXIT

echo "verify: typecheck"
bunx tsc --noEmit

echo "verify: tests"
bun test

echo "verify: build"
bun run build.ts

echo "verify: api smoke (fallback mode)"
bun src/index.ts > /tmp/rpc-zombie-verify-default.log 2>&1 &
SERVER_PID=$!
sleep 2
./scripts/api-smoke.sh
echo "verify: api smoke (party + realtime)"
./scripts/api-smoke-party.sh
cleanup_server

echo "verify: api smoke (supabase auth gate)"
SUPABASE_URL=https://example.supabase.co \
SUPABASE_ANON_KEY=test-anon \
SUPABASE_SERVICE_ROLE_KEY=test-service \
bun src/index.ts > /tmp/rpc-zombie-verify-supabase.log 2>&1 &
SERVER_PID=$!
sleep 2
./scripts/api-smoke-supabase-auth.sh
cleanup_server

echo "verify: PASS"
