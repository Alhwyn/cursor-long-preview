import { useMemo } from "react";
import type { PartySnapshot } from "../api";
import type { GameState } from "../types";

export interface GameViewDerivedState {
  self: GameState["players"][string] | null;
  selfPartyMember: PartySnapshot["members"][number] | null;
  canStartParty: boolean;
  aliveTerminators: number;
}

export interface UseGameViewDerivedStateOptions {
  state: GameState | null;
  playerId: string;
  party: PartySnapshot | null;
}

export function useGameViewDerivedState({ state, playerId, party }: UseGameViewDerivedStateOptions): GameViewDerivedState {
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

  const canStartParty = useMemo(() => {
    if (!party || !playerId) {
      return false;
    }
    const isPartyLeader = party.leaderPlayerId === playerId;
    return Boolean(isPartyLeader && party.status === "open" && party.allReady);
  }, [party, playerId]);

  return {
    self,
    selfPartyMember,
    canStartParty,
    aliveTerminators,
  };
}

export default useGameViewDerivedState;
