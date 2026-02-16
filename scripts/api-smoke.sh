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
unknown_target_attack_status="$(curl -sS -o /tmp/rpc-zombie-smoke-unknown-target-attack.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"attack\",\"targetId\":\"z-missing\"}}")"
unknown_target_shoot_status="$(curl -sS -o /tmp/rpc-zombie-smoke-unknown-target-shoot.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"shoot\",\"targetId\":\"z-missing\"}}")"
shoot_status="$(curl -sS -o /tmp/rpc-zombie-smoke-shoot.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"shoot\",\"direction\":\"up\"}}")"
second_shoot_status="$(curl -sS -o /tmp/rpc-zombie-smoke-second-shoot.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"shoot\",\"direction\":\"right\"}}")"

bad_direction_status="$(curl -sS -o /tmp/rpc-zombie-smoke-bad-direction.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"move\",\"direction\":\"north\"}}")"
invalid_shoot_direction_status="$(curl -sS -o /tmp/rpc-zombie-smoke-invalid-shoot-direction.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"shoot\",\"direction\":\"north\"}}")"
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
turret_no_scrap_status="$(curl -sS -o /tmp/rpc-zombie-smoke-turret-no-scrap.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"build\",\"buildType\":\"turret\",\"direction\":\"right\"}}")"
fractional_zombie_count_status="$(curl -sS -o /tmp/rpc-zombie-smoke-fractional-zombie-count.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerName":"FractionalSmoke","zombieCount":1.5}')"
out_of_range_zombie_count_status="$(curl -sS -o /tmp/rpc-zombie-smoke-out-of-range-zombie-count.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerName":"OutOfRangeZombieCount","zombieCount":33}')"
string_zombie_count_status="$(curl -sS -o /tmp/rpc-zombie-smoke-string-zombie-count.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerName":"StringZombieCount","zombieCount":"4"}')"
invalid_json_status="$(curl -sS -o /tmp/rpc-zombie-smoke-invalid-json.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{invalid-json')"

missing_query_status="$(curl -sS -o /tmp/rpc-zombie-smoke-missing-query.json -w "%{http_code}" "${BASE_URL}/api/game/state")"
blank_state_query_status="$(curl -sS -o /tmp/rpc-zombie-smoke-blank-state-query.json -w "%{http_code}" "${BASE_URL}/api/game/state?session=%20%20%20")"
missing_state_status="$(curl -sS -o /tmp/rpc-zombie-smoke-missing-state.json -w "%{http_code}" "${BASE_URL}/api/game/state?session=missing-session-id")"
missing_observe_status="$(curl -sS -o /tmp/rpc-zombie-smoke-missing-observe.json -w "%{http_code}" "${BASE_URL}/api/game/observe?session=missing-session-id")"
blank_observe_player_status="$(curl -sS -o /tmp/rpc-zombie-smoke-blank-observe-player.json -w "%{http_code}" "${BASE_URL}/api/game/observe?session=${session_id}&player=%20%20%20")"
trimmed_observe_status="$(curl -sS -o /tmp/rpc-zombie-smoke-trimmed-observe.json -w "%{http_code}" "${BASE_URL}/api/game/observe?session=${session_id}&player=%20${player_id}%20")"
observe_alias_status="$(curl -sS -o /tmp/rpc-zombie-smoke-observe-alias.json -w "%{http_code}" "${BASE_URL}/api/game/observe?session=${session_id}&player=${player_id}")"
blank_action_session_status="$(curl -sS -o /tmp/rpc-zombie-smoke-blank-action-session.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"   \",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"wait\"}}")"
blank_action_player_status="$(curl -sS -o /tmp/rpc-zombie-smoke-blank-action-player.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"   \",\"action\":{\"type\":\"wait\"}}")"
unknown_action_player_status="$(curl -sS -o /tmp/rpc-zombie-smoke-unknown-action-player.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"ghost-player\",\"action\":{\"type\":\"wait\"}}")"
blank_tick_session_status="$(curl -sS -o /tmp/rpc-zombie-smoke-blank-tick-session.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/tick" \
  -H "Content-Type: application/json" \
  -d '{"session":"   "}')" 
unknown_action_session_status="$(curl -sS -o /tmp/rpc-zombie-smoke-unknown-action-session.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d '{"session":"missing-session-id","playerId":"ghost-player","action":{"type":"wait"}}')"
unknown_tick_session_status="$(curl -sS -o /tmp/rpc-zombie-smoke-unknown-tick-session.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/tick" \
  -H "Content-Type: application/json" \
  -d '{"session":"missing-session-id"}')"
