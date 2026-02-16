import { useCallback, useEffect, useMemo, useState } from "react";
import IsometricCanvas from "./IsometricCanvas";
import type { Action, GameState, Observation, PartyState } from "./types";

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

interface PartySnapshot extends PartyState {
  readyCount: number;
  allReady: boolean;
}

interface PartyResponse {
  party: PartySnapshot;
  player: {
    playerId: string;
    playerName: string;
    ready: boolean;
    joinedAt: number;
  };
}

interface PartyStateResponse {
  party: PartySnapshot;
  state?: GameState;
}

interface PartyStartResponse {
  party: PartySnapshot;
  sessionId: string;
  state: GameState;
}

interface PartyLeaveResponse {
  party: PartySnapshot | null;
}

interface RealtimeEnvelope<T = unknown> {
  type: string;
  timestamp: number;
  data: T;
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
  const [playerName, setPlayerName] = useState<string>("PartyHero");
  const [sessionInput, setSessionInput] = useState<string>("");
  const [serverInput, setServerInput] = useState<string>("");
  const [state, setState] = useState<GameState | null>(null);
  const [observation, setObservation] = useState<Observation | null>(null);
  const [error, setError] = useState<string>("");
  const [busy, setBusy] = useState<boolean>(false);
  const [systemFeed, setSystemFeed] = useState<string[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState<"offline" | "connecting" | "live" | "degraded">("offline");

  const [servers, setServers] = useState<LobbyServer[]>([]);
  const [supabaseMode, setSupabaseMode] = useState<"enabled" | "disabled">("disabled");
  const [serverName, setServerName] = useState<string>("Terminator Frontier");
  const [authToken, setAuthToken] = useState<string>("");
  const [partyCodeInput, setPartyCodeInput] = useState<string>("");
  const [party, setParty] = useState<PartySnapshot | null>(null);

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

  const selfPartyMember = useMemo(() => {
    if (!party || !playerId) {
      return null;
    }
    return party.members.find(member => member.playerId === playerId) ?? null;
  }, [party, playerId]);

  const isPartyLeader = useMemo(() => {
    if (!party || !playerId) {
      return false;
    }
    return party.leaderPlayerId === playerId;
  }, [party, playerId]);

  const canStartParty = useMemo(() => {
    return Boolean(party && isPartyLeader && party.status === "open" && party.allReady);
  }, [isPartyLeader, party]);

  const pushSystemFeed = useCallback((message: string) => {
    setSystemFeed(previous => [message, ...previous].slice(0, 16));
  }, []);

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
        if (!party) {
          setRealtimeStatus("offline");
        }
      } catch (errorValue) {
        setError(String(errorValue));
      } finally {
        setBusy(false);
      }
    },
    [party, setBusy],
  );

  const refreshObservation = useCallback(async (targetSessionId: string, targetPlayerId: string) => {
    const observeData = await request<ObserveResponse>(
      `/api/game/observe?session=${encodeURIComponent(targetSessionId)}&player=${encodeURIComponent(targetPlayerId)}`,
    );
    setObservation(observeData.observation);
  }, []);

  const refreshState = useCallback(async () => {
    if (!sessionId || !playerId || realtimeStatus === "live") {
      return;
    }

    try {
      const stateData = await request<SessionStateResponse>(`/api/game/state?session=${encodeURIComponent(sessionId)}`);
      setState(stateData.state);
      await refreshObservation(sessionId, playerId);
    } catch (errorValue) {
      setError(String(errorValue));
    }
  }, [playerId, realtimeStatus, refreshObservation, sessionId]);

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
        pushSystemFeed(`Action rejected: ${String(errorValue)}`);
      } finally {
        setBusy(false);
      }
    },
    [playerId, pushSystemFeed, sessionId],
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
      await refreshObservation(sessionId, playerId);
    } catch (errorValue) {
      setError(String(errorValue));
      pushSystemFeed(`Tick failed: ${String(errorValue)}`);
    } finally {
      setBusy(false);
    }
  }, [playerId, pushSystemFeed, refreshObservation, sessionId]);

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

  const createPartyLobby = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const data = await request<PartyResponse>("/api/party/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerName,
        }),
      });

      setParty(data.party);
      setPlayerId(data.player.playerId);
      setPartyCodeInput(data.party.partyCode);
      setRealtimeStatus("connecting");
      pushSystemFeed(`Party created (${data.party.partyCode}).`);
    } catch (errorValue) {
      setError(String(errorValue));
    } finally {
      setBusy(false);
    }
  }, [playerName, pushSystemFeed]);

  const joinPartyLobby = useCallback(async () => {
    if (!partyCodeInput.trim()) {
      setError("Party code is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await request<PartyResponse>("/api/party/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partyCode: partyCodeInput.trim(),
          playerName,
        }),
      });
      setParty(data.party);
      setPlayerId(data.player.playerId);
      setRealtimeStatus("connecting");
      pushSystemFeed(`Joined party ${data.party.partyCode}.`);
    } catch (errorValue) {
      setError(String(errorValue));
    } finally {
      setBusy(false);
    }
  }, [partyCodeInput, playerName, pushSystemFeed]);

  const togglePartyReady = useCallback(async () => {
    if (!party || !playerId) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await request<{ party: PartySnapshot }>("/api/party/ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partyId: party.partyId,
          playerId,
          ready: !selfPartyMember?.ready,
        }),
      });
      setParty(data.party);
    } catch (errorValue) {
      setError(String(errorValue));
    } finally {
      setBusy(false);
    }
  }, [party, playerId, selfPartyMember?.ready]);

  const startPartyMatch = useCallback(async () => {
    if (!party || !playerId) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await request<PartyStartResponse>("/api/party/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partyId: party.partyId,
          playerId,
        }),
      });
      setParty(data.party);
      setSessionId(data.sessionId);
      setState(data.state);
      await refreshObservation(data.sessionId, playerId);
      pushSystemFeed("Party match started.");
    } catch (errorValue) {
      setError(String(errorValue));
    } finally {
      setBusy(false);
    }
  }, [party, playerId, pushSystemFeed, refreshObservation]);

  const leavePartyLobby = useCallback(async () => {
    if (!party || !playerId) {
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = await request<PartyLeaveResponse>("/api/party/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partyId: party.partyId,
          playerId,
        }),
      });

      if (!data.party) {
        setParty(null);
        setPartyCodeInput("");
        setRealtimeStatus("offline");
      } else {
        setParty(data.party);
      }
      pushSystemFeed("Left current party.");
    } catch (errorValue) {
      setError(String(errorValue));
    } finally {
      setBusy(false);
    }
  }, [party, playerId, pushSystemFeed]);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  useEffect(() => {
    if (!sessionId || !playerId || realtimeStatus === "live") {
      return;
    }

    const interval = window.setInterval(() => {
      void refreshState();
    }, 350);

    return () => window.clearInterval(interval);
  }, [playerId, realtimeStatus, refreshState, sessionId]);

  useEffect(() => {
    if (!party || !playerId) {
      setRealtimeStatus("offline");
      return;
    }

    setRealtimeStatus("connecting");
    const source = new EventSource(
      `/api/realtime/stream?partyId=${encodeURIComponent(party.partyId)}&playerId=${encodeURIComponent(playerId)}`,
    );

    source.addEventListener("connected", event => {
      const envelope = JSON.parse((event as MessageEvent<string>).data) as RealtimeEnvelope<{
        partyId: string;
        playerId: string;
      }>;
      setRealtimeStatus("live");
      pushSystemFeed(`Realtime sync active for ${envelope.data.partyId}.`);
    });

    source.addEventListener("party_update", event => {
      const envelope = JSON.parse((event as MessageEvent<string>).data) as RealtimeEnvelope<{ party: PartySnapshot }>;
      setParty(envelope.data.party);
    });

    source.addEventListener("session_state", event => {
      const envelope = JSON.parse((event as MessageEvent<string>).data) as RealtimeEnvelope<{
        sessionId: string;
        state: GameState;
      }>;
      setSessionId(envelope.data.sessionId);
      setState(envelope.data.state);
      void refreshObservation(envelope.data.sessionId, playerId);
    });

    source.addEventListener("system_notice", event => {
      const envelope = JSON.parse((event as MessageEvent<string>).data) as RealtimeEnvelope<{ level: string; message: string }>;
      pushSystemFeed(`${envelope.data.level.toUpperCase()}: ${envelope.data.message}`);
    });

    source.onerror = () => {
      setRealtimeStatus("degraded");
    };

    return () => {
      source.close();
    };
  }, [party, playerId, pushSystemFeed, refreshObservation]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) {
        return;
      }
      if (!sessionId || !playerId || !state || state.status !== "active") {
        return;
      }

      const key = event.key.toLowerCase();
      if (key === "w" || key === "arrowup") {
        event.preventDefault();
        void sendAction({ type: "move", direction: "up" });
      } else if (key === "s" || key === "arrowdown") {
        event.preventDefault();
        void sendAction({ type: "move", direction: "down" });
      } else if (key === "a" || key === "arrowleft") {
        event.preventDefault();
        void sendAction({ type: "move", direction: "left" });
      } else if (key === "d" || key === "arrowright") {
        event.preventDefault();
        void sendAction({ type: "move", direction: "right" });
      } else if (key === " ") {
        event.preventDefault();
        void sendAction({ type: "attack" });
      } else if (key === "enter") {
        event.preventDefault();
        void sendAction({ type: "wait" });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [playerId, sendAction, sessionId, state]);

  return (
    <div className="w-full max-w-[1500px] mx-auto p-4 md:p-6 text-slate-100">
      <div className="rounded-2xl border border-emerald-400/20 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-5 mb-4 shadow-[0_0_60px_rgba(16,185,129,0.08)]">
        <h1 className="text-3xl md:text-4xl font-semibold mb-2 tracking-tight">Terminator Siege Realtime</h1>
        <p className="text-slate-300">
          4-player server-authoritative co-op with realtime party sync and low-poly inspired isometric rendering.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.8fr_1fr]">
        <section className="space-y-4">
          <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-4 space-y-3">
            <h2 className="font-semibold text-lg">Direct Session (fallback RPC mode)</h2>
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
            <div className="mt-3 text-xs text-slate-400">
              Keyboard: <span className="text-slate-200">WASD / Arrows</span> move,{" "}
              <span className="text-slate-200">Space</span> attack, <span className="text-slate-200">Enter</span> wait.
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-3">
            <h2 className="font-semibold text-lg">Party Lobby (4 players)</h2>
            <div className="grid gap-2">
              <input
                value={playerName}
                onChange={event => setPlayerName(event.target.value)}
                className="rounded-md bg-slate-950 border border-slate-700 px-3 py-2"
                placeholder="Display name"
              />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void createPartyLobby()}
                  className="rounded bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-slate-950 px-3 py-2 font-medium"
                >
                  Create Party
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void joinPartyLobby()}
                  className="rounded bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-slate-950 px-3 py-2 font-medium"
                >
                  Join by Code
                </button>
              </div>
              <input
                value={partyCodeInput}
                onChange={event => setPartyCodeInput(event.target.value.toUpperCase())}
                className="rounded-md bg-slate-950 border border-slate-700 px-3 py-2 tracking-[0.25em] uppercase"
                placeholder="PARTY CODE"
                maxLength={8}
              />
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 space-y-2">
              <div className="text-xs uppercase tracking-wide text-slate-400">Realtime</div>
              <div
                className={`text-sm font-medium ${
                  realtimeStatus === "live"
                    ? "text-emerald-300"
                    : realtimeStatus === "connecting"
                      ? "text-amber-300"
                      : realtimeStatus === "degraded"
                        ? "text-rose-300"
                        : "text-slate-400"
                }`}
              >
                {realtimeStatus}
              </div>
              <div className="text-xs text-slate-500">Status auto-updates for party and match events.</div>
            </div>

            {party ? (
              <div className="rounded-lg border border-slate-700 bg-slate-950/60 p-3 space-y-2">
                <div className="text-xs uppercase tracking-wide text-slate-400">Party</div>
                <div className="text-sm">Code: <span className="font-semibold tracking-[0.2em]">{party.partyCode}</span></div>
                <div className="text-sm">
                  Members: {party.members.length}/{party.maxPlayers} | Ready: {party.readyCount}/{party.members.length}
                </div>
                <div className="space-y-1">
                  {party.members.map(member => (
                    <div key={member.playerId} className="flex items-center justify-between text-sm">
                      <span className="truncate">
                        {member.playerName}
                        {member.playerId === party.leaderPlayerId ? " (Leader)" : ""}
                        {member.playerId === playerId ? " (You)" : ""}
                      </span>
                      <span className={member.ready ? "text-emerald-300" : "text-amber-300"}>{member.ready ? "Ready" : "Not Ready"}</span>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    disabled={busy || !selfPartyMember || party.status !== "open"}
                    onClick={() => void togglePartyReady()}
                    className="rounded bg-violet-500 hover:bg-violet-400 disabled:opacity-60 px-3 py-1 text-sm font-medium text-slate-950"
                  >
                    {selfPartyMember?.ready ? "Unready" : "Ready Up"}
                  </button>
                  <button
                    type="button"
                    disabled={busy || !canStartParty}
                    onClick={() => void startPartyMatch()}
                    className="rounded bg-amber-400 hover:bg-amber-300 disabled:opacity-60 px-3 py-1 text-sm font-medium text-slate-950"
                  >
                    Start Match
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void leavePartyLobby()}
                    className="rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-60 px-3 py-1 text-sm"
                  >
                    Leave Party
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 space-y-2">
            <h2 className="font-semibold text-lg">HUD</h2>
            <div className="text-sm text-slate-300">Status: {state?.status ?? "idle"}</div>
            <div className="text-sm text-slate-300">Tick: {state?.tick ?? 0}</div>
            <div className="text-sm text-slate-300">Mode: {state?.mode ?? "—"}</div>
            <div className="text-sm text-slate-300">Wave: {state?.wave ?? 0}</div>
            <div className="text-sm text-slate-300">HP: {self ? `${self.hp}/${self.maxHp}` : "—"}</div>
            <div className="text-sm text-slate-300">Terminators Active: {aliveZombies}</div>
            <div className="text-sm text-slate-300">
              CAI Companion:{" "}
              {state?.companion
                ? `${state.companion.alive ? "active" : "down"} (${state.companion.hp}/${state.companion.maxHp}) • ${state.companion.emote}`
                : "off"}
            </div>
            <div className="text-sm text-slate-300">Party Mode: {party ? `${party.members.length}/4` : "No active party"}</div>
            {state?.status === "won" ? <div className="text-emerald-400 font-medium">You survived. Terminator wave cleared.</div> : null}
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
            <h2 className="font-semibold text-lg mb-2">System Feed</h2>
            <div className="space-y-1 max-h-[160px] overflow-auto pr-1 text-xs">
              {systemFeed.length === 0 ? <div className="text-slate-500">No events yet.</div> : null}
              {systemFeed.map((message, index) => (
                <div key={`${message}-${index}`} className="text-slate-300">
                  • {message}
                </div>
              ))}
            </div>
            <h3 className="font-semibold text-sm mt-3 mb-1">Errors</h3>
            <div className={`text-sm ${error ? "text-rose-300" : "text-slate-500"}`}>{error || "No errors."}</div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default GameView;
