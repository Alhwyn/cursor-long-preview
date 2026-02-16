#!/usr/bin/env bash

set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:3000}"

join_payload="$(curl -sS -X POST "${BASE_URL}/api/game/join" -H "Content-Type: application/json" -d '{"playerName":"SmokeRunner"}')"
session_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["sessionId"])' <<< "${join_payload}")"
player_id="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["data"]["playerId"])' <<< "${join_payload}")"
terminator_count_join_status="$(curl -sS -o /tmp/rpc-zombie-smoke-terminator-count-join.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerName":"TerminatorCountSmoke","terminatorCount":32}')"
legacy_zombie_count_join_status="$(curl -sS -o /tmp/rpc-zombie-smoke-legacy-zombie-count-join.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerName":"LegacyZombieCountSmoke","zombieCount":1}')"
mismatched_count_join_status="$(curl -sS -o /tmp/rpc-zombie-smoke-mismatched-count-join.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerName":"MismatchedCountsSmoke","zombieCount":2,"terminatorCount":3}')"
boundary_mismatched_count_join_status="$(curl -sS -o /tmp/rpc-zombie-smoke-boundary-mismatched-count-join.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerName":"BoundaryMismatchedCountsSmoke","zombieCount":1,"terminatorCount":32}')"
reversed_boundary_mismatched_count_join_status="$(curl -sS -o /tmp/rpc-zombie-smoke-reversed-boundary-mismatched-count-join.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerName":"ReversedBoundaryMismatchedCountsSmoke","zombieCount":32,"terminatorCount":1}')"
matching_count_join_status="$(curl -sS -o /tmp/rpc-zombie-smoke-matching-count-join.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerName":"MatchingCountsSmoke","zombieCount":3,"terminatorCount":3}')"
boundary_min_matching_count_join_status="$(curl -sS -o /tmp/rpc-zombie-smoke-boundary-min-matching-count-join.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerName":"BoundaryMinMatchingCountsSmoke","zombieCount":1,"terminatorCount":1}')"
boundary_max_matching_count_join_status="$(curl -sS -o /tmp/rpc-zombie-smoke-boundary-max-matching-count-join.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerName":"BoundaryMaxMatchingCountsSmoke","zombieCount":32,"terminatorCount":32}')"
invalid_zombiecount_with_valid_terminatorcount_status="$(curl -sS -o /tmp/rpc-zombie-smoke-invalid-zombiecount-with-valid-terminatorcount.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerName":"InvalidZombieCountWithValidTerminatorCountSmoke","zombieCount":"4","terminatorCount":4}')"
invalid_terminatorcount_with_valid_zombiecount_status="$(curl -sS -o /tmp/rpc-zombie-smoke-invalid-terminatorcount-with-valid-zombiecount.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerName":"InvalidTerminatorCountWithValidZombieCountSmoke","zombieCount":4,"terminatorCount":"4"}')"
fractional_terminator_count_join_status="$(curl -sS -o /tmp/rpc-zombie-smoke-fractional-terminator-count-join.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerName":"FractionalTerminatorCountSmoke","terminatorCount":1.5}')"
fractional_terminatorcount_with_valid_zombiecount_status="$(curl -sS -o /tmp/rpc-zombie-smoke-fractional-terminatorcount-with-valid-zombiecount-join.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerName":"FractionalTerminatorCountWithValidZombieCountSmoke","zombieCount":4,"terminatorCount":1.5}')"
fractional_zombiecount_with_valid_terminatorcount_status="$(curl -sS -o /tmp/rpc-zombie-smoke-fractional-zombiecount-with-valid-terminatorcount-join.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerName":"FractionalZombieCountWithValidTerminatorCountSmoke","zombieCount":1.5,"terminatorCount":4}')"
low_terminatorcount_with_valid_zombiecount_status="$(curl -sS -o /tmp/rpc-zombie-smoke-low-terminatorcount-with-valid-zombiecount-join.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerName":"LowTerminatorCountWithValidZombieCountSmoke","zombieCount":4,"terminatorCount":0}')"
low_zombiecount_with_valid_terminatorcount_status="$(curl -sS -o /tmp/rpc-zombie-smoke-low-zombiecount-with-valid-terminatorcount-join.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerName":"LowZombieCountWithValidTerminatorCountSmoke","zombieCount":0,"terminatorCount":4}')"
negative_terminatorcount_with_valid_zombiecount_status="$(curl -sS -o /tmp/rpc-zombie-smoke-negative-terminatorcount-with-valid-zombiecount-join.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerName":"NegativeTerminatorCountWithValidZombieCountSmoke","zombieCount":4,"terminatorCount":-1}')"
negative_zombiecount_with_valid_terminatorcount_status="$(curl -sS -o /tmp/rpc-zombie-smoke-negative-zombiecount-with-valid-terminatorcount-join.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerName":"NegativeZombieCountWithValidTerminatorCountSmoke","zombieCount":-1,"terminatorCount":4}')"
out_of_range_terminator_count_join_status="$(curl -sS -o /tmp/rpc-zombie-smoke-out-of-range-terminator-count-join.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerName":"OutOfRangeTerminatorCountSmoke","terminatorCount":33}')"
out_of_range_terminatorcount_with_valid_zombiecount_status="$(curl -sS -o /tmp/rpc-zombie-smoke-out-of-range-terminatorcount-with-valid-zombiecount-join.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerName":"OutOfRangeTerminatorCountWithValidZombieCountSmoke","zombieCount":4,"terminatorCount":33}')"
out_of_range_zombiecount_with_valid_terminatorcount_status="$(curl -sS -o /tmp/rpc-zombie-smoke-out-of-range-zombiecount-with-valid-terminatorcount-join.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerName":"OutOfRangeZombieCountWithValidTerminatorCountSmoke","zombieCount":33,"terminatorCount":4}')"
string_terminator_count_join_status="$(curl -sS -o /tmp/rpc-zombie-smoke-string-terminator-count-join.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/join" \
  -H "Content-Type: application/json" \
  -d '{"playerName":"StringTerminatorCountSmoke","terminatorCount":"4"}')"

