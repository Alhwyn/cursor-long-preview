#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:3000}"

unauthorized_status="$(curl -sS -o /tmp/rpc-zombie-smoke-supabase-create.json -w "%{http_code}" -X POST "${BASE_URL}/api/servers" \
  -H "Content-Type: application/json" \
  -d '{"name":"Needs Auth","maxPlayers":4}')"
forbidden_status="$(curl -sS -o /tmp/rpc-zombie-smoke-supabase-create-forbidden.json -w "%{http_code}" -X POST "${BASE_URL}/api/servers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid-token" \
  -d '{"name":"Forbidden Auth","maxPlayers":4}')"
malformed_auth_status="$(curl -sS -o /tmp/rpc-zombie-smoke-supabase-create-malformed-auth.json -w "%{http_code}" -X POST "${BASE_URL}/api/servers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic invalid-token" \
  -d '{"name":"Malformed Auth","maxPlayers":4}')"
mixed_case_bearer_status="$(curl -sS -o /tmp/rpc-zombie-smoke-supabase-create-mixed-bearer.json -w "%{http_code}" -X POST "${BASE_URL}/api/servers" \
  -H "Content-Type: application/json" \
  -H "Authorization: bEaReR    invalid-token" \
  -d '{"name":"Mixed Case Bearer Auth","maxPlayers":4}')"

python3 - <<'PY' "${unauthorized_status}" "${forbidden_status}" "${malformed_auth_status}" "${mixed_case_bearer_status}"
import json
import pathlib
import sys

unauthorized_status = int(sys.argv[1])
forbidden_status = int(sys.argv[2])
malformed_auth_status = int(sys.argv[3])
mixed_case_bearer_status = int(sys.argv[4])
create_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-supabase-create.json").read_text())
forbidden_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-supabase-create-forbidden.json").read_text())
malformed_auth_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-supabase-create-malformed-auth.json").read_text())
mixed_case_bearer_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-supabase-create-mixed-bearer.json").read_text())

assert unauthorized_status == 401, f"expected 401 when missing bearer token, got {unauthorized_status}"
assert create_payload["ok"] is False, "expected create failure without token"
assert create_payload["error"]["code"] == "UNAUTHORIZED", f"unexpected code: {create_payload['error']['code']}"
assert forbidden_status == 403, f"expected 403 when bearer token invalid, got {forbidden_status}"
assert forbidden_payload["ok"] is False, "expected create failure with invalid token"
assert forbidden_payload["error"]["code"] == "FORBIDDEN", f"unexpected code: {forbidden_payload['error']['code']}"
assert malformed_auth_status == 401, f"expected 401 when auth scheme is non-bearer, got {malformed_auth_status}"
assert malformed_auth_payload["ok"] is False, "expected create failure with non-bearer auth scheme"
assert malformed_auth_payload["error"]["code"] == "UNAUTHORIZED", (
    f"unexpected code: {malformed_auth_payload['error']['code']}"
)
assert mixed_case_bearer_status == 403, f"expected 403 when mixed-case bearer token is invalid, got {mixed_case_bearer_status}"
assert mixed_case_bearer_payload["ok"] is False, "expected create failure with invalid mixed-case bearer token"
assert mixed_case_bearer_payload["error"]["code"] == "FORBIDDEN", (
    f"unexpected code: {mixed_case_bearer_payload['error']['code']}"
)

print("api-smoke-supabase-auth: PASS")
print("create_without_token=401 UNAUTHORIZED")
print("create_invalid_token=403 FORBIDDEN")
print("create_non_bearer_token=401 UNAUTHORIZED")
print("create_mixed_case_bearer_token=403 FORBIDDEN")
PY
