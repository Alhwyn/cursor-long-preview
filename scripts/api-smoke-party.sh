#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:3000}"

create_party_payload="$(curl -sS -X POST "${BASE_URL}/api/party/create" -H "Content-Type: application/json" -d '{"playerName":"SmokeLeader"}')"
party_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["party"]["partyId"])' <<< "${create_party_payload}")"
party_code="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["party"]["partyCode"])' <<< "${create_party_payload}")"
leader_player_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["player"]["playerId"])' <<< "${create_party_payload}")"

python3 - <<'PY' "${BASE_URL}" "${party_id}" "${leader_player_id}" > /tmp/rpc-zombie-smoke-party-stream.txt
import sys
import urllib.parse
import urllib.request

base_url = sys.argv[1].rstrip("/")
party_id = sys.argv[2]
player_id = sys.argv[3]
stream_url = (
    f"{base_url}/api/realtime/stream?"
    f"partyId={urllib.parse.quote(party_id)}&playerId={urllib.parse.quote(player_id)}"
)

with urllib.request.urlopen(stream_url, timeout=5) as response:
    first_line = response.readline().decode("utf-8").strip()
    second_line = response.readline().decode("utf-8").strip()
    print(first_line)
    print(second_line)
PY

join_two_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-join-two.json -w "%{http_code}" -X POST "${BASE_URL}/api/party/join" -H "Content-Type: application/json" -d "{\"partyCode\":\"${party_code}\",\"playerName\":\"SmokeTwo\"}")"
join_three_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-join-three.json -w "%{http_code}" -X POST "${BASE_URL}/api/party/join" -H "Content-Type: application/json" -d "{\"partyCode\":\"${party_code}\",\"playerName\":\"SmokeThree\"}")"
join_four_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-join-four.json -w "%{http_code}" -X POST "${BASE_URL}/api/party/join" -H "Content-Type: application/json" -d "{\"partyCode\":\"${party_code}\",\"playerName\":\"SmokeFour\"}")"
overflow_join_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-overflow-join.json -w "%{http_code}" -X POST "${BASE_URL}/api/party/join" -H "Content-Type: application/json" -d "{\"partyCode\":\"${party_code}\",\"playerName\":\"SmokeOverflow\"}")"

player_two_id="$(python3 -c 'import json,pathlib; print(json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-party-join-two.json").read_text())["data"]["player"]["playerId"])')"
player_three_id="$(python3 -c 'import json,pathlib; print(json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-party-join-three.json").read_text())["data"]["player"]["playerId"])')"
player_four_id="$(python3 -c 'import json,pathlib; print(json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-party-join-four.json").read_text())["data"]["player"]["playerId"])')"

non_leader_start_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-nonleader-start.json -w "%{http_code}" -X POST "${BASE_URL}/api/party/start" -H "Content-Type: application/json" -d "{\"partyId\":\"${party_id}\",\"playerId\":\"${player_two_id}\"}")"
not_ready_start_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-notready-start.json -w "%{http_code}" -X POST "${BASE_URL}/api/party/start" -H "Content-Type: application/json" -d "{\"partyId\":\"${party_id}\",\"playerId\":\"${leader_player_id}\"}")"

ready_one_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-ready-one.json -w "%{http_code}" -X POST "${BASE_URL}/api/party/ready" -H "Content-Type: application/json" -d "{\"partyId\":\"${party_id}\",\"playerId\":\"${leader_player_id}\",\"ready\":true}")"
ready_two_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-ready-two.json -w "%{http_code}" -X POST "${BASE_URL}/api/party/ready" -H "Content-Type: application/json" -d "{\"partyId\":\"${party_id}\",\"playerId\":\"${player_two_id}\",\"ready\":true}")"
ready_three_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-ready-three.json -w "%{http_code}" -X POST "${BASE_URL}/api/party/ready" -H "Content-Type: application/json" -d "{\"partyId\":\"${party_id}\",\"playerId\":\"${player_three_id}\",\"ready\":true}")"
ready_four_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-ready-four.json -w "%{http_code}" -X POST "${BASE_URL}/api/party/ready" -H "Content-Type: application/json" -d "{\"partyId\":\"${party_id}\",\"playerId\":\"${player_four_id}\",\"ready\":true}")"

