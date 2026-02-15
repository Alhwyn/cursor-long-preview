#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:3000}"

join_payload="$(curl -sS -X POST "${BASE_URL}/api/game/join" -H "Content-Type: application/json" -d '{"playerName":"SmokeRunner"}')"
session_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["sessionId"])' <<< "${join_payload}")"
player_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["playerId"])' <<< "${join_payload}")"

action_status="$(curl -sS -o /tmp/rpc-zombie-smoke-action.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"move\",\"direction\":\"right\"}}")"
out_of_range_attack_status="$(curl -sS -o /tmp/rpc-zombie-smoke-out-of-range-attack.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"attack\",\"targetId\":\"z-1\"}}")"

bad_direction_status="$(curl -sS -o /tmp/rpc-zombie-smoke-bad-direction.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"move\",\"direction\":\"north\"}}")"
invalid_json_status="$(curl -sS -o /tmp/rpc-zombie-smoke-invalid-json.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{invalid-json')"

missing_query_status="$(curl -sS -o /tmp/rpc-zombie-smoke-missing-query.json -w "%{http_code}" "${BASE_URL}/api/game/state")"
missing_state_status="$(curl -sS -o /tmp/rpc-zombie-smoke-missing-state.json -w "%{http_code}" "${BASE_URL}/api/game/state?session=missing-session-id")"
missing_observe_status="$(curl -sS -o /tmp/rpc-zombie-smoke-missing-observe.json -w "%{http_code}" "${BASE_URL}/api/game/observe?session=missing-session-id")"

servers_payload="$(curl -sS "${BASE_URL}/api/servers")"
create_server_payload="$(curl -sS -X POST "${BASE_URL}/api/servers" -H "Content-Type: application/json" -d '{"name":"Smoke Lobby","maxPlayers":2}')"
server_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["server"]["id"])' <<< "${create_server_payload}")"
join_server_status="$(curl -sS -o /tmp/rpc-zombie-smoke-join-server.json -w "%{http_code}" -X POST "${BASE_URL}/api/servers/${server_id}/join" -H "Content-Type: application/json" -d '{"playerName":"LobbySmoke"}')"
linked_session_id="$(python3 -c 'import json,pathlib; print(json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-join-server.json").read_text())["data"]["sessionId"])')"
missing_join_server_status="$(curl -sS -o /tmp/rpc-zombie-smoke-missing-join-server.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" -H "Content-Type: application/json" -d '{"playerName":"UnknownServerJoin","serverId":"srv-missing"}')"
create_server_two_payload="$(curl -sS -X POST "${BASE_URL}/api/servers" -H "Content-Type: application/json" -d '{"name":"Smoke Lobby Two","maxPlayers":2}')"
server_two_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["server"]["id"])' <<< "${create_server_two_payload}")"
mismatch_join_status="$(curl -sS -o /tmp/rpc-zombie-smoke-session-mismatch.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" -H "Content-Type: application/json" -d "{\"session\":\"${linked_session_id}\",\"serverId\":\"${server_two_id}\",\"playerName\":\"Mismatch\"}")"
missing_server_status="$(curl -sS -o /tmp/rpc-zombie-smoke-missing-server.json -w "%{http_code}" -X POST "${BASE_URL}/api/servers/does-not-exist/join" -H "Content-Type: application/json" -d '{"playerName":"Ghost"}')"

python3 - <<'PY' "${join_payload}" "${servers_payload}" "${action_status}" "${out_of_range_attack_status}" "${bad_direction_status}" "${invalid_json_status}" "${missing_query_status}" "${missing_state_status}" "${missing_observe_status}" "${join_server_status}" "${missing_server_status}" "${missing_join_server_status}" "${mismatch_join_status}"
import json
import pathlib
import sys

