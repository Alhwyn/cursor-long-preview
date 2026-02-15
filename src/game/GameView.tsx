import { useCallback, useEffect, useMemo, useState } from "react";
import IsometricCanvas from "./IsometricCanvas";
import type { Action, GameState, Observation } from "./types";

interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

interface ApiSuccess<T> {
  ok: true;
  data: T;
}

interface ApiFailure {
  ok: false;
  error: ApiError;
}

type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

interface JoinGameResponse {
  sessionId: string;
  playerId: string;
  playerName: string;
  state: GameState;
  observation: Observation;
}

interface SessionStateResponse {
  sessionId: string;
  state: GameState;
}

interface ObserveResponse {
  sessionId: string;
  playerId: string;
  observation: Observation;
}

interface LobbyServer {
  id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  maxPlayers: number;
  currentPlayers: number;
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
}

interface ServersResponse {
  mode: "enabled" | "disabled";
  servers: LobbyServer[];
}

interface CreateServerResponse {
  mode: "enabled" | "disabled";
  server: LobbyServer;
}

interface JoinServerResponse {
  sessionId: string;
  playerId: string;
  playerName: string;
  state: GameState;
  observation: Observation;
  server: LobbyServer;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const payload = (await response.json()) as ApiResponse<T>;
  if (!payload.ok) {
    throw new Error(`${payload.error.code}: ${payload.error.message}`);
  }
  return payload.data;
}