mismatched_count_start_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-mismatched-count-start.json -w "%{http_code}" -X POST "${BASE_URL}/api/party/start" -H "Content-Type: application/json" -d "{\"partyId\":\"${party_id}\",\"playerId\":\"${leader_player_id}\",\"zombieCount\":2,\"terminatorCount\":3}")"
fractional_count_start_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-fractional-count-start.json -w "%{http_code}" -X POST "${BASE_URL}/api/party/start" -H "Content-Type: application/json" -d "{\"partyId\":\"${party_id}\",\"playerId\":\"${leader_player_id}\",\"terminatorCount\":1.5}")"
out_of_range_count_start_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-out-of-range-count-start.json -w "%{http_code}" -X POST "${BASE_URL}/api/party/start" -H "Content-Type: application/json" -d "{\"partyId\":\"${party_id}\",\"playerId\":\"${leader_player_id}\",\"terminatorCount\":33}")"
string_count_start_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-string-count-start.json -w "%{http_code}" -X POST "${BASE_URL}/api/party/start" -H "Content-Type: application/json" -d "{\"partyId\":\"${party_id}\",\"playerId\":\"${leader_player_id}\",\"terminatorCount\":\"4\"}")"
invalid_zombiecount_with_valid_terminatorcount_start_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-invalid-zombiecount-with-valid-terminatorcount-start.json -w "%{http_code}" -X POST "${BASE_URL}/api/party/start" -H "Content-Type: application/json" -d "{\"partyId\":\"${party_id}\",\"playerId\":\"${leader_player_id}\",\"zombieCount\":\"2\",\"terminatorCount\":2}")"
invalid_terminatorcount_with_valid_zombiecount_start_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-invalid-terminatorcount-with-valid-zombiecount-start.json -w "%{http_code}" -X POST "${BASE_URL}/api/party/start" -H "Content-Type: application/json" -d "{\"partyId\":\"${party_id}\",\"playerId\":\"${leader_player_id}\",\"zombieCount\":2,\"terminatorCount\":\"2\"}")"
out_of_range_terminatorcount_with_valid_zombiecount_start_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-out-of-range-terminatorcount-with-valid-zombiecount-start.json -w "%{http_code}" -X POST "${BASE_URL}/api/party/start" -H "Content-Type: application/json" -d "{\"partyId\":\"${party_id}\",\"playerId\":\"${leader_player_id}\",\"zombieCount\":2,\"terminatorCount\":33}")"
start_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-start.json -w "%{http_code}" -X POST "${BASE_URL}/api/party/start" -H "Content-Type: application/json" -d "{\"partyId\":\"${party_id}\",\"playerId\":\"${leader_player_id}\",\"zombieCount\":2,\"terminatorCount\":2}")"
session_id="$(python3 -c 'import json,pathlib; print(json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-party-start.json").read_text())["data"]["sessionId"])')"
agent_key_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-agent-key.json -w "%{http_code}" -X POST "${BASE_URL}/api/agent/access-key" -H "Content-Type: application/json" -d "{\"session\":\"${session_id}\",\"playerId\":\"${leader_player_id}\"}")"
agent_access_key="$(python3 -c 'import json,pathlib; print(json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-party-agent-key.json").read_text())["data"]["accessKey"])')"
agent_join_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-agent-join.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" -H "Content-Type: application/json" -d "{\"accessKey\":\"${agent_access_key}\",\"playerName\":\"SmokeAgent\"}")"
agent_reuse_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-agent-reuse.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" -H "Content-Type: application/json" -d "{\"accessKey\":\"${agent_access_key}\",\"playerName\":\"SmokeAgentReuse\"}")"
party_state_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-state.json -w "%{http_code}" "${BASE_URL}/api/party/state?partyId=${party_id}")"