trimmed_action_status="$(curl -sS -o /tmp/rpc-zombie-smoke-trimmed-action.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"  ${session_id}  \",\"playerId\":\"  ${player_id}  \",\"action\":{\"type\":\"wait\"}}")"
trimmed_tick_status="$(curl -sS -o /tmp/rpc-zombie-smoke-trimmed-tick.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/tick" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"  ${session_id}  \"}")"

servers_payload="$(curl -sS "${BASE_URL}/api/servers")"
create_server_payload="$(curl -sS -X POST "${BASE_URL}/api/servers" -H "Content-Type: application/json" -d '{"name":"Smoke Lobby","maxPlayers":4}')"
server_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["server"]["id"])' <<< "${create_server_payload}")"
trimmed_serverid_game_join_status="$(curl -sS -o /tmp/rpc-zombie-smoke-trimmed-serverid-game-join.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" -H "Content-Type: application/json" -d "{\"serverId\":\"  ${server_id}  \",\"playerName\":\"TrimmedServerIdJoin\"}")"
join_server_status="$(curl -sS -o /tmp/rpc-zombie-smoke-join-server.json -w "%{http_code}" -X POST "${BASE_URL}/api/servers/${server_id}/join" -H "Content-Type: application/json" -d '{"playerName":"LobbySmoke"}')"
trimmed_route_server_join_status="$(curl -sS -o /tmp/rpc-zombie-smoke-trimmed-route-server-join.json -w "%{http_code}" -X POST "${BASE_URL}/api/servers/%20${server_id}%20/join" -H "Content-Type: application/json" -d '{"playerName":"TrimmedRouteLobbySmoke"}')"
blank_route_server_join_status="$(curl -sS -o /tmp/rpc-zombie-smoke-blank-route-server-join.json -w "%{http_code}" -X POST "${BASE_URL}/api/servers/%20%20%20/join" -H "Content-Type: application/json" -d '{"playerName":"BlankRouteJoin"}')"
linked_session_id="$(python3 -c 'import json,pathlib; print(json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-join-server.json").read_text())["data"]["sessionId"])')"
blank_name_join_status="$(curl -sS -o /tmp/rpc-zombie-smoke-blank-name-join.json -w "%{http_code}" -X POST "${BASE_URL}/api/servers/${server_id}/join" -H "Content-Type: application/json" -d '{"playerName":"   "}')" 
trimmed_session_join_status="$(curl -sS -o /tmp/rpc-zombie-smoke-trimmed-session-join.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" -H "Content-Type: application/json" -d "{\"session\":\"  ${session_id}  \",\"playerName\":\"TrimmedJoinSmoke\"}")"
missing_join_server_status="$(curl -sS -o /tmp/rpc-zombie-smoke-missing-join-server.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" -H "Content-Type: application/json" -d '{"playerName":"UnknownServerJoin","serverId":"srv-missing"}')"
create_server_two_payload="$(curl -sS -X POST "${BASE_URL}/api/servers" -H "Content-Type: application/json" -d '{"name":"Smoke Lobby Two","maxPlayers":2}')"
server_two_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["server"]["id"])' <<< "${create_server_two_payload}")"
mismatch_join_status="$(curl -sS -o /tmp/rpc-zombie-smoke-session-mismatch.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" -H "Content-Type: application/json" -d "{\"session\":\"${linked_session_id}\",\"serverId\":\"${server_two_id}\",\"playerName\":\"Mismatch\"}")"
invalid_server_join_field_status="$(curl -sS -o /tmp/rpc-zombie-smoke-invalid-server-join-field.json -w "%{http_code}" -X POST "${BASE_URL}/api/servers/${server_id}/join" -H "Content-Type: application/json" -d '{"playerName":123}')"
blank_server_join_player_id_status="$(curl -sS -o /tmp/rpc-zombie-smoke-blank-server-join-player-id.json -w "%{http_code}" -X POST "${BASE_URL}/api/servers/${server_id}/join" -H "Content-Type: application/json" -d '{"playerId":"   ","playerName":"BlankServerJoinId"}')"
invalid_server_description_type_status="$(curl -sS -o /tmp/rpc-zombie-smoke-invalid-server-description-type.json -w "%{http_code}" -X POST "${BASE_URL}/api/servers" -H "Content-Type: application/json" -d '{"name":"InvalidServerDescriptionType","description":123}')"
invalid_server_maxplayers_type_status="$(curl -sS -o /tmp/rpc-zombie-smoke-invalid-server-maxplayers-type.json -w "%{http_code}" -X POST "${BASE_URL}/api/servers" -H "Content-Type: application/json" -d '{"name":"InvalidServerMaxPlayersType","maxPlayers":"4"}')"
invalid_server_maxplayers_low_status="$(curl -sS -o /tmp/rpc-zombie-smoke-invalid-server-maxplayers-low.json -w "%{http_code}" -X POST "${BASE_URL}/api/servers" -H "Content-Type: application/json" -d '{"name":"InvalidServerMaxPlayersLow","maxPlayers":0}')"
invalid_server_maxplayers_high_status="$(curl -sS -o /tmp/rpc-zombie-smoke-invalid-server-maxplayers-high.json -w "%{http_code}" -X POST "${BASE_URL}/api/servers" -H "Content-Type: application/json" -d '{"name":"InvalidServerMaxPlayersHigh","maxPlayers":33}')"
invalid_server_maxplayers_fractional_status="$(curl -sS -o /tmp/rpc-zombie-smoke-invalid-server-maxplayers-fractional.json -w "%{http_code}" -X POST "${BASE_URL}/api/servers" -H "Content-Type: application/json" -d '{"name":"InvalidServerMaxPlayersFractional","maxPlayers":2.5}')"
duplicate_server_payload="$(curl -sS -X POST "${BASE_URL}/api/servers" -H "Content-Type: application/json" -d '{"name":"Duplicate Smoke Lobby","maxPlayers":3}')"
duplicate_server_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["server"]["id"])' <<< "${duplicate_server_payload}")"
duplicate_join_one_status="$(curl -sS -o /tmp/rpc-zombie-smoke-duplicate-join-one.json -w "%{http_code}" -X POST "${BASE_URL}/api/servers/${duplicate_server_id}/join" -H "Content-Type: application/json" -d '{"playerId":"dupe-smoke","playerName":"DupeA"}')"
duplicate_join_two_status="$(curl -sS -o /tmp/rpc-zombie-smoke-duplicate-join-two.json -w "%{http_code}" -X POST "${BASE_URL}/api/servers/${duplicate_server_id}/join" -H "Content-Type: application/json" -d '{"playerId":"dupe-smoke","playerName":"DupeB"}')"
missing_server_status="$(curl -sS -o /tmp/rpc-zombie-smoke-missing-server.json -w "%{http_code}" -X POST "${BASE_URL}/api/servers/does-not-exist/join" -H "Content-Type: application/json" -d '{"playerName":"Ghost"}')"

