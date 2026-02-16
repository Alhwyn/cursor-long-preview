# RPC Zombie Game API

This service is a **server-authoritative** zombie game simulation.  
Clients send intents; the server validates, mutates canonical state, advances ticks, and returns snapshots.

## Response Envelope

All API responses use:

```json
{
  "ok": true,
  "data": {}
}
```

or

```json
{
  "ok": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable explanation",
    "details": {}
  }
}
```

---

## Game Endpoints

### `POST /api/game/join`

Create a new session (or join existing session).

Request:

```json
{
  "playerName": "Scout",
  "session": "optional-existing-session-id",
  "playerId": "optional-player-id",
  "serverId": "optional-server-id",
  "zombieCount": 4
}
```

`zombieCount` must be an integer from `1` to `32`.
If `playerName` is omitted/blank, server defaults to `Survivor-N`.
If `session`, `playerId`, or `serverId` are provided, they must be non-empty strings (values are trimmed).
If `playerId` is omitted:
- new session defaults to `p-<sessionId>-1`
- subsequent joins default to `p-2`, `p-3`, ...

If `serverId` is provided, it must match an existing server (`404 SERVER_NOT_FOUND` otherwise).

If joining an existing `session` that is attached to a lobby server, server max-player limits are enforced (`409 SERVER_FULL`).
If `session` and `serverId` are both provided, the session must belong to that server (`409 SESSION_SERVER_MISMATCH` otherwise).

Response `201` (new) / `200` (join existing):

```json
{
  "ok": true,
  "data": {
    "sessionId": "uuid",
    "playerId": "uuid",
    "playerName": "Scout",
    "state": {},
    "observation": {}
  }
}
```

---

### `GET /api/game/state?session=<sessionId>`

Get canonical session state.

`session` query value is required and is trimmed before lookup.

Response:

```json
{
  "ok": true,
  "data": {
    "sessionId": "uuid",
    "state": {
      "tick": 3,
      "status": "active"
    }
  }
}
```

---

### `GET /api/game/observe?session=<sessionId>&player=<playerId>`

Get compact, player-centric observation payload.

`player` is optional; when omitted, first player in session is used.
If provided, `player` must be a non-empty string.

Observation shape:

```json
{
  "sessionId": "uuid",
  "playerId": "uuid",
  "tick": 3,
  "status": "active",
  "self": {
    "id": "uuid",
    "kind": "player",
    "name": "Scout",
    "x": 2,
    "y": 2,
    "hp": 108,
    "maxHp": 120,
    "alive": true
  },
  "nearestZombie": {
    "id": "z-2",
    "distance": 5,
    "dx": 4,
    "dy": 1,
    "x": 6,
    "y": 3,
    "hp": 70,
    "alive": true
  },
  "players": [],
  "zombies": [],
  "entities": []
}
```

---

### `POST /api/game/action`

Apply action for a specific player.

Request:

```json
{
  "session": "uuid",
  "playerId": "uuid",
  "action": {
    "type": "move",
    "direction": "up"
  }
}
```

Action schema:

- `{"type":"move","direction":"up"|"down"|"left"|"right"}`
- `{"type":"attack","targetId":"optional-zombie-id"}` (`targetId` must be non-empty when provided)
- `{"type":"wait"}`

`session` and `playerId` are required non-empty strings and are trimmed before lookup.

Response:

```json
{
  "ok": true,
  "data": {
    "sessionId": "uuid",
    "playerId": "uuid",
    "state": {},
    "observation": {}
  }
}
```

---

### `POST /api/game/tick`

Manual world step without player action.

Request:

```json
{
  "session": "uuid"
}
```

`session` is a required non-empty string and is trimmed before lookup.

Response:

```json
{
  "ok": true,
  "data": {
    "sessionId": "uuid",
    "state": {}
  }
}
```

---

## Lobby / Server Endpoints

### `GET /api/servers`

List public servers with current player counts.

Response:

```json
{
  "ok": true,
  "data": {
    "mode": "disabled",
    "servers": []
  }
}
```

`mode`:
- `disabled` => local in-memory fallback mode
- `enabled` => Supabase-backed metadata mode

---

### `POST /api/servers`

Create server metadata.

Auth rules:
- Supabase **disabled**: no auth required.
- Supabase **enabled**: `Authorization: Bearer <jwt>` required.
  - Missing or non-Bearer `Authorization` header returns `401 UNAUTHORIZED`.
  - Bearer token that fails verification returns `403 FORBIDDEN`.
  - `Bearer` scheme matching is case-insensitive and tolerates extra spaces before the token.

Request:

```json
{
  "name": "Zombie Meadow",
  "description": "Casual run",
  "maxPlayers": 4
}
```

`name` is required and trimmed.  
`description` is optional; blank values normalize to empty/omitted metadata.  
`maxPlayers` is optional and defaults to `4` (must be integer `1..32` when provided).

Response:

```json
{
  "ok": true,
  "data": {
    "mode": "disabled",
    "server": {
      "id": "srv-...",
      "name": "Zombie Meadow",
      "maxPlayers": 4
    }
  }
}
```

---

### `POST /api/servers/:id/join`

Join server's active game session (creates one if needed).

Request:

```json
{
  "playerName": "Scout",
  "playerId": "optional"
}
```

`playerId` must be a non-empty string when provided.
`playerId` values are trimmed before session join.
Route parameter `:id` must be non-empty and is trimmed before server lookup.

Response:

```json
{
  "ok": true,
  "data": {
    "server": {},
    "sessionId": "uuid",
    "playerId": "uuid",
    "playerName": "Scout",
    "state": {},
    "observation": {}
  }
}
```

---

## Common Error Codes

- `INVALID_JSON`, `INVALID_BODY`, `INVALID_FIELD`
- `MISSING_QUERY`, `MISSING_SERVER_ID`, `INVALID_ACTION`, `INVALID_DIRECTION`, `INVALID_ZOMBIE_COUNT`
- `SESSION_NOT_FOUND`, `SESSION_SERVER_MISMATCH`, `PLAYER_NOT_FOUND`, `TARGET_NOT_FOUND`, `SERVER_NOT_FOUND`
- `PLAYER_DEAD`, `MOVE_BLOCKED`, `MOVE_OCCUPIED`, `TARGET_OUT_OF_RANGE`, `ATTACK_COOLDOWN`, `SERVER_FULL`, `GAME_COMPLETED`
- `UNAUTHORIZED`, `FORBIDDEN`
- `SUPABASE_QUERY_FAILED`, `SUPABASE_CREATE_FAILED`, `SUPABASE_JOIN_FAILED`, `SUPABASE_SNAPSHOT_FAILED`

---

## Claude / Agent Play Loop (single session)

1. `POST /api/game/join` → keep `sessionId` + `playerId`.
2. `GET /api/game/observe?session=...&player=...` → inspect nearest zombie + HP.
3. Decide action:
   - if zombie adjacent => `attack`
   - else move to reduce distance.
4. `POST /api/game/action`.
5. Repeat 2–4 until `status` is `won` or `lost`.
