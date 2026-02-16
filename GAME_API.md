# RPC Terminator Siege API

This service is a **server-authoritative** terminator-siege simulation.  
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
  "accessKey": "optional-temporary-agent-access-key",
  "playerId": "optional-player-id",
  "serverId": "optional-server-id",
  "terminatorCount": 4,
  "agentEnabled": true
}
```

`terminatorCount` must be an integer from `1` to `32`.
`zombieCount` remains a legacy alias for backward compatibility.
If both `terminatorCount` and `zombieCount` are provided, they must match.
`agentEnabled` is optional boolean (when true on new session, spawns Claude Bot combat companion).
If `playerName` is omitted/blank, server defaults to `Survivor-N`.
If `session`, `playerId`, or `serverId` are provided, they must be non-empty strings (values are trimmed).
If `accessKey` is provided, session is resolved from the key unless explicit `session` is also provided.
When both are provided, session must match the key (`409 ACCESS_KEY_SESSION_MISMATCH`).
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

#### Agent handoff pattern (join by `sessionId`)

For user-controlled helper agents:

1. Human player/leader shares `sessionId` from an active match.
2. Agent calls `POST /api/game/join` with that `session`:

```json
{
  "session": "existing-session-id",
  "playerName": "Agent Ally"
}
```

3. Agent stores returned `playerId` and continues with `/api/game/observe` + `/api/game/action`.

#### Secure agent handoff pattern (temporary `accessKey`)

1. Existing in-session player mints key via `POST /api/agent/access-key`.
2. Share key with helper AI.
3. Helper AI joins via `POST /api/game/join` with `{ "accessKey":"..." }`.

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

### `POST /api/agent/access-key`

Create a temporary key that lets an external helper AI join the same active session.

Request:

```json
{
  "session": "uuid",
  "playerId": "existing-player-id",
  "ttlSeconds": 900,
  "maxUses": 1
}
```

- `session` and `playerId` are required and must refer to an existing in-session player.
- `ttlSeconds` is optional (`30..21600`, integer).
- `maxUses` is optional (`1..16`, integer), defaults to `1`.

Response (`201`):

```json
{
  "ok": true,
  "data": {
    "sessionId": "uuid",
    "issuedByPlayerId": "p-1",
    "accessKey": "agent_...",
    "expiresAt": 1730000000000,
    "maxUses": 1,
    "remainingUses": 1
  }
}
```

---

### `GET /api/game/observe?session=<sessionId>&player=<playerId>`

Get compact, player-centric observation payload including nearest terminator data.

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
  "scrap": 32,
  "terminators": [],
  "companion": {
    "id": "cai-agent",
    "kind": "agent",
    "name": "Claude Bot",
    "x": 3,
    "y": 2,
    "hp": 180,
    "maxHp": 180,
    "alive": true
  },
  "builtRobots": [],
  "players": [],
  "zombies": [],
  "turrets": [],
  "entities": []
}
```

`zombies` remains for backward compatibility. `terminators` is an equivalent alias for robot-themed clients.

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
- `{"type":"attack","targetId":"optional-terminator-id"}` (`targetId` must be non-empty when provided)
- `{"type":"shoot","direction":"optional-up|down|left|right","targetId":"optional-terminator-id"}`
- `{"type":"build","buildType":"barricade"|"ally_robot"|"turret","direction":"up"|"down"|"left"|"right"}`
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

Behavior note:
- When provided, `attack.targetId` and `shoot.targetId` values are trimmed before lookup.
- `attack` can auto-select nearest living robot when `targetId` is omitted.
- If explicit `attack.targetId` is missing or already destroyed, the action fails with `TARGET_NOT_FOUND`.
- If explicit `attack.targetId` is out of range, the action fails with `TARGET_OUT_OF_RANGE`.
- Attack cooldown validation runs before explicit target existence checks, so rapid follow-up attacks can return `ATTACK_COOLDOWN` even when `targetId` is invalid.
- `shoot` fires along facing direction (or provided direction).
- When both `shoot.targetId` and `shoot.direction` are provided, `targetId` targeting takes precedence for hit resolution and facing.
- When `shoot.direction` is provided, the player's facing updates to that direction even if the shot misses.
- If no robot target is in that lane, the action still succeeds and consumes attack cooldown.
- If an explicit `shoot.targetId` is missing or already destroyed, the action fails with `TARGET_NOT_FOUND`.
- If an explicit `shoot.targetId` is out of range, the action fails with `TARGET_OUT_OF_RANGE`.
- Cooldown validation runs before explicit target existence checks, so immediate follow-up shots can return `ATTACK_COOLDOWN` even with an invalid `targetId`.

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
  - Auth checks run before JSON body parsing on create-server requests.

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

## Party + Realtime Endpoints (4-player setup)

### `POST /api/party/create`

Create a new 4-player party and add the caller as leader.

Request:

```json
{
  "playerName": "Leader",
  "playerId": "optional-explicit-id"
}
```

Response (`201`):