action_status="$(curl -sS -o /tmp/rpc-zombie-smoke-action.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"move\",\"direction\":\"right\"}}")"
out_of_range_attack_status="$(curl -sS -o /tmp/rpc-zombie-smoke-out-of-range-attack.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"attack\",\"targetId\":\"z-1\"}}")"
unknown_target_attack_status="$(curl -sS -o /tmp/rpc-zombie-smoke-unknown-target-attack.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"attack\",\"targetId\":\"z-missing\"}}")"
trimmed_unknown_target_attack_status="$(curl -sS -o /tmp/rpc-zombie-smoke-trimmed-unknown-target-attack.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"attack\",\"targetId\":\"  z-missing  \"}}")"
mixed_whitespace_unknown_target_attack_status="$(curl -sS -o /tmp/rpc-zombie-smoke-mixed-whitespace-unknown-target-attack.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"attack\",\"targetId\":\"\n\tz-missing\t\n\"}}")"
unknown_target_shoot_status="$(curl -sS -o /tmp/rpc-zombie-smoke-unknown-target-shoot.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"shoot\",\"targetId\":\"z-missing\"}}")"
trimmed_unknown_target_shoot_status="$(curl -sS -o /tmp/rpc-zombie-smoke-trimmed-unknown-target-shoot.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"shoot\",\"targetId\":\"  z-missing  \"}}")"
mixed_whitespace_unknown_target_shoot_status="$(curl -sS -o /tmp/rpc-zombie-smoke-mixed-whitespace-unknown-target-shoot.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"shoot\",\"targetId\":\"\n\tz-missing\t\n\"}}")"
target_precedence_shoot_status="$(curl -sS -o /tmp/rpc-zombie-smoke-target-precedence-shoot.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"shoot\",\"targetId\":\"z-1\",\"direction\":\"up\"}}")"
trimmed_target_precedence_shoot_status="$(curl -sS -o /tmp/rpc-zombie-smoke-trimmed-target-precedence-shoot.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"shoot\",\"targetId\":\"  z-1  \",\"direction\":\"up\"}}")"
shoot_status="$(curl -sS -o /tmp/rpc-zombie-smoke-shoot.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"shoot\",\"direction\":\"up\"}}")"
second_shoot_status="$(curl -sS -o /tmp/rpc-zombie-smoke-second-shoot.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"shoot\",\"direction\":\"right\"}}")"
cooldown_unknown_target_shoot_status="$(curl -sS -o /tmp/rpc-zombie-smoke-cooldown-unknown-target-shoot.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"shoot\",\"targetId\":\"z-missing\"}}")"
cooldown_trimmed_unknown_target_shoot_status="$(curl -sS -o /tmp/rpc-zombie-smoke-cooldown-trimmed-unknown-target-shoot.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"shoot\",\"targetId\":\"  z-missing  \"}}")"
cooldown_unknown_target_attack_status="$(curl -sS -o /tmp/rpc-zombie-smoke-cooldown-unknown-target-attack.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"attack\",\"targetId\":\"z-missing\"}}")"
cooldown_trimmed_unknown_target_attack_status="$(curl -sS -o /tmp/rpc-zombie-smoke-cooldown-trimmed-unknown-target-attack.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"attack\",\"targetId\":\"  z-missing  \"}}")"

bad_direction_status="$(curl -sS -o /tmp/rpc-zombie-smoke-bad-direction.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"move\",\"direction\":\"north\"}}")"
invalid_shoot_direction_status="$(curl -sS -o /tmp/rpc-zombie-smoke-invalid-shoot-direction.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"shoot\",\"direction\":\"north\"}}")"
invalid_shoot_direction_with_target_status="$(curl -sS -o /tmp/rpc-zombie-smoke-invalid-shoot-direction-with-target.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"shoot\",\"targetId\":\"z-1\",\"direction\":\"north\"}}")"
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
blank_shoot_target_status="$(curl -sS -o /tmp/rpc-zombie-smoke-blank-shoot-target.json -w "%{http_code}" -X POST "${BASE_URL}/api/game/action" \
  -H "Content-Type: application/json" \
  -d "{\"session\":\"${session_id}\",\"playerId\":\"${player_id}\",\"action\":{\"type\":\"shoot\",\"targetId\":\"   \"}}")"
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