python3 - <<'PY' "${join_payload}" "${servers_payload}" "${action_status}" "${shoot_status}" "${out_of_range_attack_status}" "${bad_direction_status}" "${invalid_join_field_status}" "${blank_session_status}" "${blank_server_id_status}" "${blank_player_id_status}" "${missing_direction_status}" "${invalid_attack_target_status}" "${blank_attack_target_status}" "${turret_no_scrap_status}" "${fractional_zombie_count_status}" "${invalid_json_status}" "${missing_query_status}" "${blank_state_query_status}" "${missing_state_status}" "${missing_observe_status}" "${blank_observe_player_status}" "${trimmed_observe_status}" "${observe_alias_status}" "${blank_action_session_status}" "${blank_action_player_status}" "${blank_tick_session_status}" "${unknown_action_session_status}" "${unknown_tick_session_status}" "${trimmed_action_status}" "${trimmed_tick_status}" "${trimmed_serverid_game_join_status}" "${join_server_status}" "${blank_name_join_status}" "${trimmed_session_join_status}" "${invalid_server_join_field_status}" "${blank_server_join_player_id_status}" "${missing_server_status}" "${missing_join_server_status}" "${mismatch_join_status}" "${invalid_server_description_type_status}" "${invalid_server_maxplayers_type_status}" "${duplicate_join_one_status}" "${duplicate_join_two_status}" "${out_of_range_zombie_count_status}" "${string_zombie_count_status}" "${invalid_server_maxplayers_low_status}" "${invalid_server_maxplayers_high_status}" "${invalid_server_maxplayers_fractional_status}" "${trimmed_route_server_join_status}" "${blank_route_server_join_status}" "${unknown_action_player_status}" "${unknown_target_attack_status}" "${second_shoot_status}" "${invalid_shoot_direction_status}" "${unknown_target_shoot_status}"
import json
import pathlib
import sys