legacy_alias_create_payload="$(curl -sS -X POST "${BASE_URL}/api/party/create" -H "Content-Type: application/json" -d '{"playerName":"LegacyAliasLeader"}')"
legacy_alias_party_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["party"]["partyId"])' <<< "${legacy_alias_create_payload}")"
legacy_alias_player_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["player"]["playerId"])' <<< "${legacy_alias_create_payload}")"
legacy_alias_ready_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-legacy-alias-ready.json -w "%{http_code}" -X POST "${BASE_URL}/api/party/ready" -H "Content-Type: application/json" -d "{\"partyId\":\"${legacy_alias_party_id}\",\"playerId\":\"${legacy_alias_player_id}\",\"ready\":true}")"
legacy_alias_start_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-legacy-alias-start.json -w "%{http_code}" -X POST "${BASE_URL}/api/party/start" -H "Content-Type: application/json" -d "{\"partyId\":\"${legacy_alias_party_id}\",\"playerId\":\"${legacy_alias_player_id}\",\"zombieCount\":2,\"agentEnabled\":false}")"

terminator_alias_create_payload="$(curl -sS -X POST "${BASE_URL}/api/party/create" -H "Content-Type: application/json" -d '{"playerName":"TerminatorAliasLeader"}')"
terminator_alias_party_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["party"]["partyId"])' <<< "${terminator_alias_create_payload}")"
terminator_alias_player_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["player"]["playerId"])' <<< "${terminator_alias_create_payload}")"
terminator_alias_ready_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-terminator-alias-ready.json -w "%{http_code}" -X POST "${BASE_URL}/api/party/ready" -H "Content-Type: application/json" -d "{\"partyId\":\"${terminator_alias_party_id}\",\"playerId\":\"${terminator_alias_player_id}\",\"ready\":true}")"
terminator_alias_start_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-terminator-alias-start.json -w "%{http_code}" -X POST "${BASE_URL}/api/party/start" -H "Content-Type: application/json" -d "{\"partyId\":\"${terminator_alias_party_id}\",\"playerId\":\"${terminator_alias_player_id}\",\"terminatorCount\":2,\"agentEnabled\":false}")"

python3 - <<'PY' \
  "${legacy_alias_create_payload}" "${legacy_alias_ready_status}" "${legacy_alias_start_status}" \
  "${terminator_alias_create_payload}" "${terminator_alias_ready_status}" "${terminator_alias_start_status}"
import json
import pathlib
import sys

legacy_alias_create_payload = json.loads(sys.argv[1])
legacy_alias_ready_status = int(sys.argv[2])
legacy_alias_start_status = int(sys.argv[3])
terminator_alias_create_payload = json.loads(sys.argv[4])
terminator_alias_ready_status = int(sys.argv[5])
terminator_alias_start_status = int(sys.argv[6])

legacy_alias_start_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-party-legacy-alias-start.json").read_text())
terminator_alias_start_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-party-terminator-alias-start.json").read_text())

assert legacy_alias_create_payload["ok"] is True, "legacy alias party create should succeed"
assert legacy_alias_ready_status == 200, f"legacy alias ready should be 200, got {legacy_alias_ready_status}"
assert legacy_alias_start_status == 200, f"legacy alias start should be 200, got {legacy_alias_start_status}"
assert legacy_alias_start_payload["ok"] is True, "legacy alias start payload should succeed"
assert len(legacy_alias_start_payload["data"]["state"]["zombies"]) == 2, (
    "legacy alias start should initialize two terminators"
)

assert terminator_alias_create_payload["ok"] is True, "terminator alias party create should succeed"
assert terminator_alias_ready_status == 200, (
    f"terminator alias ready should be 200, got {terminator_alias_ready_status}"
)
assert terminator_alias_start_status == 200, (
    f"terminator alias start should be 200, got {terminator_alias_start_status}"
)
assert terminator_alias_start_payload["ok"] is True, "terminator alias start payload should succeed"
assert len(terminator_alias_start_payload["data"]["state"]["zombies"]) == 2, (
    "terminator alias start should initialize two terminators"
)
PY