python3 - <<'PY' "${terminator_count_join_status}" "${legacy_zombie_count_join_status}" "${mismatched_count_join_status}" "${boundary_mismatched_count_join_status}" "${reversed_boundary_mismatched_count_join_status}" "${matching_count_join_status}" "${boundary_min_matching_count_join_status}" "${boundary_max_matching_count_join_status}" "${invalid_zombiecount_with_valid_terminatorcount_status}" "${invalid_terminatorcount_with_valid_zombiecount_status}" "${fractional_terminator_count_join_status}" "${fractional_terminatorcount_with_valid_zombiecount_status}" "${fractional_zombiecount_with_valid_terminatorcount_status}" "${low_terminatorcount_with_valid_zombiecount_status}" "${low_zombiecount_with_valid_terminatorcount_status}" "${negative_terminatorcount_with_valid_zombiecount_status}" "${negative_zombiecount_with_valid_terminatorcount_status}" "${out_of_range_terminator_count_join_status}" "${out_of_range_terminatorcount_with_valid_zombiecount_status}" "${out_of_range_zombiecount_with_valid_terminatorcount_status}" "${string_terminator_count_join_status}"
import json
import pathlib
import sys

terminator_count_join_status = int(sys.argv[1])
legacy_zombie_count_join_status = int(sys.argv[2])
mismatched_count_join_status = int(sys.argv[3])
boundary_mismatched_count_join_status = int(sys.argv[4])
reversed_boundary_mismatched_count_join_status = int(sys.argv[5])
matching_count_join_status = int(sys.argv[6])
boundary_min_matching_count_join_status = int(sys.argv[7])
boundary_max_matching_count_join_status = int(sys.argv[8])
invalid_zombiecount_with_valid_terminatorcount_status = int(sys.argv[9])
invalid_terminatorcount_with_valid_zombiecount_status = int(sys.argv[10])
fractional_terminator_count_join_status = int(sys.argv[11])
fractional_terminatorcount_with_valid_zombiecount_status = int(sys.argv[12])
fractional_zombiecount_with_valid_terminatorcount_status = int(sys.argv[13])
low_terminatorcount_with_valid_zombiecount_status = int(sys.argv[14])
low_zombiecount_with_valid_terminatorcount_status = int(sys.argv[15])
negative_terminatorcount_with_valid_zombiecount_status = int(sys.argv[16])
negative_zombiecount_with_valid_terminatorcount_status = int(sys.argv[17])
out_of_range_terminator_count_join_status = int(sys.argv[18])
out_of_range_terminatorcount_with_valid_zombiecount_status = int(sys.argv[19])
out_of_range_zombiecount_with_valid_terminatorcount_status = int(sys.argv[20])
string_terminator_count_join_status = int(sys.argv[21])
terminator_count_join_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-terminator-count-join.json").read_text())
legacy_zombie_count_join_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-legacy-zombie-count-join.json").read_text())
mismatched_count_join_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-mismatched-count-join.json").read_text())
boundary_mismatched_count_join_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-boundary-mismatched-count-join.json").read_text()
)
reversed_boundary_mismatched_count_join_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-reversed-boundary-mismatched-count-join.json").read_text()
)
matching_count_join_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-matching-count-join.json").read_text())
boundary_min_matching_count_join_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-boundary-min-matching-count-join.json").read_text()
)
boundary_max_matching_count_join_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-boundary-max-matching-count-join.json").read_text()
)
invalid_zombiecount_with_valid_terminatorcount_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-invalid-zombiecount-with-valid-terminatorcount.json").read_text()
)
invalid_terminatorcount_with_valid_zombiecount_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-invalid-terminatorcount-with-valid-zombiecount.json").read_text()
)
fractional_terminator_count_join_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-fractional-terminator-count-join.json").read_text()
)
fractional_terminatorcount_with_valid_zombiecount_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-fractional-terminatorcount-with-valid-zombiecount-join.json").read_text()
)
fractional_zombiecount_with_valid_terminatorcount_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-fractional-zombiecount-with-valid-terminatorcount-join.json").read_text()
)
low_terminatorcount_with_valid_zombiecount_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-low-terminatorcount-with-valid-zombiecount-join.json").read_text()
)
low_zombiecount_with_valid_terminatorcount_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-low-zombiecount-with-valid-terminatorcount-join.json").read_text()
)
negative_terminatorcount_with_valid_zombiecount_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-negative-terminatorcount-with-valid-zombiecount-join.json").read_text()
)
negative_zombiecount_with_valid_terminatorcount_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-negative-zombiecount-with-valid-terminatorcount-join.json").read_text()
)
out_of_range_terminator_count_join_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-out-of-range-terminator-count-join.json").read_text()
)
out_of_range_terminatorcount_with_valid_zombiecount_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-out-of-range-terminatorcount-with-valid-zombiecount-join.json").read_text()
)
out_of_range_zombiecount_with_valid_terminatorcount_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-out-of-range-zombiecount-with-valid-terminatorcount-join.json").read_text()
)
string_terminator_count_join_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-string-terminator-count-join.json").read_text()
)

assert terminator_count_join_status == 201, (
    f"terminatorCount join should be 201, got {terminator_count_join_status}"
)
assert terminator_count_join_payload["ok"] is True, "terminatorCount join payload should be success"
assert len(terminator_count_join_payload["data"]["state"]["zombies"]) == 32, (
    "terminatorCount join should initialize exactly 32 terminators"
)
assert legacy_zombie_count_join_status == 201, (
    f"legacy zombieCount join should be 201, got {legacy_zombie_count_join_status}"
)
assert legacy_zombie_count_join_payload["ok"] is True, "legacy zombieCount join payload should be success"
assert len(legacy_zombie_count_join_payload["data"]["state"]["zombies"]) == 1, (
    "legacy zombieCount join should initialize exactly 1 terminator"
)

