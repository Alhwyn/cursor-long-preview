# RPC Terminator Robot Defense Game (Bun + React)

Server-authoritative terminator survival game with:

- deterministic game engine
- RPC gameplay endpoints
- 4-player party lifecycle APIs (create/join/ready/start/leave)
- realtime SSE party/session updates
- optional Claude Bot combat companion agent (enabled by default for party starts)
- scrap economy + build actions (barricades, deployable ally robots, and turrets)
- endless wave mode with terminator archetypes:
  - normal (ranged shooter),
  - flying (fast mobility),
  - explosive (death splash),
  - mech (giant heavy unit)
- in-memory session/lobby management
- optional Supabase-backed lobby/auth mode
- React 3D raycast shooter canvas client + HUD + observation panel

## Shooter Controls (default client)

- Move: `WASD` / arrow keys
- Shoot forward: `Space`
- Attack nearest terminator: `F`
- Build in facing direction:
  - `1` barricade
  - `2` ally robot
  - `3` turret

## Install

```bash
bun install
```

## Run (development)

```bash
bun dev
```

Open `http://127.0.0.1:3000`.

## Build

```bash
bun run build
```

## Test

```bash
bun test
```

## API Smoke Test

Run while server is already running:

```bash
bun run smoke:api
```

Supabase-auth gate smoke test (run server with Supabase env vars set):

```bash
bun run smoke:api:supabase-auth
```

Party + realtime smoke test:

```bash
bun run smoke:api:party
```

## Full Verification

Runs strict typecheck, tests, production build, fallback smoke test, party/realtime smoke test, and Supabase auth-gate smoke test:

```bash
bun run verify
```

## Supabase Mode

Supabase is enabled only when all env vars are set:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Without these, lobby APIs fall back to local in-memory mode for development.

See `GAME_API.md` for endpoint contracts and agent play loop guidance.

## Agent Join Handoff (`sessionId`)

If a user wants their own agent to join an already-running match:

1. Start or join a match (party or direct flow).
2. Share the active `sessionId` with the agent.
3. Agent joins with:

```bash
curl -s -X POST http://127.0.0.1:3000/api/game/join \
  -H "Content-Type: application/json" \
  -d '{"session":"<SESSION_ID>","playerName":"Agent Ally"}'
```

The join response returns the agent `playerId` to use for `/api/game/observe` and `/api/game/action`.

## Temporary Agent Access Key (recommended)

For safer handoff during live play:

1. In-session player mints temporary key:

```bash
curl -s -X POST http://127.0.0.1:3000/api/agent/access-key \
  -H "Content-Type: application/json" \
  -d '{"session":"<SESSION_ID>","playerId":"<PLAYER_ID>"}'
```

2. Helper AI joins with the returned `accessKey`:

```bash
curl -s -X POST http://127.0.0.1:3000/api/game/join \
  -H "Content-Type: application/json" \
  -d '{"accessKey":"<ACCESS_KEY>","playerName":"Agent Ally"}'
```

By default keys are temporary and single-use.