python3 - <<'PY' \
  "${create_party_payload}" \
  "${join_two_status}" "${join_three_status}" "${join_four_status}" "${overflow_join_status}" \
  "${non_leader_start_status}" "${not_ready_start_status}" \
  "${ready_one_status}" "${ready_two_status}" "${ready_three_status}" "${ready_four_status}" \
  "${mismatched_count_start_status}" "${fractional_count_start_status}" "${out_of_range_count_start_status}" "${string_count_start_status}" "${invalid_zombiecount_with_valid_terminatorcount_start_status}" "${invalid_terminatorcount_with_valid_zombiecount_start_status}" "${out_of_range_terminatorcount_with_valid_zombiecount_start_status}" \
  "${start_status}" "${agent_key_status}" "${agent_join_status}" "${agent_reuse_status}" "${party_state_status}"
import json
import pathlib
import sys

create_party_payload = json.loads(sys.argv[1])
join_two_status = int(sys.argv[2])
join_three_status = int(sys.argv[3])
join_four_status = int(sys.argv[4])
overflow_join_status = int(sys.argv[5])
non_leader_start_status = int(sys.argv[6])
not_ready_start_status = int(sys.argv[7])
ready_one_status = int(sys.argv[8])
ready_two_status = int(sys.argv[9])
ready_three_status = int(sys.argv[10])
ready_four_status = int(sys.argv[11])
mismatched_count_start_status = int(sys.argv[12])
fractional_count_start_status = int(sys.argv[13])
out_of_range_count_start_status = int(sys.argv[14])
string_count_start_status = int(sys.argv[15])
invalid_zombiecount_with_valid_terminatorcount_start_status = int(sys.argv[16])
invalid_terminatorcount_with_valid_zombiecount_start_status = int(sys.argv[17])
out_of_range_terminatorcount_with_valid_zombiecount_start_status = int(sys.argv[18])
start_status = int(sys.argv[19])
agent_key_status = int(sys.argv[20])
agent_join_status = int(sys.argv[21])
agent_reuse_status = int(sys.argv[22])
party_state_status = int(sys.argv[23])

overflow_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-party-overflow-join.json").read_text())
non_leader_start_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-party-nonleader-start.json").read_text())
not_ready_start_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-party-notready-start.json").read_text())
mismatched_count_start_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-party-mismatched-count-start.json").read_text())
fractional_count_start_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-party-fractional-count-start.json").read_text())
out_of_range_count_start_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-party-out-of-range-count-start.json").read_text())
string_count_start_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-party-string-count-start.json").read_text())
invalid_zombiecount_with_valid_terminatorcount_start_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-party-invalid-zombiecount-with-valid-terminatorcount-start.json").read_text()
)
invalid_terminatorcount_with_valid_zombiecount_start_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-party-invalid-terminatorcount-with-valid-zombiecount-start.json").read_text()
)
out_of_range_terminatorcount_with_valid_zombiecount_start_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-party-out-of-range-terminatorcount-with-valid-zombiecount-start.json").read_text()
)
start_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-party-start.json").read_text())
agent_key_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-party-agent-key.json").read_text())
agent_join_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-party-agent-join.json").read_text())
agent_reuse_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-party-agent-reuse.json").read_text())
party_state_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-party-state.json").read_text())
stream_preview = pathlib.Path("/tmp/rpc-zombie-smoke-party-stream.txt").read_text()

assert create_party_payload["ok"] is True, "party create failed"
assert join_two_status == 200, f"party join 2 should be 200, got {join_two_status}"
assert join_three_status == 200, f"party join 3 should be 200, got {join_three_status}"
assert join_four_status == 200, f"party join 4 should be 200, got {join_four_status}"
assert overflow_join_status == 409, f"party overflow join should be 409, got {overflow_join_status}"
assert overflow_payload["ok"] is False, "party overflow payload should fail"
assert overflow_payload["error"]["code"] == "PARTY_FULL", f"unexpected overflow code: {overflow_payload['error']['code']}"