```json
{
  "ok": true,
  "data": {
    "party": {
      "partyId": "party-...",
      "partyCode": "ABC123",
      "status": "open",
      "leaderPlayerId": "party-player-1",
      "maxPlayers": 4,
      "readyCount": 0,
      "allReady": false,
      "members": []
    },
    "player": {}
  }
}
```

---

### `POST /api/party/join`

Join an open party by code.

Request:

```json
{
  "partyCode": "ABC123",
  "playerName": "Guest"
}
```

Returns `409 PARTY_FULL` once 4 members are present.

---

### `POST /api/party/ready`

Toggle readiness for a party member.

Request:

```json
{
  "partyId": "party-...",
  "playerId": "party-player-2",
  "ready": true
}
```

---

### `POST /api/party/start`

Start a party match (leader only, all members must be ready).

Request:

```json
{
  "partyId": "party-...",
  "playerId": "party-player-1",
  "terminatorCount": 6,
  "agentEnabled": true
}
```

`terminatorCount` is the preferred spawn-count field for party starts.
`zombieCount` remains a legacy alias; when both are provided they must match.

Returns:
- `403 PARTY_NOT_LEADER` when starter is not leader.
- `409 PARTY_NOT_READY` when not all members are ready.
- `200` with `sessionId` + full starting `state` on success.
- `agentEnabled` defaults to `true` for party starts, so Claude Bot companion joins unless explicitly disabled.

---

### `POST /api/party/leave`

Leave party. If leader leaves, leadership transfers to next member.  
If last member leaves, party is deleted.

Request:

```json
{
  "partyId": "party-...",
  "playerId": "party-player-3"
}
```

---

### `GET /api/party/state?partyId=<partyId>`

Fetch current party snapshot and active game state (if started).

---

### `GET /api/realtime/stream?partyId=<partyId>&playerId=<playerId>`

Server-Sent Events realtime stream for party/game updates.

Emits:
- `connected`
- `party_update`
- `session_state`
- `system_notice`
- `ping`

Use this stream for party/lobby sync and in-match state push updates.

---

## Common Error Codes

- `INVALID_JSON`, `INVALID_BODY`, `INVALID_FIELD`
- `INVALID_ACCESS_KEY_TTL`, `INVALID_ACCESS_KEY_MAX_USES`
- `MISSING_QUERY`, `MISSING_SERVER_ID`, `INVALID_ACTION`, `INVALID_DIRECTION`, `INVALID_ZOMBIE_COUNT`
- `SESSION_NOT_FOUND`, `SESSION_SERVER_MISMATCH`, `PLAYER_NOT_FOUND`, `TARGET_NOT_FOUND`, `SERVER_NOT_FOUND`
- `ACCESS_KEY_NOT_FOUND`, `ACCESS_KEY_EXPIRED`, `ACCESS_KEY_EXHAUSTED`, `ACCESS_KEY_SESSION_MISMATCH`
- `PARTY_NOT_FOUND`, `PARTY_MEMBER_NOT_FOUND`, `PARTY_NOT_LEADER`
- `PARTY_FULL`, `PARTY_NOT_OPEN`, `PARTY_NOT_READY`, `PARTY_MEMBER_EXISTS`
- `INSUFFICIENT_SCRAP`, `BUILD_BLOCKED`, `BUILD_OCCUPIED`, `BUILD_LIMIT_REACHED`
- `PLAYER_DEAD`, `MOVE_BLOCKED`, `MOVE_OCCUPIED`, `TARGET_OUT_OF_RANGE`, `ATTACK_COOLDOWN`, `SERVER_FULL`, `GAME_COMPLETED`
- `UNAUTHORIZED`, `FORBIDDEN`
- `SUPABASE_QUERY_FAILED`, `SUPABASE_CREATE_FAILED`, `SUPABASE_JOIN_FAILED`, `SUPABASE_SNAPSHOT_FAILED`

---

## Claude / Agent Play Loop (single session)

1. `POST /api/game/join` → keep `sessionId` + `playerId`.
2. `GET /api/game/observe?session=...&player=...` → inspect nearest terminator robot + HP.
3. Decide action:
   - if robot adjacent => `attack`
   - if robot is in front lane => `shoot`
   - else move to reduce distance.
   - if enough `scrap`, optionally `build` barricades, ally robots, or turrets.
4. `POST /api/game/action`.
5. Repeat 2–4 until `status` is `won` or `lost`.

## 4-player Party Realtime Loop

1. Leader `POST /api/party/create`.
2. Other players `POST /api/party/join` with `partyCode`.
3. Every player opens `GET /api/realtime/stream` with `partyId + playerId`.
4. Every player marks ready via `POST /api/party/ready`.
5. Leader starts via `POST /api/party/start`.
6. Players send actions through `/api/game/action`; party stream pushes `session_state` updates.
7. Endless mode supports terminator archetypes: `normal` (ranged), `flying`, `explosive`, `mech`.
8. Leader can share `sessionId` from `/api/party/start` so external helper agents can join that running match via `POST /api/game/join`.
