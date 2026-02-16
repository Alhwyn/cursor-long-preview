# RPC Terminator Siege Reference

## Endpoint Index

- `POST /api/game/join`
- `GET /api/game/state`
- `GET /api/game/observe`
- `POST /api/game/action`
- `POST /api/game/tick`
- `GET /api/servers`
- `POST /api/servers`
- `POST /api/servers/:id/join`
- `POST /api/party/create`
- `POST /api/party/join`
- `POST /api/party/ready`
- `POST /api/party/start`
- `POST /api/party/leave`
- `GET /api/party/state`
- `GET /api/realtime/stream`

## Request / Response Examples

### Join

```bash
curl -s -X POST http://127.0.0.1:3000/api/game/join \
  -H "Content-Type: application/json" \
  -d '{"playerName":"Agent"}'
```

### Join Existing Session (agent handoff by `sessionId`)

```bash
curl -s -X POST http://127.0.0.1:3000/api/game/join \
  -H "Content-Type: application/json" \
  -d '{
    "session":"<SESSION_ID>",
    "playerName":"Agent Ally"
  }'
```

Use this after a leader starts party match and shares `sessionId`.

### Observe

```bash
curl -s "http://127.0.0.1:3000/api/game/observe?session=<SESSION>&player=<PLAYER>"
```

### Move

```bash
curl -s -X POST http://127.0.0.1:3000/api/game/action \
  -H "Content-Type: application/json" \
  -d '{
    "session":"<SESSION>",
    "playerId":"<PLAYER>",
    "action":{"type":"move","direction":"right"}
  }'
```

### Attack

```bash
curl -s -X POST http://127.0.0.1:3000/api/game/action \
  -H "Content-Type: application/json" \
  -d '{
    "session":"<SESSION>",
    "playerId":"<PLAYER>",
    "action":{"type":"attack"}
  }'
```

### Manual Tick

```bash
curl -s -X POST http://127.0.0.1:3000/api/game/tick \
  -H "Content-Type: application/json" \
  -d '{"session":"<SESSION>"}'
```

### Create Server (auth optional depending mode)

```bash
curl -s -X POST http://127.0.0.1:3000/api/servers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"name":"My Lobby","maxPlayers":4}'
```

### Join Server

```bash
curl -s -X POST http://127.0.0.1:3000/api/servers/<SERVER_ID>/join \
  -H "Content-Type: application/json" \
  -d '{"playerName":"Agent"}'
```

### Create Party + Join by Code

```bash
curl -s -X POST http://127.0.0.1:3000/api/party/create \
  -H "Content-Type: application/json" \
  -d '{"playerName":"Leader"}'

curl -s -X POST http://127.0.0.1:3000/api/party/join \
  -H "Content-Type: application/json" \
  -d '{"partyCode":"<CODE>","playerName":"Guest"}'
```

### Ready + Start Party

```bash
curl -s -X POST http://127.0.0.1:3000/api/party/ready \
  -H "Content-Type: application/json" \
  -d '{"partyId":"<PARTY>","playerId":"<PLAYER>","ready":true}'

curl -s -X POST http://127.0.0.1:3000/api/party/start \
  -H "Content-Type: application/json" \
  -d '{"partyId":"<PARTY>","playerId":"<LEADER>","agentEnabled":true}'
```

Take the `sessionId` from this response and pass it to any helper agents via `POST /api/game/join`.

## Error-to-Action Guidance

- `SESSION_NOT_FOUND` -> restart flow from `/api/game/join`.
- `SESSION_SERVER_MISMATCH` -> remove conflicting `serverId` or rejoin via the correct server flow.
- `PLAYER_NOT_FOUND` -> player/session mismatch; refresh from join response.
- `TARGET_NOT_FOUND` -> retry attack without `targetId` or refresh observation to choose a valid terminator id.
- `INVALID_ZOMBIE_COUNT` -> retry join with integer `zombieCount` in `[1, 32]`.
- `INVALID_FIELD` -> check field types and ensure optional IDs (`session`, `serverId`, `playerId`, `targetId`) are non-empty strings when supplied (surrounding whitespace is trimmed by server).
- `MISSING_SERVER_ID` -> ensure `POST /api/servers/:id/join` includes a non-empty `:id` path segment; surrounding whitespace is trimmed by server.
- `PARTY_NOT_READY` -> ensure every party member marked ready before leader starts.
- `PARTY_NOT_LEADER` -> call `POST /api/party/start` with leader `playerId`.
- `PARTY_FULL` -> party already has 4 members.
- `TARGET_OUT_OF_RANGE` -> move first.
- `ATTACK_COOLDOWN` -> move or wait one turn.
- `MOVE_BLOCKED` / `MOVE_OCCUPIED` -> pick alternate direction.
- `SERVER_FULL` -> choose another server or create a new one.
- `UNAUTHORIZED` / `FORBIDDEN` -> refresh bearer token in enabled mode (`UNAUTHORIZED` also covers missing/non-Bearer auth headers; Bearer scheme parsing is case-insensitive).
- In enabled mode, auth validation runs before JSON body parsing on `POST /api/servers`.
- For realtime sync, open `GET /api/realtime/stream` (SSE) after joining/creating party.
- CAI companion appears in `state.companion` / `observation.companion` when enabled and will attack zombies autonomously.

## Observation-driven movement heuristic

Given `nearestZombie.dx` and `nearestZombie.dy` (nearest terminator vector):

- if `abs(dx) >= abs(dy)`, prioritize horizontal move:
  - `dx > 0` => `right`
  - `dx < 0` => `left`
- else prioritize vertical move:
  - `dy > 0` => `down`
  - `dy < 0` => `up`

Fallback to second axis if blocked.
