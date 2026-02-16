# RPC Terminator Siege Game (Bun + React)

Server-authoritative terminator survival game with:

- deterministic game engine
- RPC gameplay endpoints
- 4-player party lifecycle APIs (create/join/ready/start/leave)
- realtime SSE party/session updates
- optional CAI combat companion agent (enabled by default for party starts)
- endless wave mode with terminator archetypes:
  - normal (ranged shooter),
  - flying (fast mobility),
  - explosive (death splash),
  - mech (giant heavy unit)
- in-memory session/lobby management
- optional Supabase-backed lobby/auth mode
- React isometric canvas client + HUD + observation panel

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
