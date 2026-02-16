import { useCallback, useEffect, useState } from "react";
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
  type ServersResponse,
  type SessionStateResponse,
} from "../api";
import type { RealtimeStatus } from "../realtimeStatus";
import type { Action, GameState, Observation } from "../types";
import { useBusyMutation } from "./useBusyMutation";
import { useGameViewDerivedState } from "./useGameViewDerivedState";
import { usePartyRealtimeStream } from "./usePartyRealtimeStream";
import { useSessionPolling } from "./useSessionPolling";
import { useSystemFeed } from "./useSystemFeed";
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
  realtimeStatus: RealtimeStatus;
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
  const { busy, error, setErrorMessage, runBusyMutation } = useBusyMutation();
  const { systemFeed, pushSystemFeed } = useSystemFeed(16);

  const [servers, setServers] = useState<LobbyServer[]>([]);
  const [supabaseMode, setSupabaseMode] = useState<"enabled" | "disabled">("disabled");
  const [serverName, setServerName] = useState<string>("Terminator Frontier");
  const [authToken, setAuthToken] = useState<string>("");
  const [partyCodeInput, setPartyCodeInput] = useState<string>("");
  const [party, setParty] = useState<PartySnapshot | null>(null);

  const { self, selfPartyMember, canStartParty, aliveTerminators } = useGameViewDerivedState({
    state,
    playerId,
    party,
  });

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
      setErrorMessage(String(errorValue));
    }
  }, [setErrorMessage]);

  const callJoin = useCallback(
    async (payload: Record<string, unknown>) => {
      await runBusyMutation(async () => {
        const data = await request<JoinGameResponse>("/api/game/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        setSessionId(data.sessionId);
        setPlayerId(data.playerId);
        setState(data.state);
        setObservation(data.observation);
      });
    },
    [runBusyMutation],
  );

  const sendAction = useCallback(
    async (action: Action) => {
      if (!sessionId || !playerId) {
        return;
      }
      await runBusyMutation(
        async () => {
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
        },
        errorMessage => {
          pushSystemFeed(`Action rejected: ${errorMessage}`);
        },
      );
    },
    [playerId, pushSystemFeed, runBusyMutation, sessionId],
  );

  const tick = useCallback(async () => {
    if (!sessionId) {
      return;
    }
    await runBusyMutation(
      async () => {
        const data = await request<SessionStateResponse>("/api/game/tick", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session: sessionId }),
        });
        setState(data.state);
        await refreshObservation(sessionId, playerId);
      },
      errorMessage => {
        pushSystemFeed(`Tick failed: ${errorMessage}`);
      },
    );
  }, [playerId, pushSystemFeed, refreshObservation, runBusyMutation, sessionId]);

  const createLobby = useCallback(async () => {
    await runBusyMutation(async () => {
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
    });
  }, [authToken, loadServers, runBusyMutation, serverName]);

  const joinServer = useCallback(
    async (targetServerId: string) => {
      await runBusyMutation(async () => {
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
      });
    },
    [loadServers, playerName, runBusyMutation],
  );

  const createPartyLobby = useCallback(async () => {
    await runBusyMutation(async () => {
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
      pushSystemFeed(`Party created (${data.party.partyCode}).`);
    });
  }, [playerName, pushSystemFeed, runBusyMutation]);

  const joinPartyLobby = useCallback(async () => {
    if (!partyCodeInput.trim()) {
      setErrorMessage("Party code is required.");
      return;
    }
    await runBusyMutation(async () => {
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
      pushSystemFeed(`Joined party ${data.party.partyCode}.`);
    });
  }, [partyCodeInput, playerName, pushSystemFeed, runBusyMutation, setErrorMessage]);

  const togglePartyReady = useCallback(async () => {
    if (!party || !playerId) {
      return;
    }
    await runBusyMutation(async () => {
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
    });
  }, [party, playerId, runBusyMutation, selfPartyMember?.ready]);

  const startPartyMatch = useCallback(async () => {
    if (!party || !playerId) {
      return;
    }
    await runBusyMutation(async () => {
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
    });
  }, [party, playerId, pushSystemFeed, refreshObservation, runBusyMutation]);

  const leavePartyLobby = useCallback(async () => {
    if (!party || !playerId) {
      return;
    }
    await runBusyMutation(async () => {
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
      } else {
        setParty(data.party);
      }
      pushSystemFeed("Left current party.");
    });
  }, [party, playerId, pushSystemFeed, runBusyMutation]);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  const handleRealtimeConnected = useCallback(
    (partyId: string) => {
      pushSystemFeed(`Realtime sync active for ${partyId}.`);
    },
    [pushSystemFeed],
  );

  const handleRealtimePartyUpdate = useCallback((nextParty: PartySnapshot) => {
    setParty(nextParty);
  }, []);

  const handleRealtimeSessionState = useCallback(
    (nextSessionId: string, nextState: GameState) => {
      setSessionId(nextSessionId);
      setState(nextState);
      void refreshObservation(nextSessionId, playerId);
    },
    [playerId, refreshObservation],
  );

  const handleRealtimeSystemNotice = useCallback(
    (level: string, message: string) => {
      pushSystemFeed(`${level.toUpperCase()}: ${message}`);
    },
    [pushSystemFeed],
  );

  const realtimeStatus = usePartyRealtimeStream({
    party,
    playerId,
    onConnected: handleRealtimeConnected,
    onPartyUpdate: handleRealtimePartyUpdate,
    onSessionState: handleRealtimeSessionState,
    onSystemNotice: handleRealtimeSystemNotice,
  });

  const refreshState = useCallback(async () => {
    if (!sessionId || !playerId || realtimeStatus === "live") {
      return;
    }

    try {
      const stateData = await request<SessionStateResponse>(`/api/game/state?session=${encodeURIComponent(sessionId)}`);
      setState(stateData.state);
      await refreshObservation(sessionId, playerId);
    } catch (errorValue) {
      setErrorMessage(String(errorValue));
    }
  }, [playerId, realtimeStatus, refreshObservation, sessionId, setErrorMessage]);

  useSessionPolling({
    enabled: Boolean(sessionId && playerId && realtimeStatus !== "live"),
    intervalMs: 350,
    onPoll: refreshState,
  });

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