join_payload = json.loads(sys.argv[1])
servers_payload = json.loads(sys.argv[2])
action_status = int(sys.argv[3])
shoot_status = int(sys.argv[4])
out_of_range_attack_status = int(sys.argv[5])
bad_direction_status = int(sys.argv[6])
invalid_join_field_status = int(sys.argv[7])
blank_session_status = int(sys.argv[8])
blank_server_id_status = int(sys.argv[9])
blank_player_id_status = int(sys.argv[10])
missing_direction_status = int(sys.argv[11])
invalid_attack_target_status = int(sys.argv[12])
blank_attack_target_status = int(sys.argv[13])
turret_no_scrap_status = int(sys.argv[14])
fractional_zombie_count_status = int(sys.argv[15])
invalid_json_status = int(sys.argv[16])
missing_query_status = int(sys.argv[17])
blank_state_query_status = int(sys.argv[18])
missing_state_status = int(sys.argv[19])
missing_observe_status = int(sys.argv[20])
blank_observe_player_status = int(sys.argv[21])
trimmed_observe_status = int(sys.argv[22])
observe_alias_status = int(sys.argv[23])
blank_action_session_status = int(sys.argv[24])
blank_action_player_status = int(sys.argv[25])
blank_tick_session_status = int(sys.argv[26])
unknown_action_session_status = int(sys.argv[27])
unknown_tick_session_status = int(sys.argv[28])
trimmed_action_status = int(sys.argv[29])
trimmed_tick_status = int(sys.argv[30])
trimmed_serverid_game_join_status = int(sys.argv[31])
join_server_status = int(sys.argv[32])
blank_name_join_status = int(sys.argv[33])
trimmed_session_join_status = int(sys.argv[34])
invalid_server_join_field_status = int(sys.argv[35])
blank_server_join_player_id_status = int(sys.argv[36])
missing_server_status = int(sys.argv[37])
missing_join_server_status = int(sys.argv[38])
mismatch_join_status = int(sys.argv[39])
invalid_server_description_type_status = int(sys.argv[40])
invalid_server_maxplayers_type_status = int(sys.argv[41])
duplicate_join_one_status = int(sys.argv[42])
duplicate_join_two_status = int(sys.argv[43])
out_of_range_zombie_count_status = int(sys.argv[44])
string_zombie_count_status = int(sys.argv[45])
invalid_server_maxplayers_low_status = int(sys.argv[46])
invalid_server_maxplayers_high_status = int(sys.argv[47])
invalid_server_maxplayers_fractional_status = int(sys.argv[48])
trimmed_route_server_join_status = int(sys.argv[49])
blank_route_server_join_status = int(sys.argv[50])
unknown_action_player_status = int(sys.argv[51])
unknown_target_attack_status = int(sys.argv[52])
second_shoot_status = int(sys.argv[53])
invalid_shoot_direction_status = int(sys.argv[54])
unknown_target_shoot_status = int(sys.argv[55])
missing_server_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-missing-server.json").read_text())
join_server_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-join-server.json").read_text())
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
out_of_range_zombie_count_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-out-of-range-zombie-count.json").read_text())
string_zombie_count_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-string-zombie-count.json").read_text())
invalid_server_join_field_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-invalid-server-join-field.json").read_text())
blank_server_join_player_id_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-blank-server-join-player-id.json").read_text())
blank_name_join_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-blank-name-join.json").read_text())
invalid_server_description_type_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-invalid-server-description-type.json").read_text()
)
invalid_server_maxplayers_type_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-invalid-server-maxplayers-type.json").read_text()
)
invalid_server_maxplayers_low_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-invalid-server-maxplayers-low.json").read_text()
)
invalid_server_maxplayers_high_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-invalid-server-maxplayers-high.json").read_text()
)
invalid_server_maxplayers_fractional_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-invalid-server-maxplayers-fractional.json").read_text()
)
trimmed_route_server_join_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-trimmed-route-server-join.json").read_text())
blank_route_server_join_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-blank-route-server-join.json").read_text())
duplicate_join_one_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-duplicate-join-one.json").read_text())
duplicate_join_two_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-duplicate-join-two.json").read_text())
action_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-action.json").read_text())
shoot_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-shoot.json").read_text())
second_shoot_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-second-shoot.json").read_text())
invalid_shoot_direction_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-invalid-shoot-direction.json").read_text())
unknown_target_shoot_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-unknown-target-shoot.json").read_text())
out_of_range_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-out-of-range-attack.json").read_text())
unknown_target_attack_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-unknown-target-attack.json").read_text())
missing_state_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-missing-state.json").read_text())
missing_observe_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-missing-observe.json").read_text())
blank_observe_player_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-blank-observe-player.json").read_text())
trimmed_observe_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-trimmed-observe.json").read_text())
observe_alias_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-observe-alias.json").read_text())
blank_action_session_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-blank-action-session.json").read_text())
blank_action_player_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-blank-action-player.json").read_text())
unknown_action_player_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-unknown-action-player.json").read_text())
blank_tick_session_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-blank-tick-session.json").read_text())
unknown_action_session_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-unknown-action-session.json").read_text())
unknown_tick_session_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-unknown-tick-session.json").read_text())
trimmed_action_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-trimmed-action.json").read_text())
trimmed_tick_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-trimmed-tick.json").read_text())
trimmed_serverid_game_join_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-trimmed-serverid-game-join.json").read_text())
trimmed_session_join_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-trimmed-session-join.json").read_text())