assert non_leader_start_status == 403, f"party start by non-leader should be 403, got {non_leader_start_status}"
assert non_leader_start_payload["ok"] is False, "non-leader start payload should fail"
assert non_leader_start_payload["error"]["code"] == "PARTY_NOT_LEADER", (
    f"unexpected non-leader start code: {non_leader_start_payload['error']['code']}"
)
assert not_ready_start_status == 409, f"party not-ready start should be 409, got {not_ready_start_status}"
assert not_ready_start_payload["ok"] is False, "not-ready start payload should fail"
assert not_ready_start_payload["error"]["code"] == "PARTY_NOT_READY", (
    f"unexpected not-ready start code: {not_ready_start_payload['error']['code']}"
)

assert ready_one_status == 200, f"ready one should be 200, got {ready_one_status}"
assert ready_two_status == 200, f"ready two should be 200, got {ready_two_status}"
assert ready_three_status == 200, f"ready three should be 200, got {ready_three_status}"
assert ready_four_status == 200, f"ready four should be 200, got {ready_four_status}"

assert mismatched_count_start_status == 400, (
    f"party start with mismatched zombieCount/terminatorCount should be 400, got {mismatched_count_start_status}"
)
assert mismatched_count_start_payload["ok"] is False, "mismatched count start payload should fail"
assert mismatched_count_start_payload["error"]["code"] == "INVALID_FIELD", (
    f"unexpected mismatched count start code: {mismatched_count_start_payload['error']['code']}"
)
assert fractional_count_start_status == 400, (
    f"party start with fractional terminatorCount should be 400, got {fractional_count_start_status}"
)
assert fractional_count_start_payload["ok"] is False, "fractional count start payload should fail"
assert fractional_count_start_payload["error"]["code"] == "INVALID_ZOMBIE_COUNT", (
    f"unexpected fractional count start code: {fractional_count_start_payload['error']['code']}"
)
assert out_of_range_count_start_status == 400, (
    f"party start with out-of-range terminatorCount should be 400, got {out_of_range_count_start_status}"
)
assert out_of_range_count_start_payload["ok"] is False, "out-of-range count start payload should fail"
assert out_of_range_count_start_payload["error"]["code"] == "INVALID_ZOMBIE_COUNT", (
    f"unexpected out-of-range count start code: {out_of_range_count_start_payload['error']['code']}"
)
assert string_count_start_status == 400, (
    f"party start with string terminatorCount should be 400, got {string_count_start_status}"
)
assert string_count_start_payload["ok"] is False, "string count start payload should fail"
assert string_count_start_payload["error"]["code"] == "INVALID_FIELD", (
    f"unexpected string count start code: {string_count_start_payload['error']['code']}"
)
assert invalid_zombiecount_with_valid_terminatorcount_start_status == 400, (
    "party start with invalid zombieCount and valid terminatorCount should be 400, "
    f"got {invalid_zombiecount_with_valid_terminatorcount_start_status}"
)
assert invalid_zombiecount_with_valid_terminatorcount_start_payload["ok"] is False, (
    "invalid zombieCount with valid terminatorCount start payload should fail"
)
assert invalid_zombiecount_with_valid_terminatorcount_start_payload["error"]["code"] == "INVALID_FIELD", (
    "unexpected invalid zombieCount with valid terminatorCount start code: "
    f"{invalid_zombiecount_with_valid_terminatorcount_start_payload['error']['code']}"
)
assert invalid_terminatorcount_with_valid_zombiecount_start_status == 400, (
    "party start with invalid terminatorCount and valid zombieCount should be 400, "
    f"got {invalid_terminatorcount_with_valid_zombiecount_start_status}"
)
assert invalid_terminatorcount_with_valid_zombiecount_start_payload["ok"] is False, (
    "invalid terminatorCount with valid zombieCount start payload should fail"
)
assert invalid_terminatorcount_with_valid_zombiecount_start_payload["error"]["code"] == "INVALID_FIELD", (
    "unexpected invalid terminatorCount with valid zombieCount start code: "
    f"{invalid_terminatorcount_with_valid_zombiecount_start_payload['error']['code']}"
)
assert out_of_range_terminatorcount_with_valid_zombiecount_start_status == 400, (
    "party start with out-of-range terminatorCount and valid zombieCount should be 400, "
    f"got {out_of_range_terminatorcount_with_valid_zombiecount_start_status}"
)
assert out_of_range_terminatorcount_with_valid_zombiecount_start_payload["ok"] is False, (
    "out-of-range terminatorCount with valid zombieCount start payload should fail"
)
assert out_of_range_terminatorcount_with_valid_zombiecount_start_payload["error"]["code"] == "INVALID_ZOMBIE_COUNT", (
    "unexpected out-of-range terminatorCount with valid zombieCount start code: "
    f"{out_of_range_terminatorcount_with_valid_zombiecount_start_payload['error']['code']}"
)

