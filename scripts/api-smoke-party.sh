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

start_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-start.json -w "%{http_code}" -X POST "${BASE_URL}/api/party/start" -H "Content-Type: application/json" -d "{\"partyId\":\"${party_id}\",\"playerId\":\"${leader_player_id}\"}")"
party_state_status="$(curl -sS -o /tmp/rpc-zombie-smoke-party-state.json -w "%{http_code}" "${BASE_URL}/api/party/state?partyId=${party_id}")"

python3 - <<'PY' \
  "${create_party_payload}" \
  "${join_two_status}" "${join_three_status}" "${join_four_status}" "${overflow_join_status}" \
  "${non_leader_start_status}" "${not_ready_start_status}" \
  "${ready_one_status}" "${ready_two_status}" "${ready_three_status}" "${ready_four_status}" \
  "${start_status}" "${party_state_status}"
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
start_status = int(sys.argv[12])
party_state_status = int(sys.argv[13])

overflow_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-party-overflow-join.json").read_text())
non_leader_start_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-party-nonleader-start.json").read_text())
not_ready_start_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-party-notready-start.json").read_text())
start_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-party-start.json").read_text())
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

assert start_status == 200, f"party start should be 200, got {start_status}"
assert start_payload["ok"] is True, "party start payload should succeed"
assert start_payload["data"]["party"]["status"] == "in_game", (
    f"party status should be in_game, got {start_payload['data']['party']['status']}"
)
assert len(start_payload["data"]["state"]["players"]) == 4, "party-started session should include four players"

assert party_state_status == 200, f"party state should be 200, got {party_state_status}"
assert party_state_payload["ok"] is True, "party state payload should succeed"
assert party_state_payload["data"]["party"]["sessionId"] == start_payload["data"]["sessionId"], "party state session mismatch"
assert len(party_state_payload["data"]["state"]["players"]) == 4, "party state should include four players"

assert "event: connected" in stream_preview, "realtime stream did not emit connected event preview"

print("api-smoke-party: PASS")
print(f"party={create_party_payload['data']['party']['partyId']}")
print(f"code={create_party_payload['data']['party']['partyCode']}")
print(f"session={start_payload['data']['sessionId']}")
PY
