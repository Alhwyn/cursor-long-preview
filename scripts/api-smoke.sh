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
invalid_join_field_status="$(curl -sS -o /tmp/rpc-zombie-smoke-invalid-join-field.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerName":123}')"
blank_session_status="$(curl -sS -o /tmp/rpc-zombie-smoke-blank-session.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"session":"   ","playerName":"BlankSession"}')"
blank_server_id_status="$(curl -sS -o /tmp/rpc-zombie-smoke-blank-server-id.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"serverId":"   ","playerName":"BlankServerId"}')"
blank_player_id_status="$(curl -sS -o /tmp/rpc-zombie-smoke-blank-player-id.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerId":"   ","playerName":"BlankPlayerId"}')"
missing_direction_status="$(curl -sS -o /tmp/rpc-zombie-smoke-missing-direction.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"move\"}}")"
invalid_attack_target_status="$(curl -sS -o /tmp/rpc-zombie-smoke-invalid-attack-target.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"attack\",\"targetId\":42}}")"
blank_attack_target_status="$(curl -sS -o /tmp/rpc-zombie-smoke-blank-attack-target.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"attack\",\"targetId\":\"   \"}}")"
fractional_zombie_count_status="$(curl -sS -o /tmp/rpc-zombie-smoke-fractional-zombie-count.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerName":"FractionalSmoke","zombieCount":1.5}')"
invalid_json_status="$(curl -sS -o /tmp/rpc-zombie-smoke-invalid-json.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{invalid-json')"

missing_query_status="$(curl -sS -o /tmp/rpc-zombie-smoke-missing-query.json -w "%{http_code}" "${BASE_URL}/api/game/state")"
blank_state_query_status="$(curl -sS -o /tmp/rpc-zombie-smoke-blank-state-query.json -w "%{http_code}" "${BASE_URL}/api/game/state?session=%20%20%20")"
missing_state_status="$(curl -sS -o /tmp/rpc-zombie-smoke-missing-state.json -w "%{http_code}" "${BASE_URL}/api/game/state?session=missing-session-id")"
missing_observe_status="$(curl -sS -o /tmp/rpc-zombie-smoke-missing-observe.json -w "%{http_code}" "${BASE_URL}/api/game/observe?session=missing-session-id")"
blank_observe_player_status="$(curl -sS -o /tmp/rpc-zombie-smoke-blank-observe-player.json -w "%{http_code}" "${BASE_URL}/api/game/observe?session=${session_id}&player=%20%20%20")"
blank_action_session_status="$(curl -sS -o /tmp/rpc-zombie-smoke-blank-action-session.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"   \",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"wait\"}}")"
blank_action_player_status="$(curl -sS -o /tmp/rpc-zombie-smoke-blank-action-player.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"   \",\"action\":{\"type\":\"wait\"}}")"
blank_tick_session_status="$(curl -sS -o /tmp/rpc-zombie-smoke-blank-tick-session.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/tick" \
  -H "Content-Type: application/json" \
  -d '{"session":"   "}')" 

servers_payload="$(curl -sS "${BASE_URL}/api/servers")"
create_server_payload="$(curl -sS -X POST "${BASE_URL}/api/servers" -H "Content-Type: application/json" -d '{"name":"Smoke Lobby","maxPlayers":2}')"
server_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["server"]["id"])' <<< "${create_server_payload}")"
join_server_status="$(curl -sS -o /tmp/rpc-zombie-smoke-join-server.json -w "%{http_code}" -X POST "${BASE_URL}/api/servers/${server_id}/join" -H "Content-Type: application/json" -d '{"playerName":"LobbySmoke"}')"
linked_session_id="$(python3 -c 'import json,pathlib; print(json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-join-server.json").read_text())["data"]["sessionId"])')"
missing_join_server_status="$(curl -sS -o /tmp/rpc-zombie-smoke-missing-join-server.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" -H "Content-Type: application/json" -d '{"playerName":"UnknownServerJoin","serverId":"srv-missing"}')"
create_server_two_payload="$(curl -sS -X POST "${BASE_URL}/api/servers" -H "Content-Type: application/json" -d '{"name":"Smoke Lobby Two","maxPlayers":2}')"
server_two_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["server"]["id"])' <<< "${create_server_two_payload}")"
mismatch_join_status="$(curl -sS -o /tmp/rpc-zombie-smoke-session-mismatch.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" -H "Content-Type: application/json" -d "{\"session\":\"${linked_session_id}\",\"serverId\":\"${server_two_id}\",\"playerName\":\"Mismatch\"}")"
invalid_server_join_field_status="$(curl -sS -o /tmp/rpc-zombie-smoke-invalid-server-join-field.json -w "%{http_code}" -X POST "${BASE_URL}/api/servers/${server_id}/join" -H "Content-Type: application/json" -d '{"playerName":123}')"
blank_server_join_player_id_status="$(curl -sS -o /tmp/rpc-zombie-smoke-blank-server-join-player-id.json -w "%{http_code}" -X POST "${BASE_URL}/api/servers/${server_id}/join" -H "Content-Type: application/json" -d '{"playerId":"   ","playerName":"BlankServerJoinId"}')"
invalid_server_description_type_status="$(curl -sS -o /tmp/rpc-zombie-smoke-invalid-server-description-type.json -w "%{http_code}" -X POST "${BASE_URL}/api/servers" -H "Content-Type: application/json" -d '{"name":"InvalidServerDescriptionType","description":123}')"
invalid_server_maxplayers_type_status="$(curl -sS -o /tmp/rpc-zombie-smoke-invalid-server-maxplayers-type.json -w "%{http_code}" -X POST "${BASE_URL}/api/servers" -H "Content-Type: application/json" -d '{"name":"InvalidServerMaxPlayersType","maxPlayers":"4"}')"
missing_server_status="$(curl -sS -o /tmp/rpc-zombie-smoke-missing-server.json -w "%{http_code}" -X POST "${BASE_URL}/api/servers/does-not-exist/join" -H "Content-Type: application/json" -d '{"playerName":"Ghost"}')"