assert start_status == 200, f"party start should be 200, got {start_status}"
assert start_payload["ok"] is True, "party start payload should succeed"
assert start_payload["data"]["party"]["status"] == "in_game", (
    f"party status should be in_game, got {start_payload['data']['party']['status']}"
)
assert len(start_payload["data"]["state"]["players"]) == 4, "party-started session should include four players"
assert len(start_payload["data"]["state"]["zombies"]) == 2, "party start with terminatorCount should include two terminators"
assert start_payload["data"]["state"]["companion"]["name"] == "Claude Bot", "party-started session should include Claude Bot companion"
assert start_payload["data"]["state"]["mode"] == "endless", "party-started session should default to endless mode"

assert agent_key_status == 201, f"agent access key create should be 201, got {agent_key_status}"
assert agent_key_payload["ok"] is True, "agent key payload should succeed"
assert agent_key_payload["data"]["sessionId"] == start_payload["data"]["sessionId"], "agent key session mismatch"
assert isinstance(agent_key_payload["data"]["accessKey"], str) and agent_key_payload["data"]["accessKey"].startswith("agent_"), (
    "agent key should be returned with expected prefix"
)

assert agent_join_status == 200, f"agent join by key should be 200, got {agent_join_status}"
assert agent_join_payload["ok"] is True, "agent join payload should succeed"
assert agent_join_payload["data"]["sessionId"] == start_payload["data"]["sessionId"], "agent join should target started session"

assert agent_reuse_status == 401, f"agent key reuse should be 401, got {agent_reuse_status}"
assert agent_reuse_payload["ok"] is False, "agent key reuse payload should fail"
assert agent_reuse_payload["error"]["code"] == "ACCESS_KEY_NOT_FOUND", (
    f"unexpected agent key reuse error: {agent_reuse_payload['error']['code']}"
)

assert party_state_status == 200, f"party state should be 200, got {party_state_status}"
assert party_state_payload["ok"] is True, "party state payload should succeed"
assert party_state_payload["data"]["party"]["sessionId"] == start_payload["data"]["sessionId"], "party state session mismatch"
assert len(party_state_payload["data"]["state"]["players"]) == 5, "party state should include four players plus joined agent"
assert party_state_payload["data"]["state"]["companion"]["name"] == "Claude Bot", "party state should expose Claude Bot companion"
assert party_state_payload["data"]["state"]["mode"] == "endless", "party state should remain endless mode"

assert "event: connected" in stream_preview, "realtime stream did not emit connected event preview"

print("api-smoke-party: PASS")
print(f"party={create_party_payload['data']['party']['partyId']}")
print(f"code={create_party_payload['data']['party']['partyCode']}")
print(f"session={start_payload['data']['sessionId']}")
PY
