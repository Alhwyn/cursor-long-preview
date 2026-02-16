# RPC Zombie Game Reference

## Endpoint Index

- `POST /api/game/join`
- `GET /api/game/state`
- `GET /api/game/observe`
- `POST /api/game/action`
- `POST /api/game/tick`
- `GET /api/servers`
- `POST /api/servers`
- `POST /api/servers/:id/join`

## Request / Response Examples

### Join

```bash
curl -s -X POST http://127.0.0.1:3000/api/game/join \
  -H "Content-Type: application/json" \
  -d '{"playerName":"Agent"}'
```

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

## Error-to-Action Guidance

- `SESSION_NOT_FOUND` -> restart flow from `/api/game/join`.
- `SESSION_SERVER_MISMATCH` -> remove conflicting `serverId` or rejoin via the correct server flow.
- `PLAYER_NOT_FOUND` -> player/session mismatch; refresh from join response.
- `INVALID_ZOMBIE_COUNT` -> retry join with integer `zombieCount` in `[1, 32]`.
- `INVALID_FIELD` -> check field types and ensure optional IDs (`session`, `serverId`, `playerId`, `targetId`) are non-empty strings when supplied (surrounding whitespace is trimmed by server).
- `MISSING_SERVER_ID` -> ensure `POST /api/servers/:id/join` includes a non-empty `:id` path segment; surrounding whitespace is trimmed by server.
- `TARGET_OUT_OF_RANGE` -> move first.
- `ATTACK_COOLDOWN` -> move or wait one turn.
- `MOVE_BLOCKED` / `MOVE_OCCUPIED` -> pick alternate direction.
- `SERVER_FULL` -> choose another server or create a new one.
- `UNAUTHORIZED` / `FORBIDDEN` -> refresh bearer token in enabled mode (`UNAUTHORIZED` also covers missing/non-Bearer auth headers).

## Observation-driven movement heuristic

Given `nearestZombie.dx` and `nearestZombie.dy`:

- if `abs(dx) >= abs(dy)`, prioritize horizontal move:
  - `dx > 0` => `right`
  - `dx < 0` => `left`
- else prioritize vertical move:
  - `dy > 0` => `down`
  - `dy < 0` => `up`

Fallback to second axis if blocked.