assert mismatched_count_join_status == 400, (
    f"mismatched zombieCount/terminatorCount should be 400, got {mismatched_count_join_status}"
)
assert mismatched_count_join_payload["ok"] is False, "mismatched count join payload should be failure"
assert mismatched_count_join_payload["error"]["code"] == "INVALID_FIELD", (
    "mismatched count join code mismatch: "
    f"{mismatched_count_join_payload['error']['code']}"
)
assert boundary_mismatched_count_join_status == 400, (
    f"boundary mismatched zombieCount/terminatorCount should be 400, got {boundary_mismatched_count_join_status}"
)
assert boundary_mismatched_count_join_payload["ok"] is False, (
    "boundary mismatched count join payload should be failure"
)
assert boundary_mismatched_count_join_payload["error"]["code"] == "INVALID_FIELD", (
    "boundary mismatched count join code mismatch: "
    f"{boundary_mismatched_count_join_payload['error']['code']}"
)
assert reversed_boundary_mismatched_count_join_status == 400, (
    "reversed boundary mismatched zombieCount/terminatorCount should be 400, "
    f"got {reversed_boundary_mismatched_count_join_status}"
)
assert reversed_boundary_mismatched_count_join_payload["ok"] is False, (
    "reversed boundary mismatched count join payload should be failure"
)
assert reversed_boundary_mismatched_count_join_payload["error"]["code"] == "INVALID_FIELD", (
    "reversed boundary mismatched count join code mismatch: "
    f"{reversed_boundary_mismatched_count_join_payload['error']['code']}"
)
assert matching_count_join_status == 201, (
    f"matching zombieCount/terminatorCount join should be 201, got {matching_count_join_status}"
)
assert matching_count_join_payload["ok"] is True, "matching count join payload should be success"
assert len(matching_count_join_payload["data"]["state"]["zombies"]) == 3, (
    "matching count join should initialize exactly 3 terminators"
)
assert boundary_min_matching_count_join_status == 201, (
    "boundary min matching zombieCount/terminatorCount join should be 201, "
    f"got {boundary_min_matching_count_join_status}"
)
assert boundary_min_matching_count_join_payload["ok"] is True, (
    "boundary min matching count join payload should be success"
)
assert len(boundary_min_matching_count_join_payload["data"]["state"]["zombies"]) == 1, (
    "boundary min matching count join should initialize exactly 1 terminator"
)
assert boundary_max_matching_count_join_status == 201, (
    "boundary max matching zombieCount/terminatorCount join should be 201, "
    f"got {boundary_max_matching_count_join_status}"
)
assert boundary_max_matching_count_join_payload["ok"] is True, (
    "boundary max matching count join payload should be success"
)
assert len(boundary_max_matching_count_join_payload["data"]["state"]["zombies"]) == 32, (
    "boundary max matching count join should initialize exactly 32 terminators"
)
assert invalid_zombiecount_with_valid_terminatorcount_status == 400, (
    "invalid zombieCount with valid terminatorCount join should be 400, "
    f"got {invalid_zombiecount_with_valid_terminatorcount_status}"
)
assert invalid_zombiecount_with_valid_terminatorcount_payload["ok"] is False, (
    "invalid zombieCount with valid terminatorCount payload should be failure"
)
assert invalid_zombiecount_with_valid_terminatorcount_payload["error"]["code"] == "INVALID_FIELD", (
    "invalid zombieCount with valid terminatorCount code mismatch: "
    f"{invalid_zombiecount_with_valid_terminatorcount_payload['error']['code']}"
)
assert invalid_terminatorcount_with_valid_zombiecount_status == 400, (
    "invalid terminatorCount with valid zombieCount join should be 400, "
    f"got {invalid_terminatorcount_with_valid_zombiecount_status}"
)
assert invalid_terminatorcount_with_valid_zombiecount_payload["ok"] is False, (
    "invalid terminatorCount with valid zombieCount payload should be failure"
)
assert invalid_terminatorcount_with_valid_zombiecount_payload["error"]["code"] == "INVALID_FIELD", (
    "invalid terminatorCount with valid zombieCount code mismatch: "
    f"{invalid_terminatorcount_with_valid_zombiecount_payload['error']['code']}"
)