python3 - <<'PY' "${join_payload}" "${servers_payload}" "${action_status}" "${out_of_range_attack_status}" "${bad_direction_status}" "${invalid_join_field_status}" "${blank_session_status}" "${blank_server_id_status}" "${blank_player_id_status}" "${missing_direction_status}" "${invalid_attack_target_status}" "${blank_attack_target_status}" "${fractional_zombie_count_status}" "${invalid_json_status}" "${missing_query_status}" "${blank_state_query_status}" "${missing_state_status}" "${missing_observe_status}" "${blank_observe_player_status}" "${blank_action_session_status}" "${blank_action_player_status}" "${blank_tick_session_status}" "${join_server_status}" "${invalid_server_join_field_status}" "${blank_server_join_player_id_status}" "${missing_server_status}" "${missing_join_server_status}" "${mismatch_join_status}" "${invalid_server_description_type_status}" "${invalid_server_maxplayers_type_status}"
import json
import pathlib
import sys

join_payload = json.loads(sys.argv[1])
servers_payload = json.loads(sys.argv[2])
action_status = int(sys.argv[3])
out_of_range_attack_status = int(sys.argv[4])
bad_direction_status = int(sys.argv[5])
invalid_join_field_status = int(sys.argv[6])
blank_session_status = int(sys.argv[7])
blank_server_id_status = int(sys.argv[8])
blank_player_id_status = int(sys.argv[9])
missing_direction_status = int(sys.argv[10])
invalid_attack_target_status = int(sys.argv[11])
blank_attack_target_status = int(sys.argv[12])
fractional_zombie_count_status = int(sys.argv[13])
invalid_json_status = int(sys.argv[14])
missing_query_status = int(sys.argv[15])
blank_state_query_status = int(sys.argv[16])
missing_state_status = int(sys.argv[17])
missing_observe_status = int(sys.argv[18])
blank_observe_player_status = int(sys.argv[19])
blank_action_session_status = int(sys.argv[20])
blank_action_player_status = int(sys.argv[21])
blank_tick_session_status = int(sys.argv[22])
join_server_status = int(sys.argv[23])
invalid_server_join_field_status = int(sys.argv[24])
blank_server_join_player_id_status = int(sys.argv[25])
missing_server_status = int(sys.argv[26])
missing_join_server_status = int(sys.argv[27])
mismatch_join_status = int(sys.argv[28])
invalid_server_description_type_status = int(sys.argv[29])
invalid_server_maxplayers_type_status = int(sys.argv[30])
missing_server_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-missing-server.json").read_text())
missing_join_server_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-missing-join-server.json").read_text())
mismatch_join_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-session-mismatch.json").read_text())
invalid_json_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-invalid-json.json").read_text())
blank_state_query_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-blank-state-query.json").read_text())
invalid_join_field_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-invalid-join-field.json").read_text())
blank_session_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-blank-session.json").read_text())
blank_server_id_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-blank-server-id.json").read_text())
blank_player_id_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-blank-player-id.json").read_text())
missing_direction_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-missing-direction.json").read_text())
invalid_attack_target_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-invalid-attack-target.json").read_text())
blank_attack_target_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-blank-attack-target.json").read_text())
fractional_zombie_count_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-fractional-zombie-count.json").read_text())
invalid_server_join_field_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-invalid-server-join-field.json").read_text())
blank_server_join_player_id_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-blank-server-join-player-id.json").read_text())
invalid_server_description_type_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-invalid-server-description-type.json").read_text()
)
invalid_server_maxplayers_type_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-invalid-server-maxplayers-type.json").read_text()
)
out_of_range_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-out-of-range-attack.json").read_text())
missing_state_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-missing-state.json").read_text())
missing_observe_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-missing-observe.json").read_text())
blank_observe_player_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-blank-observe-player.json").read_text())
blank_action_session_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-blank-action-session.json").read_text())
blank_action_player_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-blank-action-player.json").read_text())
blank_tick_session_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-blank-tick-session.json").read_text())

