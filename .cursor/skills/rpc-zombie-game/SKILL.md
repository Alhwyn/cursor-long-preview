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

## Auth Behavior

- If response from `/api/servers` contains `mode: "disabled"`:
  - local fallback; create-server route is open.
- If `mode: "enabled"`:
  - create-server requires `Authorization: Bearer <Supabase JWT>`.
  - Missing token => `401`, invalid token => `403`.

## Action Strategy Hint

- Prefer attacking when nearest zombie distance is `<= 1`.
- Otherwise move along axis indicated by nearest zombie `(dx, dy)`.
- Respect cooldown conflicts (`ATTACK_COOLDOWN`) by sending `wait` or movement.

## References

See `reference.md` for endpoint payload examples and error mapping.