assert fractional_terminator_count_join_status == 400, (
    f"fractional terminatorCount join should be 400, got {fractional_terminator_count_join_status}"
)
assert fractional_terminator_count_join_payload["ok"] is False, (
    "fractional terminatorCount join payload should be failure"
)
assert fractional_terminator_count_join_payload["error"]["code"] == "INVALID_ZOMBIE_COUNT", (
    "fractional terminatorCount join code mismatch: "
    f"{fractional_terminator_count_join_payload['error']['code']}"
)
assert fractional_terminatorcount_with_valid_zombiecount_status == 400, (
    "fractional terminatorCount with valid zombieCount join should be 400, "
    f"got {fractional_terminatorcount_with_valid_zombiecount_status}"
)
assert fractional_terminatorcount_with_valid_zombiecount_payload["ok"] is False, (
    "fractional terminatorCount with valid zombieCount join payload should be failure"
)
assert fractional_terminatorcount_with_valid_zombiecount_payload["error"]["code"] == "INVALID_ZOMBIE_COUNT", (
    "fractional terminatorCount with valid zombieCount code mismatch: "
    f"{fractional_terminatorcount_with_valid_zombiecount_payload['error']['code']}"
)
assert fractional_zombiecount_with_valid_terminatorcount_status == 400, (
    "fractional zombieCount with valid terminatorCount join should be 400, "
    f"got {fractional_zombiecount_with_valid_terminatorcount_status}"
)
assert fractional_zombiecount_with_valid_terminatorcount_payload["ok"] is False, (
    "fractional zombieCount with valid terminatorCount join payload should be failure"
)
assert fractional_zombiecount_with_valid_terminatorcount_payload["error"]["code"] == "INVALID_ZOMBIE_COUNT", (
    "fractional zombieCount with valid terminatorCount code mismatch: "
    f"{fractional_zombiecount_with_valid_terminatorcount_payload['error']['code']}"
)
assert low_terminatorcount_with_valid_zombiecount_status == 400, (
    "low terminatorCount with valid zombieCount join should be 400, "
    f"got {low_terminatorcount_with_valid_zombiecount_status}"
)
assert low_terminatorcount_with_valid_zombiecount_payload["ok"] is False, (
    "low terminatorCount with valid zombieCount join payload should be failure"
)
assert low_terminatorcount_with_valid_zombiecount_payload["error"]["code"] == "INVALID_ZOMBIE_COUNT", (
    "low terminatorCount with valid zombieCount code mismatch: "
    f"{low_terminatorcount_with_valid_zombiecount_payload['error']['code']}"
)
assert low_zombiecount_with_valid_terminatorcount_status == 400, (
    "low zombieCount with valid terminatorCount join should be 400, "
    f"got {low_zombiecount_with_valid_terminatorcount_status}"
)
assert low_zombiecount_with_valid_terminatorcount_payload["ok"] is False, (
    "low zombieCount with valid terminatorCount join payload should be failure"
)
assert low_zombiecount_with_valid_terminatorcount_payload["error"]["code"] == "INVALID_ZOMBIE_COUNT", (
    "low zombieCount with valid terminatorCount code mismatch: "
    f"{low_zombiecount_with_valid_terminatorcount_payload['error']['code']}"
)
assert negative_terminatorcount_with_valid_zombiecount_status == 400, (
    "negative terminatorCount with valid zombieCount join should be 400, "
    f"got {negative_terminatorcount_with_valid_zombiecount_status}"
)
assert negative_terminatorcount_with_valid_zombiecount_payload["ok"] is False, (
    "negative terminatorCount with valid zombieCount join payload should be failure"
)
assert negative_terminatorcount_with_valid_zombiecount_payload["error"]["code"] == "INVALID_ZOMBIE_COUNT", (
    "negative terminatorCount with valid zombieCount code mismatch: "
    f"{negative_terminatorcount_with_valid_zombiecount_payload['error']['code']}"
)
assert negative_zombiecount_with_valid_terminatorcount_status == 400, (
    "negative zombieCount with valid terminatorCount join should be 400, "
    f"got {negative_zombiecount_with_valid_terminatorcount_status}"
)
assert negative_zombiecount_with_valid_terminatorcount_payload["ok"] is False, (
    "negative zombieCount with valid terminatorCount join payload should be failure"
)
assert negative_zombiecount_with_valid_terminatorcount_payload["error"]["code"] == "INVALID_ZOMBIE_COUNT", (
    "negative zombieCount with valid terminatorCount code mismatch: "
    f"{negative_zombiecount_with_valid_terminatorcount_payload['error']['code']}"
)

assert out_of_range_terminator_count_join_status == 400, (
    "out-of-range terminatorCount join should be 400, "
    f"got {out_of_range_terminator_count_join_status}"
)
assert out_of_range_terminator_count_join_payload["ok"] is False, (
    "out-of-range terminatorCount join payload should be failure"
)
assert out_of_range_terminator_count_join_payload["error"]["code"] == "INVALID_ZOMBIE_COUNT", (
    "out-of-range terminatorCount join code mismatch: "
    f"{out_of_range_terminator_count_join_payload['error']['code']}"
)
assert out_of_range_terminatorcount_with_valid_zombiecount_status == 400, (
    "out-of-range terminatorCount with valid zombieCount join should be 400, "
    f"got {out_of_range_terminatorcount_with_valid_zombiecount_status}"
)
assert out_of_range_terminatorcount_with_valid_zombiecount_payload["ok"] is False, (
    "out-of-range terminatorCount with valid zombieCount join payload should be failure"
)
assert out_of_range_terminatorcount_with_valid_zombiecount_payload["error"]["code"] == "INVALID_ZOMBIE_COUNT", (
    "out-of-range terminatorCount with valid zombieCount code mismatch: "
    f"{out_of_range_terminatorcount_with_valid_zombiecount_payload['error']['code']}"
)
assert out_of_range_zombiecount_with_valid_terminatorcount_status == 400, (
    "out-of-range zombieCount with valid terminatorCount join should be 400, "
    f"got {out_of_range_zombiecount_with_valid_terminatorcount_status}"
)
assert out_of_range_zombiecount_with_valid_terminatorcount_payload["ok"] is False, (
    "out-of-range zombieCount with valid terminatorCount join payload should be failure"
)
assert out_of_range_zombiecount_with_valid_terminatorcount_payload["error"]["code"] == "INVALID_ZOMBIE_COUNT", (
    "out-of-range zombieCount with valid terminatorCount code mismatch: "
    f"{out_of_range_zombiecount_with_valid_terminatorcount_payload['error']['code']}"
)