join_payload = json.loads(sys.argv[1])
servers_payload = json.loads(sys.argv[2])
action_status = int(sys.argv[3])
out_of_range_attack_status = int(sys.argv[4])
bad_direction_status = int(sys.argv[5])
invalid_json_status = int(sys.argv[6])
missing_query_status = int(sys.argv[7])
missing_state_status = int(sys.argv[8])
missing_observe_status = int(sys.argv[9])
join_server_status = int(sys.argv[10])
missing_server_status = int(sys.argv[11])
missing_join_server_status = int(sys.argv[12])
mismatch_join_status = int(sys.argv[13])
missing_server_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-missing-server.json").read_text())
missing_join_server_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-missing-join-server.json").read_text())
mismatch_join_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-session-mismatch.json").read_text())
invalid_json_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-invalid-json.json").read_text())
out_of_range_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-out-of-range-attack.json").read_text())
missing_state_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-missing-state.json").read_text())
missing_observe_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-missing-observe.json").read_text())

assert join_payload["ok"] is True, "join failed"
assert servers_payload["ok"] is True, "server list failed"
assert action_status == 200, f"move action status unexpected: {action_status}"
assert out_of_range_attack_status == 409, f"out-of-range attack should be 409, got {out_of_range_attack_status}"
assert bad_direction_status == 400, f"bad direction should be 400, got {bad_direction_status}"
assert invalid_json_status == 400, f"invalid JSON should be 400, got {invalid_json_status}"
assert missing_query_status == 400, f"missing state query should be 400, got {missing_query_status}"
assert missing_state_status == 404, f"state missing session should be 404, got {missing_state_status}"
assert missing_observe_status == 404, f"observe missing session should be 404, got {missing_observe_status}"
assert join_server_status == 200, f"join server should be 200, got {join_server_status}"
assert missing_server_status == 404, f"missing server join should be 404, got {missing_server_status}"
assert missing_join_server_status == 404, f"game join with missing server should be 404, got {missing_join_server_status}"
assert mismatch_join_status == 409, f"session/server mismatch should be 409, got {mismatch_join_status}"
assert missing_server_payload["ok"] is False, "missing server payload should be failure"
assert missing_server_payload["error"]["code"] == "SERVER_NOT_FOUND", f"missing server error mismatch: {missing_server_payload['error']['code']}"
assert out_of_range_payload["ok"] is False, "out-of-range attack payload should be failure"
assert out_of_range_payload["error"]["code"] == "TARGET_OUT_OF_RANGE", f"out-of-range attack code mismatch: {out_of_range_payload['error']['code']}"
assert invalid_json_payload["ok"] is False, "invalid JSON payload should be failure"
assert invalid_json_payload["error"]["code"] == "INVALID_JSON", f"invalid JSON code mismatch: {invalid_json_payload['error']['code']}"
assert missing_state_payload["ok"] is False, "missing state payload should be failure"
assert missing_state_payload["error"]["code"] == "SESSION_NOT_FOUND", f"missing state error mismatch: {missing_state_payload['error']['code']}"
assert missing_observe_payload["ok"] is False, "missing observe payload should be failure"
assert missing_observe_payload["error"]["code"] == "SESSION_NOT_FOUND", f"missing observe error mismatch: {missing_observe_payload['error']['code']}"
assert missing_join_server_payload["ok"] is False, "missing server game join payload should be failure"
assert missing_join_server_payload["error"]["code"] == "SERVER_NOT_FOUND", f"missing game join server error mismatch: {missing_join_server_payload['error']['code']}"
assert mismatch_join_payload["ok"] is False, "session/server mismatch payload should be failure"
assert mismatch_join_payload["error"]["code"] == "SESSION_SERVER_MISMATCH", f"session/server mismatch error mismatch: {mismatch_join_payload['error']['code']}"

print("api-smoke: PASS")
print(f"session={join_payload['data']['sessionId']}")
print(f"player={join_payload['data']['playerId']}")
print(f"lobby_mode={servers_payload['data']['mode']}")
PY