assert join_payload["ok"] is True, "join failed"
assert servers_payload["ok"] is True, "server list failed"
assert action_status == 200, f"move action status unexpected: {action_status}"
assert action_payload["ok"] is True, "move action payload should be success"
action_zombie_ids = [entity["id"] for entity in action_payload["data"]["observation"]["zombies"]]
action_terminator_ids = [entity["id"] for entity in action_payload["data"]["observation"]["terminators"]]
assert action_terminator_ids == action_zombie_ids, (
    f"action observation alias mismatch: zombies={action_zombie_ids} terminators={action_terminator_ids}"
)
assert shoot_status == 200, f"shoot action status unexpected: {shoot_status}"
assert shoot_payload["ok"] is True, "shoot action payload should be success"
assert shoot_payload["data"]["state"]["players"][join_payload["data"]["playerId"]]["facing"] == "up", (
    f"shoot facing update mismatch: {shoot_payload['data']['state']['players'][join_payload['data']['playerId']]['facing']}"
)
assert second_shoot_status == 409, f"second shoot action should be 409, got {second_shoot_status}"
assert invalid_shoot_direction_status == 400, (
    f"shoot with invalid direction should be 400, got {invalid_shoot_direction_status}"
)
assert unknown_target_shoot_status == 404, (
    f"shoot with unknown explicit target should be 404, got {unknown_target_shoot_status}"
)
assert out_of_range_attack_status == 409, f"out-of-range attack should be 409, got {out_of_range_attack_status}"
assert unknown_target_attack_status == 404, f"unknown target attack should be 404, got {unknown_target_attack_status}"
assert bad_direction_status == 400, f"bad direction should be 400, got {bad_direction_status}"
assert invalid_join_field_status == 400, f"invalid join field should be 400, got {invalid_join_field_status}"
assert blank_session_status == 400, f"blank session should be 400, got {blank_session_status}"
assert blank_server_id_status == 400, f"blank serverId should be 400, got {blank_server_id_status}"
assert blank_player_id_status == 400, f"blank playerId should be 400, got {blank_player_id_status}"
assert missing_direction_status == 400, f"move without direction should be 400, got {missing_direction_status}"
assert invalid_attack_target_status == 400, f"attack with invalid target type should be 400, got {invalid_attack_target_status}"
assert blank_attack_target_status == 400, f"attack with blank targetId should be 400, got {blank_attack_target_status}"
assert turret_no_scrap_status == 409, f"turret build without scrap should be 409, got {turret_no_scrap_status}"
assert fractional_zombie_count_status == 400, f"fractional zombieCount should be 400, got {fractional_zombie_count_status}"
assert out_of_range_zombie_count_status == 400, (
    f"out-of-range zombieCount should be 400, got {out_of_range_zombie_count_status}"
)
assert string_zombie_count_status == 400, f"string zombieCount should be 400, got {string_zombie_count_status}"
assert invalid_json_status == 400, f"invalid JSON should be 400, got {invalid_json_status}"
assert missing_query_status == 400, f"missing state query should be 400, got {missing_query_status}"
assert blank_state_query_status == 400, f"blank state query should be 400, got {blank_state_query_status}"
assert missing_state_status == 404, f"state missing session should be 404, got {missing_state_status}"
assert missing_observe_status == 404, f"observe missing session should be 404, got {missing_observe_status}"
assert blank_observe_player_status == 400, f"blank observe player should be 400, got {blank_observe_player_status}"
assert trimmed_observe_status == 200, f"trimmed observe player should be 200, got {trimmed_observe_status}"
assert observe_alias_status == 200, f"observe alias check should be 200, got {observe_alias_status}"
assert blank_action_session_status == 400, f"blank action session should be 400, got {blank_action_session_status}"
assert blank_action_player_status == 400, f"blank action player should be 400, got {blank_action_player_status}"
assert unknown_action_player_status == 404, f"unknown action player should be 404, got {unknown_action_player_status}"
assert blank_tick_session_status == 400, f"blank tick session should be 400, got {blank_tick_session_status}"
assert unknown_action_session_status == 404, f"unknown action session should be 404, got {unknown_action_session_status}"
assert unknown_tick_session_status == 404, f"unknown tick session should be 404, got {unknown_tick_session_status}"
assert trimmed_action_status == 200, f"trimmed action should be 200, got {trimmed_action_status}"
assert trimmed_tick_status == 200, f"trimmed tick should be 200, got {trimmed_tick_status}"
assert trimmed_serverid_game_join_status == 201, (
    f"trimmed serverId game join should be 201, got {trimmed_serverid_game_join_status}"
)
assert join_server_status == 200, f"join server should be 200, got {join_server_status}"
assert trimmed_route_server_join_status == 200, (
    f"trimmed route server join should be 200, got {trimmed_route_server_join_status}"
)
assert blank_route_server_join_status == 400, (
    f"blank route server join should be 400, got {blank_route_server_join_status}"
)
assert blank_name_join_status == 200, f"blank-name server join should be 200, got {blank_name_join_status}"
assert trimmed_session_join_status == 200, f"trimmed session join should be 200, got {trimmed_session_join_status}"
assert invalid_server_join_field_status == 400, f"server join invalid field should be 400, got {invalid_server_join_field_status}"
assert blank_server_join_player_id_status == 400, f"server join blank playerId should be 400, got {blank_server_join_player_id_status}"
assert invalid_server_description_type_status == 400, (
    f"server create with invalid description type should be 400, got {invalid_server_description_type_status}"
)
assert invalid_server_maxplayers_type_status == 400, (
    f"server create with invalid maxPlayers type should be 400, got {invalid_server_maxplayers_type_status}"
)
assert invalid_server_maxplayers_low_status == 400, (
    f"server create with low maxPlayers should be 400, got {invalid_server_maxplayers_low_status}"
)
assert invalid_server_maxplayers_high_status == 400, (
    f"server create with high maxPlayers should be 400, got {invalid_server_maxplayers_high_status}"
)
assert invalid_server_maxplayers_fractional_status == 400, (
    f"server create with fractional maxPlayers should be 400, got {invalid_server_maxplayers_fractional_status}"
)
assert duplicate_join_one_status == 200, f"duplicate join first attempt should be 200, got {duplicate_join_one_status}"
assert duplicate_join_two_status == 409, f"duplicate join second attempt should be 409, got {duplicate_join_two_status}"
assert missing_server_status == 404, f"missing server join should be 404, got {missing_server_status}"
assert missing_join_server_status == 404, f"game join with missing server should be 404, got {missing_join_server_status}"
assert mismatch_join_status == 409, f"session/server mismatch should be 409, got {mismatch_join_status}"
assert missing_server_payload["ok"] is False, "missing server payload should be failure"
assert missing_server_payload["error"]["code"] == "SERVER_NOT_FOUND", f"missing server error mismatch: {missing_server_payload['error']['code']}"
assert out_of_range_payload["ok"] is False, "out-of-range attack payload should be failure"
assert out_of_range_payload["error"]["code"] == "TARGET_OUT_OF_RANGE", f"out-of-range attack code mismatch: {out_of_range_payload['error']['code']}"
assert unknown_target_attack_payload["ok"] is False, "unknown target attack payload should be failure"
assert unknown_target_attack_payload["error"]["code"] == "TARGET_NOT_FOUND", (
    f"unknown target attack code mismatch: {unknown_target_attack_payload['error']['code']}"
)
assert second_shoot_payload["ok"] is False, "second shoot payload should be failure"
assert second_shoot_payload["error"]["code"] == "ATTACK_COOLDOWN", (
    f"second shoot error code mismatch: {second_shoot_payload['error']['code']}"
)
assert invalid_shoot_direction_payload["ok"] is False, "invalid shoot direction payload should be failure"
assert invalid_shoot_direction_payload["error"]["code"] == "INVALID_DIRECTION", (
    f"invalid shoot direction code mismatch: {invalid_shoot_direction_payload['error']['code']}"
)
assert unknown_target_shoot_payload["ok"] is False, "unknown target shoot payload should be failure"
assert unknown_target_shoot_payload["error"]["code"] == "TARGET_NOT_FOUND", (
    f"unknown target shoot code mismatch: {unknown_target_shoot_payload['error']['code']}"
)
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
assert out_of_range_zombie_count_payload["ok"] is False, "out-of-range zombieCount payload should be failure"
assert out_of_range_zombie_count_payload["error"]["code"] == "INVALID_ZOMBIE_COUNT", (
    f"out-of-range zombieCount code mismatch: {out_of_range_zombie_count_payload['error']['code']}"
)
assert string_zombie_count_payload["ok"] is False, "string zombieCount payload should be failure"
assert string_zombie_count_payload["error"]["code"] == "INVALID_FIELD", (
    f"string zombieCount code mismatch: {string_zombie_count_payload['error']['code']}"
)
assert missing_state_payload["ok"] is False, "missing state payload should be failure"
assert missing_state_payload["error"]["code"] == "SESSION_NOT_FOUND", f"missing state error mismatch: {missing_state_payload['error']['code']}"
assert missing_observe_payload["ok"] is False, "missing observe payload should be failure"
assert missing_observe_payload["error"]["code"] == "SESSION_NOT_FOUND", f"missing observe error mismatch: {missing_observe_payload['error']['code']}"
assert blank_observe_player_payload["ok"] is False, "blank observe player payload should be failure"
assert blank_observe_player_payload["error"]["code"] == "INVALID_FIELD", f"blank observe player code mismatch: {blank_observe_player_payload['error']['code']}"
assert trimmed_observe_payload["ok"] is True, "trimmed observe payload should be success"
assert trimmed_observe_payload["data"]["playerId"] == join_payload["data"]["playerId"], (
    f"trimmed observe playerId mismatch: {trimmed_observe_payload['data']['playerId']}"
)
assert observe_alias_payload["ok"] is True, "observe alias payload should be success"
zombie_ids = [entity["id"] for entity in observe_alias_payload["data"]["observation"]["zombies"]]
terminator_ids = [entity["id"] for entity in observe_alias_payload["data"]["observation"]["terminators"]]
assert terminator_ids == zombie_ids, f"terminator alias mismatch: zombies={zombie_ids} terminators={terminator_ids}"
assert blank_action_session_payload["ok"] is False, "blank action session payload should be failure"
assert blank_action_session_payload["error"]["code"] == "INVALID_FIELD", f"blank action session code mismatch: {blank_action_session_payload['error']['code']}"
assert blank_action_player_payload["ok"] is False, "blank action player payload should be failure"
assert blank_action_player_payload["error"]["code"] == "INVALID_FIELD", f"blank action player code mismatch: {blank_action_player_payload['error']['code']}"
assert unknown_action_player_payload["ok"] is False, "unknown action player payload should be failure"
assert unknown_action_player_payload["error"]["code"] == "PLAYER_NOT_FOUND", (
    f"unknown action player code mismatch: {unknown_action_player_payload['error']['code']}"
)
assert blank_tick_session_payload["ok"] is False, "blank tick session payload should be failure"
assert blank_tick_session_payload["error"]["code"] == "INVALID_FIELD", f"blank tick session code mismatch: {blank_tick_session_payload['error']['code']}"
assert unknown_action_session_payload["ok"] is False, "unknown action session payload should be failure"
assert unknown_action_session_payload["error"]["code"] == "SESSION_NOT_FOUND", (
    f"unknown action session code mismatch: {unknown_action_session_payload['error']['code']}"
)
assert unknown_tick_session_payload["ok"] is False, "unknown tick session payload should be failure"
assert unknown_tick_session_payload["error"]["code"] == "SESSION_NOT_FOUND", (
    f"unknown tick session code mismatch: {unknown_tick_session_payload['error']['code']}"
)
assert trimmed_action_payload["ok"] is True, "trimmed action payload should be success"
assert trimmed_action_payload["data"]["sessionId"] == join_payload["data"]["sessionId"], (
    f"trimmed action sessionId mismatch: {trimmed_action_payload['data']['sessionId']}"
)
assert trimmed_action_payload["data"]["playerId"] == join_payload["data"]["playerId"], (
    f"trimmed action playerId mismatch: {trimmed_action_payload['data']['playerId']}"
)
assert trimmed_tick_payload["ok"] is True, "trimmed tick payload should be success"
assert trimmed_tick_payload["data"]["sessionId"] == join_payload["data"]["sessionId"], (
    f"trimmed tick sessionId mismatch: {trimmed_tick_payload['data']['sessionId']}"
)
assert trimmed_serverid_game_join_payload["ok"] is True, "trimmed serverId game join payload should be success"
assert trimmed_serverid_game_join_payload["data"]["state"]["serverId"] == join_server_payload["data"]["server"]["id"], (
    f"trimmed serverId game join serverId mismatch: {trimmed_serverid_game_join_payload['data']['state']['serverId']}"
)
assert trimmed_route_server_join_payload["ok"] is True, "trimmed route server join payload should be success"
assert trimmed_route_server_join_payload["data"]["server"]["id"] == join_server_payload["data"]["server"]["id"], (
    f"trimmed route server join id mismatch: {trimmed_route_server_join_payload['data']['server']['id']}"
)
assert blank_route_server_join_payload["ok"] is False, "blank route server join payload should be failure"
assert blank_route_server_join_payload["error"]["code"] == "MISSING_SERVER_ID", (
    f"blank route server join code mismatch: {blank_route_server_join_payload['error']['code']}"
)
assert missing_join_server_payload["ok"] is False, "missing server game join payload should be failure"
assert missing_join_server_payload["error"]["code"] == "SERVER_NOT_FOUND", f"missing game join server error mismatch: {missing_join_server_payload['error']['code']}"
assert invalid_server_join_field_payload["ok"] is False, "invalid server join field payload should be failure"
assert invalid_server_join_field_payload["error"]["code"] == "INVALID_FIELD", f"invalid server join field code mismatch: {invalid_server_join_field_payload['error']['code']}"
assert blank_server_join_player_id_payload["ok"] is False, "blank server join playerId payload should be failure"
assert blank_server_join_player_id_payload["error"]["code"] == "INVALID_FIELD", f"blank server join playerId code mismatch: {blank_server_join_player_id_payload['error']['code']}"
assert blank_name_join_payload["ok"] is True, "blank-name server join payload should be success"
assert blank_name_join_payload["data"]["playerName"].startswith("Survivor-"), (
    f"blank-name join fallback mismatch: {blank_name_join_payload['data']['playerName']}"
)
assert trimmed_session_join_payload["ok"] is True, "trimmed session join payload should be success"
assert trimmed_session_join_payload["data"]["sessionId"] == join_payload["data"]["sessionId"], (
    f"trimmed session join sessionId mismatch: {trimmed_session_join_payload['data']['sessionId']}"
)
assert invalid_server_description_type_payload["ok"] is False, "invalid server description-type payload should be failure"
assert invalid_server_description_type_payload["error"]["code"] == "INVALID_FIELD", (
    f"invalid server description-type code mismatch: {invalid_server_description_type_payload['error']['code']}"
)
assert invalid_server_maxplayers_type_payload["ok"] is False, "invalid server maxPlayers-type payload should be failure"
assert invalid_server_maxplayers_type_payload["error"]["code"] == "INVALID_FIELD", (
    f"invalid server maxPlayers-type code mismatch: {invalid_server_maxplayers_type_payload['error']['code']}"
)
assert invalid_server_maxplayers_low_payload["ok"] is False, "invalid server maxPlayers low payload should be failure"
assert invalid_server_maxplayers_low_payload["error"]["code"] == "INVALID_MAX_PLAYERS", (
    f"invalid server maxPlayers low code mismatch: {invalid_server_maxplayers_low_payload['error']['code']}"
)
assert invalid_server_maxplayers_high_payload["ok"] is False, "invalid server maxPlayers high payload should be failure"
assert invalid_server_maxplayers_high_payload["error"]["code"] == "INVALID_MAX_PLAYERS", (
    f"invalid server maxPlayers high code mismatch: {invalid_server_maxplayers_high_payload['error']['code']}"
)
assert invalid_server_maxplayers_fractional_payload["ok"] is False, (
    "invalid server maxPlayers fractional payload should be failure"
)
assert invalid_server_maxplayers_fractional_payload["error"]["code"] == "INVALID_MAX_PLAYERS", (
    f"invalid server maxPlayers fractional code mismatch: {invalid_server_maxplayers_fractional_payload['error']['code']}"
)
assert duplicate_join_one_payload["ok"] is True, "first duplicate-join payload should be success"
assert duplicate_join_two_payload["ok"] is False, "second duplicate-join payload should be failure"
assert duplicate_join_two_payload["error"]["code"] == "PLAYER_EXISTS", (
    f"duplicate-join error code mismatch: {duplicate_join_two_payload['error']['code']}"
)
assert mismatch_join_payload["ok"] is False, "session/server mismatch payload should be failure"
assert mismatch_join_payload["error"]["code"] == "SESSION_SERVER_MISMATCH", f"session/server mismatch error mismatch: {mismatch_join_payload['error']['code']}"

print("api-smoke: PASS")
print(f"session={join_payload['data']['sessionId']}")
print(f"player={join_payload['data']['playerId']}")
print(f"lobby_mode={servers_payload['data']['mode']}")
PY
