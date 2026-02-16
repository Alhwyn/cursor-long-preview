# RPC Zombie Game Skill

Use this skill when an agent needs to play or test the RPC zombie game through HTTP endpoints.

## Goal

Drive the server-authoritative simulation through API actions without direct state mutation.

## Preconditions

- Backend is running (`bun dev` or `bun src/index.ts`).
- Base URL defaults to `http://127.0.0.1:3000`.

## Quick Single-Session Flow

1. Join game:
   - `POST /api/game/join` with `{ "playerName": "Agent" }`
2. Store `sessionId` and `playerId`.
3. Loop:
   - `GET /api/game/observe?session=<id>&player=<id>`
   - Decide action (`move`, `attack`, `wait`)
   - `POST /api/game/action`
4. Stop when state/observation `status` becomes `won` or `lost`.

## Multiplayer / Lobby Flow

1. `GET /api/servers` for available servers.
2. If needed create server:
   - `POST /api/servers` with `{ "name": "My Server", "maxPlayers": 4 }`
3. Join server:
   - `POST /api/servers/:id/join`
4. Use returned `sessionId` + `playerId` in normal game loop endpoints.

## 4-Player Party Realtime Flow

1. Leader creates party:
   - `POST /api/party/create`
2. Share `partyCode`; other players join:
   - `POST /api/party/join`
3. Open realtime stream for each member:
   - `GET /api/realtime/stream?partyId=<id>&playerId=<id>` (SSE)
4. Each player toggles ready:
   - `POST /api/party/ready`
5. Leader starts match:
   - `POST /api/party/start`
6. Play through `/api/game/action`; consume `session_state` events from SSE.

### Important session/server constraints

- If calling `POST /api/game/join` with `serverId`, the server must exist, else `SERVER_NOT_FOUND`.
- If calling `POST /api/game/join` with both `session` and `serverId`, they must match, else `SESSION_SERVER_MISMATCH`.
- If target session belongs to a lobby server at max capacity, join returns `SERVER_FULL`.
- Optional identifiers (`session`, `serverId`, `playerId`, observe `player`, attack `targetId`) must be non-empty strings when provided; blank strings return `INVALID_FIELD`.
- Identifier values are trimmed server-side before lookup; `"  abc  "` is treated as `"abc"`.
- Lobby join route identifiers are trimmed server-side too; `/api/servers/%20<id>%20/join` resolves to `<id>`, while blank route IDs return `MISSING_SERVER_ID`.

## Auth Behavior

- If response from `/api/servers` contains `mode: "disabled"`:
  - local fallback; create-server route is open.
- If `mode: "enabled"`:
  - create-server requires `Authorization: Bearer <Supabase JWT>`.
  - Missing token (or non-Bearer auth header) => `401`, invalid bearer token => `403`.
  - `Bearer` scheme parsing is case-insensitive and ignores extra spaces before token value.
  - Auth validation happens before request-body JSON validation for create-server.

## Action Strategy Hint

- Prefer attacking when nearest zombie distance is `<= 1`.
- Otherwise move along axis indicated by nearest zombie `(dx, dy)`.
- Respect cooldown conflicts (`ATTACK_COOLDOWN`) by sending `wait` or movement.

## References

See `reference.md` for endpoint payload examples and error mapping.

## Verification commands

- `bun run smoke:api` (fallback mode smoke checks)
- `bun run smoke:api:party` (party + realtime smoke checks)
- `bun run smoke:api:supabase-auth` (auth gate smoke checks)
- `bun run verify` (typecheck + tests + build + fallback smoke + party smoke + auth smoke)
