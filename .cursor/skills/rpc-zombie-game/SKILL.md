# RPC Terminator Siege Skill

Use this skill when an agent needs to play or test the RPC terminator-siege game through HTTP endpoints.

## Goal

Drive the server-authoritative simulation through API actions without direct state mutation.
Leverage Claude Bot companion support when enabled (combat-capable in-session agent ally).

## Preconditions

- Backend is running (`bun dev` or `bun src/index.ts`).
- Base URL defaults to `http://127.0.0.1:3000`.

## Quick Single-Session Flow

1. Join game:
   - `POST /api/game/join` with `{ "playerName": "Agent" }`
2. Store `sessionId` and `playerId`.
3. Loop:
   - `GET /api/game/observe?session=<id>&player=<id>`
   - Decide action (`move`, `attack`, `build`, `wait`)
   - `POST /api/game/action`
4. Stop when state/observation `status` becomes `won` or `lost`.

## Agent Handoff (install skill + join by `sessionId`)

Use this when a human player wants their own agent to drop into an already-running match:

1. Install this skill in the agent runtime.
2. Human shares:
   - `baseUrl`
   - `sessionId`
3. Agent joins that exact session:
   - `POST /api/game/join`
   - body: `{ "session":"<SESSION_ID>", "playerName":"Agent Ally" }`
4. Agent stores returned `playerId` and uses normal observe/action loop.

Notes:
- Do **not** fabricate `playerId`; let server assign unless rejoining an existing identity.
- If the shared session is full (server-linked flow), join may return `SERVER_FULL`.
- If session is invalid/finished, re-bootstrap through party/lobby flow.

## Secure Agent Handoff (temporary access key)

When a player wants to authorize an external AI safely during an active game:

1. Player requests a temporary key:
   - `POST /api/agent/access-key`
   - body: `{ "session":"<SESSION_ID>", "playerId":"<PLAYER_ID>" }`
2. Share returned `accessKey` with the helper AI.
3. Helper AI joins without exposing raw session control:
   - `POST /api/game/join`
   - body: `{ "accessKey":"<ACCESS_KEY>", "playerName":"Agent Ally" }`
4. Helper AI then uses normal observe/action loop.

Default behavior:
- key is temporary (`ttlSeconds` supported)
- key is single-use unless `maxUses` is explicitly increased by issuer

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
7. Expect Claude Bot companion in state/observation when `agentEnabled` is true (default for party starts).
8. For external agents, share the returned `sessionId` from `/api/party/start`, then each agent joins with `POST /api/game/join` using that `session`.

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

- Prefer attacking when nearest terminator distance is `<= 1`.
- Otherwise move along axis indicated by nearest terminator `(dx, dy)`.
- Respect cooldown conflicts (`ATTACK_COOLDOWN`) by sending `wait` or movement.
- Build economy:
  - `state.scrap` increases when terminators are destroyed.
  - Build barricade with `{"type":"build","buildType":"barricade","direction":"<dir>"}` (costs scrap).
  - Deploy ally robot with `{"type":"build","buildType":"ally_robot","direction":"<dir>"}` when enough scrap.

## References

See `reference.md` for endpoint payload examples and error mapping.

## Verification commands

- `bun run smoke:api` (fallback mode smoke checks)
- `bun run smoke:api:party` (party + realtime smoke checks)
- `bun run smoke:api:supabase-auth` (auth gate smoke checks)
- `bun run verify` (typecheck + tests + build + fallback smoke + party smoke + auth smoke)