assert string_terminator_count_join_status == 400, (
    f"string terminatorCount join should be 400, got {string_terminator_count_join_status}"
)
assert string_terminator_count_join_payload["ok"] is False, "string terminatorCount join payload should be failure"
assert string_terminator_count_join_payload["error"]["code"] == "INVALID_FIELD", (
    "string terminatorCount join code mismatch: "
    f"{string_terminator_count_join_payload['error']['code']}"
)
PY

python3 - <<'PY' "${mixed_whitespace_unknown_target_attack_status}" "${mixed_whitespace_unknown_target_shoot_status}"
import json
import pathlib
import sys

mixed_whitespace_unknown_target_attack_status = int(sys.argv[1])
mixed_whitespace_unknown_target_shoot_status = int(sys.argv[2])
mixed_whitespace_unknown_target_attack_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-mixed-whitespace-unknown-target-attack.json").read_text()
)
mixed_whitespace_unknown_target_shoot_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-mixed-whitespace-unknown-target-shoot.json").read_text()
)

assert mixed_whitespace_unknown_target_attack_status == 404, (
    "mixed-whitespace unknown target attack should be 404, "
    f"got {mixed_whitespace_unknown_target_attack_status}"
)
assert mixed_whitespace_unknown_target_attack_payload["ok"] is False, (
    "mixed-whitespace unknown target attack payload should be failure"
)
assert mixed_whitespace_unknown_target_attack_payload["error"]["code"] == "TARGET_NOT_FOUND", (
    "mixed-whitespace unknown target attack code mismatch: "
    f"{mixed_whitespace_unknown_target_attack_payload['error']['code']}"
)

assert mixed_whitespace_unknown_target_shoot_status == 404, (
    "mixed-whitespace unknown target shoot should be 404, "
    f"got {mixed_whitespace_unknown_target_shoot_status}"
)
assert mixed_whitespace_unknown_target_shoot_payload["ok"] is False, (
    "mixed-whitespace unknown target shoot payload should be failure"
)
assert mixed_whitespace_unknown_target_shoot_payload["error"]["code"] == "TARGET_NOT_FOUND", (
    "mixed-whitespace unknown target shoot code mismatch: "
    f"{mixed_whitespace_unknown_target_shoot_payload['error']['code']}"
)
PY

python3 - <<'PY' "${cooldown_trimmed_unknown_target_attack_status}"
import json
import pathlib
import sys

cooldown_trimmed_unknown_target_attack_status = int(sys.argv[1])
cooldown_trimmed_unknown_target_attack_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-cooldown-trimmed-unknown-target-attack.json").read_text()
)

assert cooldown_trimmed_unknown_target_attack_status == 409, (
    "cooldown attack with trimmed unknown explicit target should be 409, "
    f"got {cooldown_trimmed_unknown_target_attack_status}"
)
assert cooldown_trimmed_unknown_target_attack_payload["ok"] is False, (
    "cooldown trimmed unknown target attack payload should be failure"
)
assert cooldown_trimmed_unknown_target_attack_payload["error"]["code"] == "ATTACK_COOLDOWN", (
    "cooldown trimmed unknown target attack code mismatch: "
    f"{cooldown_trimmed_unknown_target_attack_payload['error']['code']}"
)
PY