export function GameView() {
  const [sessionId, setSessionId] = useState<string>("");
  const [playerId, setPlayerId] = useState<string>("");
  const [playerName, setPlayerName] = useState<string>("Survivor");
  const [sessionInput, setSessionInput] = useState<string>("");
  const [serverInput, setServerInput] = useState<string>("");
  const [state, setState] = useState<GameState | null>(null);
  const [observation, setObservation] = useState<Observation | null>(null);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);

  const [servers, setServers] = useState<LobbyServer[]>([]);
  const [supabaseMode, setSupabaseMode] = useState<"enabled" | "disabled">("disabled");
  const [serverName, setServerName] = useState<string>("Zombie Meadow");
  const [authToken, setAuthToken] = useState<string>("");

  const self = useMemo(() => {
    if (!state || !playerId) {
      return null;
    }
    return state.players[playerId] ?? null;
  }, [playerId, state]);

  const aliveZombies = useMemo(() => {
    if (!state) {
      return 0;
    }
    return Object.values(state.zombies).filter(zombie => zombie.alive).length;
  }, [state]);

  const callJoin = useCallback(
    async (payload: Record<string, unknown>) => {
      setBusy(true);
      setError("");
      try {
        const data = await request<JoinGameResponse>("/api/game/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setSessionId(data.sessionId);
        setPlayerId(data.playerId);
        setState(data.state);
        setObservation(data.observation);
      } catch (errorValue) {
        setError(String(errorValue));
      } finally {
        setBusy(false);
      }
    },
    [setBusy],
  );

  const refreshState = useCallback(async () => {
    if (!sessionId || !playerId) {
      return;
    }

    try {
      const stateData = await request<SessionStateResponse>(`/api/game/state?session=${encodeURIComponent(sessionId)}`);
      const observeData = await request<ObserveResponse>(
        `/api/game/observe?session=${encodeURIComponent(sessionId)}&player=${encodeURIComponent(playerId)}`,
      );
      setState(stateData.state);
      setObservation(observeData.observation);
    } catch (errorValue) {
      setError(String(errorValue));
    }
  }, [playerId, sessionId]);

  const sendAction = useCallback(
    async (action: Action) => {
      if (!sessionId || !playerId) {
        return;
      }
      setBusy(true);
      setError("");
      try {
        const data = await request<JoinGameResponse>("/api/game/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session: sessionId,
            playerId,
            action,
          }),
        });
        setState(data.state);
        setObservation(data.observation);
      } catch (errorValue) {
        setError(String(errorValue));
      } finally {
        setBusy(false);
      }
    },
    [playerId, sessionId],
  );

  const tick = useCallback(async () => {
    if (!sessionId) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await request<SessionStateResponse>("/api/game/tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session: sessionId }),
      });
      setState(data.state);
      await refreshState();
    } catch (errorValue) {
      setError(String(errorValue));
    } finally {
      setBusy(false);
    }
  }, [refreshState, sessionId]);

  const loadServers = useCallback(async () => {
    try {
      const data = await request<ServersResponse>("/api/servers");
      setServers(data.servers);
      setSupabaseMode(data.mode);
    } catch (errorValue) {
      setError(String(errorValue));
    }
  }, []);

  const createLobby = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (authToken.trim()) {
        headers.Authorization = `Bearer ${authToken.trim()}`;
      }

      const data = await request<CreateServerResponse>("/api/servers", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: serverName,
          maxPlayers: 4,
        }),
      });
      setSupabaseMode(data.mode);
      await loadServers();
    } catch (errorValue) {
      setError(String(errorValue));
    } finally {
      setBusy(false);
    }
  }, [authToken, loadServers, serverName]);

  const joinServer = useCallback(
    async (serverId: string) => {
      setBusy(true);
      setError("");
      try {
        const data = await request<JoinServerResponse>(`/api/servers/${encodeURIComponent(serverId)}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerName,
          }),
        });
        setSessionId(data.sessionId);
        setPlayerId(data.playerId);
        setState(data.state);
        setObservation(data.observation);
        setServerInput(serverId);
        await loadServers();
      } catch (errorValue) {
        setError(String(errorValue));
      } finally {
        setBusy(false);
      }
    },
    [loadServers, playerName],
  );

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  useEffect(() => {
    if (!sessionId || !playerId) {
      return;
    }

    const interval = window.setInterval(() => {
      void refreshState();
    }, 200);

    return () => window.clearInterval(interval);
  }, [playerId, refreshState, sessionId]);

  return (
    <div className="w-full max-w-[1400px] mx-auto p-4 md:p-6 text-slate-100">
      <h1 className="text-3xl md:text-4xl font-semibold mb-2">RPC Zombie Game</h1>
      <p className="text-slate-400 mb-4">Server-authoritative tick simulation with optional Supabase lobby mode.</p>

      <div className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
        <section className="space-y-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3">
            <h2 className="font-semibold text-lg">Join / Start Session</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-sm text-slate-300">
                Player Name
                <input
                  value={playerName}
                  onChange={event => setPlayerName(event.target.value)}
                  className="mt-1 w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2"
                />
              </label>
              <label className="text-sm text-slate-300">
                Existing Session (optional)
                <input
                  value={sessionInput}
                  onChange={event => setSessionInput(event.target.value)}
                  className="mt-1 w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2"
                />
              </label>
              <label className="text-sm text-slate-300 sm:col-span-2">
                Server ID (optional)
                <input
                  value={serverInput}
                  onChange={event => setServerInput(event.target.value)}
                  className="mt-1 w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2"
                />
              </label>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void callJoin({
                  playerName,
                  session: sessionInput || undefined,
                  serverId: serverInput || undefined,
                })
              }
              className="rounded-md bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 px-4 py-2 font-medium text-slate-950"
            >
              {busy ? "Working..." : "Join Game"}
            </button>
            <div className="text-sm text-slate-400">
              Session: <span className="text-slate-200">{sessionId || "—"}</span> | Player:{" "}
              <span className="text-slate-200">{playerId || "—"}</span>
            </div>
          </div>

          <IsometricCanvas state={state} />

          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <h2 className="font-semibold text-lg mb-3">Action Controls</h2>
            <div className="grid grid-cols-3 gap-2 max-w-[280px]">
              <button
                type="button"
                onClick={() => void sendAction({ type: "move", direction: "up" })}
                className="col-start-2 rounded bg-slate-800 hover:bg-slate-700 px-3 py-2"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => void sendAction({ type: "move", direction: "left" })}
                className="rounded bg-slate-800 hover:bg-slate-700 px-3 py-2"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => void sendAction({ type: "wait" })}
                className="rounded bg-slate-700 hover:bg-slate-600 px-3 py-2"
              >
                Wait
              </button>
              <button
                type="button"
                onClick={() => void sendAction({ type: "move", direction: "right" })}
                className="rounded bg-slate-800 hover:bg-slate-700 px-3 py-2"
              >
                →
              </button>
              <button
                type="button"
                onClick={() => void sendAction({ type: "move", direction: "down" })}
                className="col-start-2 rounded bg-slate-800 hover:bg-slate-700 px-3 py-2"
              >
                ↓
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <button
                type="button"
                onClick={() => void sendAction({ type: "attack" })}
                className="rounded bg-rose-500 hover:bg-rose-400 text-slate-950 font-medium px-4 py-2"
              >
                Attack Nearest
              </button>
              <button type="button" onClick={() => void tick()} className="rounded bg-indigo-500 hover:bg-indigo-400 px-4 py-2">
                Manual Tick
              </button>
              <button type="button" onClick={() => void refreshState()} className="rounded bg-slate-700 hover:bg-slate-600 px-4 py-2">
                Refresh
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-2">
            <h2 className="font-semibold text-lg">HUD</h2>
            <div className="text-sm text-slate-300">Status: {state?.status ?? "idle"}</div>
            <div className="text-sm text-slate-300">Tick: {state?.tick ?? 0}</div>
            <div className="text-sm text-slate-300">HP: {self ? `${self.hp}/${self.maxHp}` : "—"}</div>
            <div className="text-sm text-slate-300">Zombies Alive: {aliveZombies}</div>
            {state?.status === "won" ? <div className="text-emerald-400 font-medium">You survived. Zombies cleared.</div> : null}
            {state?.status === "lost" ? <div className="text-rose-400 font-medium">All survivors are down.</div> : null}
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3">
            <h2 className="font-semibold text-lg">Servers ({supabaseMode})</h2>
            <label className="text-sm text-slate-300 block">
              Supabase Bearer Token (optional, required in enabled mode for create)
              <input
                value={authToken}
                onChange={event => setAuthToken(event.target.value)}
                className="mt-1 w-full rounded-md bg-slate-950 border border-slate-700 px-3 py-2"
              />
            </label>
            <div className="grid gap-2">
              <input
                value={serverName}
                onChange={event => setServerName(event.target.value)}
                className="rounded-md bg-slate-950 border border-slate-700 px-3 py-2"
                placeholder="Server name"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => void createLobby()} className="rounded bg-amber-400 text-slate-950 px-3 py-2 font-medium">
                  Create Server
                </button>
                <button type="button" onClick={() => void loadServers()} className="rounded bg-slate-700 hover:bg-slate-600 px-3 py-2">
                  Refresh List
                </button>
              </div>
            </div>
            <div className="space-y-2 max-h-[280px] overflow-auto pr-1">
              {servers.length === 0 ? (
                <div className="text-sm text-slate-400">No servers yet.</div>
              ) : (
                servers.map(server => (
                  <div key={server.id} className="border border-slate-700 rounded-lg p-2">
                    <div className="font-medium">{server.name}</div>
                    <div className="text-xs text-slate-400 break-all">ID: {server.id}</div>
                    <div className="text-xs text-slate-400">
                      Players: {server.currentPlayers}/{server.maxPlayers}
                    </div>
                    <button
                      type="button"
                      onClick={() => void joinServer(server.id)}
                      className="mt-2 rounded bg-cyan-500 text-slate-950 px-3 py-1 text-sm font-medium"
                    >
                      Join Server
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <h2 className="font-semibold text-lg mb-2">Observation</h2>
            <pre className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs overflow-auto max-h-[320px]">
              {observation ? JSON.stringify(observation, null, 2) : "No observation yet."}
            </pre>
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
            <h2 className="font-semibold text-lg mb-2">Errors</h2>
            <div className={`text-sm ${error ? "text-rose-300" : "text-slate-500"}`}>{error || "No errors."}</div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default GameView;
