import { useCallback, useEffect, useMemo, useState } from "react";
import {
  request,
  type CreateServerResponse,
  type JoinGameResponse,
  type JoinServerResponse,
  type LobbyServer,
  type ObserveResponse,
  type PartyLeaveResponse,
  type PartyResponse,
  type PartySnapshot,
  type PartyStartResponse,
  type RealtimeEnvelope,
  type ServersResponse,
  type SessionStateResponse,
} from "../api";
import type { Action, GameState, Observation } from "../types";
import { useShooterKeyboard } from "./useShooterKeyboard";

export interface GameViewController {
  busy: boolean;
  playerName: string;
  setPlayerName: (next: string) => void;
  sessionInput: string;
  setSessionInput: (next: string) => void;
  serverInput: string;
  setServerInput: (next: string) => void;
  sessionId: string;
  playerId: string;
  state: GameState | null;
  observation: Observation | null;
  error: string;
  systemFeed: string[];
  realtimeStatus: "offline" | "connecting" | "live" | "degraded";
  servers: LobbyServer[];
  supabaseMode: "enabled" | "disabled";
  serverName: string;
  setServerName: (next: string) => void;
  authToken: string;
  setAuthToken: (next: string) => void;
  partyCodeInput: string;
  setPartyCodeInput: (next: string) => void;
  party: PartySnapshot | null;
  self: GameState["players"][string] | null;
  selfPartyMember: PartySnapshot["members"][number] | null;
  canStartParty: boolean;
  aliveTerminators: number;
  callJoin: (payload: Record<string, unknown>) => Promise<void>;
  sendAction: (action: Action) => Promise<void>;
  tick: () => Promise<void>;
  refreshState: () => Promise<void>;
  createLobby: () => Promise<void>;
  loadServers: () => Promise<void>;
  joinServer: (serverId: string) => Promise<void>;
  createPartyLobby: () => Promise<void>;
  joinPartyLobby: () => Promise<void>;
  togglePartyReady: () => Promise<void>;
  startPartyMatch: () => Promise<void>;
  leavePartyLobby: () => Promise<void>;
}

export function useGameViewController(): GameViewController {
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

  const aliveTerminators = useMemo(() => {
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

  const refreshObservation = useCallback(async (targetSessionId: string, targetPlayerId: string) => {
    const observeData = await request<ObserveResponse>(
      `/api/game/observe?session=${encodeURIComponent(targetSessionId)}&player=${encodeURIComponent(targetPlayerId)}`,
    );
    setObservation(observeData.observation);
  }, []);

  const loadServers = useCallback(async () => {
    try {
      const data = await request<ServersResponse>("/api/servers");
      setServers(data.servers);
      setSupabaseMode(data.mode);
    } catch (errorValue) {
      setError(String(errorValue));
    }
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
    [party],
  );

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
    async (targetServerId: string) => {
      setBusy(true);
      setError("");
      try {
        const data = await request<JoinServerResponse>(`/api/servers/${encodeURIComponent(targetServerId)}/join`, {
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
        setServerInput(targetServerId);
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

  useShooterKeyboard({
    sessionId,
    playerId,
    state,
    facing: self?.facing,
    onAction: action => {
      void sendAction(action);
    },
  });

  return {
    busy,
    playerName,
    setPlayerName,
    sessionInput,
    setSessionInput,
    serverInput,
    setServerInput,
    sessionId,
    playerId,
    state,
    observation,
    error,
    systemFeed,
    realtimeStatus,
    servers,
    supabaseMode,
    serverName,
    setServerName,
    authToken,
    setAuthToken,
    partyCodeInput,
    setPartyCodeInput,
    party,
    self,
    selfPartyMember,
    canStartParty,
    aliveTerminators,
    callJoin,
    sendAction,
    tick,
    refreshState,
    createLobby,
    loadServers,
    joinServer,
    createPartyLobby,
    joinPartyLobby,
    togglePartyReady,
    startPartyMatch,
    leavePartyLobby,
  };
}

export default useGameViewController;