python3 - <<'PY' "${join_payload}" "${servers_payload}" "${action_status}" "${shoot_status}" "${out_of_range_attack_status}" "${bad_direction_status}" "${invalid_join_field_status}" "${blank_session_status}" "${blank_server_id_status}" "${blank_player_id_status}" "${missing_direction_status}" "${invalid_attack_target_status}" "${blank_attack_target_status}" "${turret_no_scrap_status}" "${fractional_zombie_count_status}" "${invalid_json_status}" "${missing_query_status}" "${blank_state_query_status}" "${missing_state_status}" "${missing_observe_status}" "${blank_observe_player_status}" "${trimmed_observe_status}" "${observe_alias_status}" "${blank_action_session_status}" "${blank_action_player_status}" "${blank_tick_session_status}" "${unknown_action_session_status}" "${unknown_tick_session_status}" "${trimmed_action_status}" "${trimmed_tick_status}" "${trimmed_serverid_game_join_status}" "${join_server_status}" "${blank_name_join_status}" "${trimmed_session_join_status}" "${invalid_server_join_field_status}" "${blank_server_join_player_id_status}" "${missing_server_status}" "${missing_join_server_status}" "${mismatch_join_status}" "${invalid_server_description_type_status}" "${invalid_server_maxplayers_type_status}" "${duplicate_join_one_status}" "${duplicate_join_two_status}" "${out_of_range_zombie_count_status}" "${string_zombie_count_status}" "${invalid_server_maxplayers_low_status}" "${invalid_server_maxplayers_high_status}" "${invalid_server_maxplayers_fractional_status}" "${trimmed_route_server_join_status}" "${blank_route_server_join_status}" "${unknown_action_player_status}" "${unknown_target_attack_status}" "${second_shoot_status}" "${invalid_shoot_direction_status}" "${unknown_target_shoot_status}" "${target_precedence_shoot_status}" "${trimmed_target_precedence_shoot_status}" "${blank_shoot_target_status}" "${invalid_shoot_direction_with_target_status}" "${cooldown_unknown_target_shoot_status}" "${cooldown_unknown_target_attack_status}" "${trimmed_unknown_target_attack_status}" "${cooldown_trimmed_unknown_target_shoot_status}" "${trimmed_unknown_target_shoot_status}"
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
target_precedence_shoot_status = int(sys.argv[56])
trimmed_target_precedence_shoot_status = int(sys.argv[57])
blank_shoot_target_status = int(sys.argv[58])
invalid_shoot_direction_with_target_status = int(sys.argv[59])
cooldown_unknown_target_shoot_status = int(sys.argv[60])
cooldown_unknown_target_attack_status = int(sys.argv[61])
trimmed_unknown_target_attack_status = int(sys.argv[62])
cooldown_trimmed_unknown_target_shoot_status = int(sys.argv[63])
trimmed_unknown_target_shoot_status = int(sys.argv[64])
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
invalid_shoot_direction_with_target_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-invalid-shoot-direction-with-target.json").read_text()
)
unknown_target_shoot_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-unknown-target-shoot.json").read_text())
trimmed_unknown_target_shoot_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-trimmed-unknown-target-shoot.json").read_text()
)
target_precedence_shoot_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-target-precedence-shoot.json").read_text())
trimmed_target_precedence_shoot_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-trimmed-target-precedence-shoot.json").read_text()
)
blank_shoot_target_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-blank-shoot-target.json").read_text())
cooldown_unknown_target_shoot_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-cooldown-unknown-target-shoot.json").read_text()
)
cooldown_trimmed_unknown_target_shoot_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-cooldown-trimmed-unknown-target-shoot.json").read_text()
)
cooldown_unknown_target_attack_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-cooldown-unknown-target-attack.json").read_text()
)
out_of_range_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-out-of-range-attack.json").read_text())
unknown_target_attack_payload = json.loads(pathlib.Path("/tmp/rpc-zombie-smoke-unknown-target-attack.json").read_text())
trimmed_unknown_target_attack_payload = json.loads(
    pathlib.Path("/tmp/rpc-zombie-smoke-trimmed-unknown-target-attack.json").read_text()
)
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
assert action_payload["data"]["observation"]["nearestTerminator"] == action_payload["data"]["observation"]["nearestZombie"], (
    "action nearestTerminator alias mismatch with nearestZombie"
)
action_zombie_types = {
    entity["id"]: entity.get("zombieType") for entity in action_payload["data"]["observation"]["zombies"]
}
action_terminator_types = {
    entity["id"]: entity.get("terminatorType") for entity in action_payload["data"]["observation"]["terminators"]
}
assert action_terminator_types == action_zombie_types, (
    "action observation type alias mismatch: "
    f"zombieType={action_zombie_types} terminatorType={action_terminator_types}"
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
assert invalid_shoot_direction_with_target_status == 400, (
    "shoot with targetId and invalid direction should be 400, "
    f"got {invalid_shoot_direction_with_target_status}"
)
assert unknown_target_shoot_status == 404, (
    f"shoot with unknown explicit target should be 404, got {unknown_target_shoot_status}"
)
assert trimmed_unknown_target_shoot_status == 404, (
    f"trimmed unknown explicit shoot target should be 404, got {trimmed_unknown_target_shoot_status}"
)
assert cooldown_unknown_target_shoot_status == 409, (
    "cooldown shoot with unknown explicit target should be 409, "
    f"got {cooldown_unknown_target_shoot_status}"
)
assert cooldown_trimmed_unknown_target_shoot_status == 409, (
    "cooldown shoot with trimmed unknown explicit target should be 409, "
    f"got {cooldown_trimmed_unknown_target_shoot_status}"
)
assert cooldown_unknown_target_attack_status == 409, (
    "cooldown attack with unknown explicit target should be 409, "
    f"got {cooldown_unknown_target_attack_status}"
)
assert target_precedence_shoot_status == 409, (
    f"shoot with target+direction precedence should be 409, got {target_precedence_shoot_status}"
)
assert trimmed_target_precedence_shoot_status == 409, (
    "shoot with trimmed target+direction precedence should be 409, "
    f"got {trimmed_target_precedence_shoot_status}"
)
assert out_of_range_attack_status == 409, f"out-of-range attack should be 409, got {out_of_range_attack_status}"
assert unknown_target_attack_status == 404, f"unknown target attack should be 404, got {unknown_target_attack_status}"
assert trimmed_unknown_target_attack_status == 404, (
    f"trimmed unknown target attack should be 404, got {trimmed_unknown_target_attack_status}"
)
assert bad_direction_status == 400, f"bad direction should be 400, got {bad_direction_status}"
assert invalid_join_field_status == 400, f"invalid join field should be 400, got {invalid_join_field_status}"
assert blank_session_status == 400, f"blank session should be 400, got {blank_session_status}"
assert blank_server_id_status == 400, f"blank serverId should be 400, got {blank_server_id_status}"
assert blank_player_id_status == 400, f"blank playerId should be 400, got {blank_player_id_status}"
assert missing_direction_status == 400, f"move without direction should be 400, got {missing_direction_status}"
assert invalid_attack_target_status == 400, f"attack with invalid target type should be 400, got {invalid_attack_target_status}"
assert blank_attack_target_status == 400, f"attack with blank targetId should be 400, got {blank_attack_target_status}"
assert blank_shoot_target_status == 400, f"shoot with blank targetId should be 400, got {blank_shoot_target_status}"
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
assert trimmed_unknown_target_attack_payload["ok"] is False, (
    "trimmed unknown target attack payload should be failure"
)
assert trimmed_unknown_target_attack_payload["error"]["code"] == "TARGET_NOT_FOUND", (
    "trimmed unknown target attack code mismatch: "
    f"{trimmed_unknown_target_attack_payload['error']['code']}"
)
assert second_shoot_payload["ok"] is False, "second shoot payload should be failure"
assert second_shoot_payload["error"]["code"] == "ATTACK_COOLDOWN", (
    f"second shoot error code mismatch: {second_shoot_payload['error']['code']}"
)
assert invalid_shoot_direction_payload["ok"] is False, "invalid shoot direction payload should be failure"
assert invalid_shoot_direction_payload["error"]["code"] == "INVALID_DIRECTION", (
    f"invalid shoot direction code mismatch: {invalid_shoot_direction_payload['error']['code']}"
)
assert invalid_shoot_direction_with_target_payload["ok"] is False, (
    "invalid shoot direction with target payload should be failure"
)
assert invalid_shoot_direction_with_target_payload["error"]["code"] == "INVALID_DIRECTION", (
    "invalid shoot direction with target code mismatch: "
    f"{invalid_shoot_direction_with_target_payload['error']['code']}"
)
assert unknown_target_shoot_payload["ok"] is False, "unknown target shoot payload should be failure"
assert unknown_target_shoot_payload["error"]["code"] == "TARGET_NOT_FOUND", (
    f"unknown target shoot code mismatch: {unknown_target_shoot_payload['error']['code']}"
)
assert trimmed_unknown_target_shoot_payload["ok"] is False, (
    "trimmed unknown target shoot payload should be failure"
)
assert trimmed_unknown_target_shoot_payload["error"]["code"] == "TARGET_NOT_FOUND", (
    "trimmed unknown target shoot code mismatch: "
    f"{trimmed_unknown_target_shoot_payload['error']['code']}"
)
assert cooldown_unknown_target_shoot_payload["ok"] is False, (
    "cooldown unknown target shoot payload should be failure"
)
assert cooldown_unknown_target_shoot_payload["error"]["code"] == "ATTACK_COOLDOWN", (
    "cooldown unknown target shoot code mismatch: "
    f"{cooldown_unknown_target_shoot_payload['error']['code']}"
)
assert cooldown_trimmed_unknown_target_shoot_payload["ok"] is False, (
    "cooldown trimmed unknown target shoot payload should be failure"
)
assert cooldown_trimmed_unknown_target_shoot_payload["error"]["code"] == "ATTACK_COOLDOWN", (
    "cooldown trimmed unknown target shoot code mismatch: "
    f"{cooldown_trimmed_unknown_target_shoot_payload['error']['code']}"
)
assert cooldown_unknown_target_attack_payload["ok"] is False, (
    "cooldown unknown target attack payload should be failure"
)
assert cooldown_unknown_target_attack_payload["error"]["code"] == "ATTACK_COOLDOWN", (
    "cooldown unknown target attack code mismatch: "
    f"{cooldown_unknown_target_attack_payload['error']['code']}"
)
assert target_precedence_shoot_payload["ok"] is False, "target precedence shoot payload should be failure"
assert target_precedence_shoot_payload["error"]["code"] == "TARGET_OUT_OF_RANGE", (
    f"target precedence shoot code mismatch: {target_precedence_shoot_payload['error']['code']}"
)
assert trimmed_target_precedence_shoot_payload["ok"] is False, (
    "trimmed target precedence shoot payload should be failure"
)
assert trimmed_target_precedence_shoot_payload["error"]["code"] == "TARGET_OUT_OF_RANGE", (
    "trimmed target precedence shoot code mismatch: "
    f"{trimmed_target_precedence_shoot_payload['error']['code']}"
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
assert blank_shoot_target_payload["ok"] is False, "blank shoot target payload should be failure"
assert blank_shoot_target_payload["error"]["code"] == "INVALID_FIELD", (
    f"blank shoot target code mismatch: {blank_shoot_target_payload['error']['code']}"
)
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
assert observe_alias_payload["data"]["observation"]["nearestTerminator"] == observe_alias_payload["data"]["observation"]["nearestZombie"], (
    "nearestTerminator alias mismatch with nearestZombie"
)
zombie_types = {
    entity["id"]: entity.get("zombieType") for entity in observe_alias_payload["data"]["observation"]["zombies"]
}
terminator_types = {
    entity["id"]: entity.get("terminatorType") for entity in observe_alias_payload["data"]["observation"]["terminators"]
}
assert terminator_types == zombie_types, (
    f"terminator type alias mismatch: zombieType={zombie_types} terminatorType={terminator_types}"
)
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