assert join_payload["ok"] is True, "join failed"
assert servers_payload["ok"] is True, "server list failed"
assert action_status == 200, f"move action status unexpected: {action_status}"
assert out_of_range_attack_status == 409, f"out-of-range attack should be 409, got {out_of_range_attack_status}"
assert bad_direction_status == 400, f"bad direction should be 400, got {bad_direction_status}"
assert invalid_join_field_status == 400, f"invalid join field should be 400, got {invalid_join_field_status}"
assert blank_session_status == 400, f"blank session should be 400, got {blank_session_status}"
assert blank_server_id_status == 400, f"blank serverId should be 400, got {blank_server_id_status}"
assert blank_player_id_status == 400, f"blank playerId should be 400, got {blank_player_id_status}"
assert missing_direction_status == 400, f"move without direction should be 400, got {missing_direction_status}"
assert invalid_attack_target_status == 400, f"attack with invalid target type should be 400, got {invalid_attack_target_status}"
assert blank_attack_target_status == 400, f"attack with blank targetId should be 400, got {blank_attack_target_status}"
assert fractional_zombie_count_status == 400, f"fractional zombieCount should be 400, got {fractional_zombie_count_status}"
assert invalid_json_status == 400, f"invalid JSON should be 400, got {invalid_json_status}"
assert missing_query_status == 400, f"missing state query should be 400, got {missing_query_status}"
assert blank_state_query_status == 400, f"blank state query should be 400, got {blank_state_query_status}"
assert missing_state_status == 404, f"state missing session should be 404, got {missing_state_status}"
assert missing_observe_status == 404, f"observe missing session should be 404, got {missing_observe_status}"
assert blank_observe_player_status == 400, f"blank observe player should be 400, got {blank_observe_player_status}"
assert blank_action_session_status == 400, f"blank action session should be 400, got {blank_action_session_status}"
assert blank_action_player_status == 400, f"blank action player should be 400, got {blank_action_player_status}"
assert blank_tick_session_status == 400, f"blank tick session should be 400, got {blank_tick_session_status}"
assert join_server_status == 200, f"join server should be 200, got {join_server_status}"
assert invalid_server_join_field_status == 400, f"server join invalid field should be 400, got {invalid_server_join_field_status}"
assert blank_server_join_player_id_status == 400, f"server join blank playerId should be 400, got {blank_server_join_player_id_status}"
assert invalid_server_description_type_status == 400, (
    f"server create with invalid description type should be 400, got {invalid_server_description_type_status}"
)
assert invalid_server_maxplayers_type_status == 400, (
    f"server create with invalid maxPlayers type should be 400, got {invalid_server_maxplayers_type_status}"
)
assert missing_server_status == 404, f"missing server join should be 404, got {missing_server_status}"
assert missing_join_server_status == 404, f"game join with missing server should be 404, got {missing_join_server_status}"
assert mismatch_join_status == 409, f"session/server mismatch should be 409, got {mismatch_join_status}"
assert missing_server_payload["ok"] is False, "missing server payload should be failure"
assert missing_server_payload["error"]["code"] == "SERVER_NOT_FOUND", f"missing server error mismatch: {missing_server_payload['error']['code']}"
assert out_of_range_payload["ok"] is False, "out-of-range attack payload should be failure"
assert out_of_range_payload["error"]["code"] == "TARGET_OUT_OF_RANGE", f"out-of-range attack code mismatch: {out_of_range_payload['error']['code']}"
assert invalid_json_payload["ok"] is False, "invalid JSON payload should be failure"
assert invalid_json_payload["error"]["code"] == "INVALID_JSON", f"invalid JSON code mismatch: {invalid_json_payload['error']['code']}"
assert blank_state_query_payload["ok"] is False, "blank state query payload should be failure"
assert blank_state_query_payload["error"]["code"] == "MISSING_QUERY", f"blank state query code mismatch: {blank_state_query_payload['error']['code']}"
assert invalid_join_field_payload["ok"] is False, "invalid join field payload should be failure"
assert invalid_join_field_payload["error"]["code"] == "INVALID_FIELD", f"invalid join field code mismatch: {invalid_join_field_payload['error']['code']}"
assert blank_session_payload["ok"] is False, "blank session payload should be failure"
assert blank_session_payload["error"]["code"] == "INVALID_FIELD", f"blank session code mismatch: {blank_session_payload['error']['code']}"
assert blank_server_id_payload["ok"] is False, "blank serverId payload should be failure"
assert blank_server_id_payload["error"]["code"] == "INVALID_FIELD", f"blank serverId code mismatch: {blank_server_id_payload['error']['code']}"
assert blank_player_id_payload["ok"] is False, "blank playerId payload should be failure"
assert blank_player_id_payload["error"]["code"] == "INVALID_FIELD", f"blank playerId code mismatch: {blank_player_id_payload['error']['code']}"
assert missing_direction_payload["ok"] is False, "missing direction payload should be failure"
assert missing_direction_payload["error"]["code"] == "INVALID_FIELD", f"missing direction code mismatch: {missing_direction_payload['error']['code']}"
assert invalid_attack_target_payload["ok"] is False, "invalid attack target payload should be failure"
assert invalid_attack_target_payload["error"]["code"] == "INVALID_FIELD", f"invalid attack target code mismatch: {invalid_attack_target_payload['error']['code']}"
assert blank_attack_target_payload["ok"] is False, "blank attack target payload should be failure"
assert blank_attack_target_payload["error"]["code"] == "INVALID_FIELD", f"blank attack target code mismatch: {blank_attack_target_payload['error']['code']}"
assert fractional_zombie_count_payload["ok"] is False, "fractional zombieCount payload should be failure"
assert fractional_zombie_count_payload["error"]["code"] == "INVALID_ZOMBIE_COUNT", f"fractional zombieCount code mismatch: {fractional_zombie_count_payload['error']['code']}"
assert missing_state_payload["ok"] is False, "missing state payload should be failure"
assert missing_state_payload["error"]["code"] == "SESSION_NOT_FOUND", f"missing state error mismatch: {missing_state_payload['error']['code']}"
assert missing_observe_payload["ok"] is False, "missing observe payload should be failure"
assert missing_observe_payload["error"]["code"] == "SESSION_NOT_FOUND", f"missing observe error mismatch: {missing_observe_payload['error']['code']}"
assert blank_observe_player_payload["ok"] is False, "blank observe player payload should be failure"
assert blank_observe_player_payload["error"]["code"] == "INVALID_FIELD", f"blank observe player code mismatch: {blank_observe_player_payload['error']['code']}"
assert blank_action_session_payload["ok"] is False, "blank action session payload should be failure"
assert blank_action_session_payload["error"]["code"] == "INVALID_FIELD", f"blank action session code mismatch: {blank_action_session_payload['error']['code']}"
assert blank_action_player_payload["ok"] is False, "blank action player payload should be failure"
assert blank_action_player_payload["error"]["code"] == "INVALID_FIELD", f"blank action player code mismatch: {blank_action_player_payload['error']['code']}"
assert blank_tick_session_payload["ok"] is False, "blank tick session payload should be failure"
assert blank_tick_session_payload["error"]["code"] == "INVALID_FIELD", f"blank tick session code mismatch: {blank_tick_session_payload['error']['code']}"
assert missing_join_server_payload["ok"] is False, "missing server game join payload should be failure"
assert missing_join_server_payload["error"]["code"] == "SERVER_NOT_FOUND", f"missing game join server error mismatch: {missing_join_server_payload['error']['code']}"
assert invalid_server_join_field_payload["ok"] is False, "invalid server join field payload should be failure"
assert invalid_server_join_field_payload["error"]["code"] == "INVALID_FIELD", f"invalid server join field code mismatch: {invalid_server_join_field_payload['error']['code']}"
assert blank_server_join_player_id_payload["ok"] is False, "blank server join playerId payload should be failure"
assert blank_server_join_player_id_payload["error"]["code"] == "INVALID_FIELD", f"blank server join playerId code mismatch: {blank_server_join_player_id_payload['error']['code']}"
assert invalid_server_description_type_payload["ok"] is False, "invalid server description-type payload should be failure"
assert invalid_server_description_type_payload["error"]["code"] == "INVALID_FIELD", (
    f"invalid server description-type code mismatch: {invalid_server_description_type_payload['error']['code']}"
)
assert invalid_server_maxplayers_type_payload["ok"] is False, "invalid server maxPlayers-type payload should be failure"
assert invalid_server_maxplayers_type_payload["error"]["code"] == "INVALID_FIELD", (
    f"invalid server maxPlayers-type code mismatch: {invalid_server_maxplayers_type_payload['error']['code']}"
)
assert mismatch_join_payload["ok"] is False, "session/server mismatch payload should be failure"
assert mismatch_join_payload["error"]["code"] == "SESSION_SERVER_MISMATCH", f"session/server mismatch error mismatch: {mismatch_join_payload['error']['code']}"

print("api-smoke: PASS")
print(f"session={join_payload['data']['sessionId']}")
print(f"player={join_payload['data']['playerId']}")
print(f"lobby_mode={servers_payload['data']['mode']}")
PY
