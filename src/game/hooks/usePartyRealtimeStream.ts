import { useEffect, useState } from "react";
import type { PartySnapshot, RealtimeEnvelope } from "../api";
import type { GameState } from "../types";

export type RealtimeStatus = "offline" | "connecting" | "live" | "degraded";

export interface UsePartyRealtimeStreamOptions {
  party: PartySnapshot | null;
  playerId: string;
  onConnected: (partyId: string) => void;
  onPartyUpdate: (party: PartySnapshot) => void;
  onSessionState: (sessionId: string, state: GameState) => void;
  onSystemNotice: (level: string, message: string) => void;
}

export function usePartyRealtimeStream({
  party,
  playerId,
  onConnected,
  onPartyUpdate,
  onSessionState,
  onSystemNotice,
}: UsePartyRealtimeStreamOptions): RealtimeStatus {
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>("offline");

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
      onConnected(envelope.data.partyId);
    });

    source.addEventListener("party_update", event => {
      const envelope = JSON.parse((event as MessageEvent<string>).data) as RealtimeEnvelope<{ party: PartySnapshot }>;
      onPartyUpdate(envelope.data.party);
    });

    source.addEventListener("session_state", event => {
      const envelope = JSON.parse((event as MessageEvent<string>).data) as RealtimeEnvelope<{
        sessionId: string;
        state: GameState;
      }>;
      onSessionState(envelope.data.sessionId, envelope.data.state);
    });

    source.addEventListener("system_notice", event => {
      const envelope = JSON.parse((event as MessageEvent<string>).data) as RealtimeEnvelope<{ level: string; message: string }>;
      onSystemNotice(envelope.data.level, envelope.data.message);
    });

    source.onerror = () => {
      setRealtimeStatus("degraded");
    };

    return () => {
      source.close();
    };
  }, [onConnected, onPartyUpdate, onSessionState, onSystemNotice, party, playerId]);

  return realtimeStatus;
}

export default usePartyRealtimeStream;
