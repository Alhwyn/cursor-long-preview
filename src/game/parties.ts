import { GameRuleError } from "./engine";
import type { PartyMember, PartyState } from "./types";

const PARTY_CODE_LENGTH = 6;
const DEFAULT_PARTY_MAX_PLAYERS = 4;

interface CreatePartyInput {
  playerId?: string;
  playerName?: string;
}

interface JoinPartyInput {
  partyCode: string;
  playerId?: string;
  playerName?: string;
}

interface SetPartyReadyInput {
  partyId: string;
  playerId: string;
  ready: boolean;
}

interface StartPartyInput {
  partyId: string;
  playerId: string;
}

interface LeavePartyInput {
  partyId: string;
  playerId: string;
}

const partyStore = new Map<string, PartyState>();
const partyIdByCode = new Map<string, string>();
const partyIdBySessionId = new Map<string, string>();

function nowTimestamp(): number {
  return Date.now();
}

function cloneMember(member: PartyMember): PartyMember {
  return { ...member };
}

function cloneParty(party: PartyState): PartyState {
  return {
    ...party,
    members: party.members.map(cloneMember),
  };
}

function writeParty(party: PartyState): PartyState {
  const updated: PartyState = {
    ...party,
    members: party.members.map(cloneMember),
    updatedAt: nowTimestamp(),
  };
  partyStore.set(updated.partyId, updated);
  partyIdByCode.set(updated.partyCode, updated.partyId);
  if (updated.sessionId) {
    partyIdBySessionId.set(updated.sessionId, updated.partyId);
  }
  return cloneParty(updated);
}

function ensureParty(partyId: string): PartyState {
  const party = partyStore.get(partyId);
  if (!party) {
    throw new GameRuleError("PARTY_NOT_FOUND", `Party "${partyId}" was not found.`);
  }
  return cloneParty(party);
}

function toNormalizedPartyCode(partyCode: string): string {
  const normalized = partyCode.trim().toUpperCase();
  if (!normalized) {
    throw new GameRuleError("INVALID_PARTY_CODE", "Party code is required.");
  }
  return normalized;
}

function randomPartyCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = "";
  for (let index = 0; index < PARTY_CODE_LENGTH; index += 1) {
    const pick = Math.floor(Math.random() * alphabet.length);
    value += alphabet[pick] ?? "X";
  }
  return value;
}

function createUniquePartyCode(): string {
  for (let index = 0; index < 32; index += 1) {
    const code = randomPartyCode();
    if (!partyIdByCode.has(code)) {
      return code;
    }
  }

  throw new GameRuleError("PARTY_CODE_EXHAUSTED", "Could not allocate a unique party code. Please retry.");
}

function normalizeMemberName(rawName: string | undefined, position: number): string {
  const trimmed = rawName?.trim();
  if (trimmed) {
    return trimmed;
  }
  return `Survivor-${position}`;
}

function normalizeMemberId(rawPlayerId: string | undefined, existingMembers: PartyMember[]): string {
  const trimmed = rawPlayerId?.trim();
  if (trimmed) {
    return trimmed;
  }

  let index = existingMembers.length + 1;
  let generated = `party-player-${index}`;
  const existing = new Set(existingMembers.map(member => member.playerId));
  while (existing.has(generated)) {
    index += 1;
    generated = `party-player-${index}`;
  }
  return generated;
}

function upsertParty(party: PartyState): PartyState {
  return writeParty({
    ...party,
    members: party.members.map(cloneMember),
  });
}

export function listParties(): PartyState[] {
  return Array.from(partyStore.values())
    .map(cloneParty)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function getParty(partyId: string): PartyState | null {
  const party = partyStore.get(partyId);
  return party ? cloneParty(party) : null;
}

export function getPartyByCode(partyCode: string): PartyState | null {
  const normalized = toNormalizedPartyCode(partyCode);
  const partyId = partyIdByCode.get(normalized);
  if (!partyId) {
    return null;
  }
  const party = partyStore.get(partyId);
  return party ? cloneParty(party) : null;
}

export function getPartyBySessionId(sessionId: string): PartyState | null {
  const partyId = partyIdBySessionId.get(sessionId);
  if (!partyId) {
    return null;
  }
  return getParty(partyId);
}

export function createParty(input: CreatePartyInput): { party: PartyState; member: PartyMember } {
  const createdAt = nowTimestamp();
  const partyId = `party-${crypto.randomUUID()}`;
  const partyCode = createUniquePartyCode();
  const playerId = normalizeMemberId(input.playerId, []);
  const playerName = normalizeMemberName(input.playerName, 1);
  const member: PartyMember = {
    playerId,
    playerName,
    ready: false,
    joinedAt: createdAt,
  };

  const party: PartyState = {
    partyId,
    partyCode,
    status: "open",
    leaderPlayerId: playerId,
    maxPlayers: DEFAULT_PARTY_MAX_PLAYERS,
    members: [member],
    createdAt,
    updatedAt: createdAt,
  };

  return {
    party: writeParty(party),
    member: cloneMember(member),
  };
}

export function joinPartyByCode(input: JoinPartyInput): { party: PartyState; member: PartyMember } {
  const normalizedCode = toNormalizedPartyCode(input.partyCode);
  const partyId = partyIdByCode.get(normalizedCode);
  if (!partyId) {
    throw new GameRuleError("PARTY_NOT_FOUND", `Party code "${normalizedCode}" was not found.`);
  }

  const party = ensureParty(partyId);
  if (party.status !== "open") {
    throw new GameRuleError("PARTY_NOT_OPEN", "Party is no longer open for joining.");
  }
  if (party.members.length >= party.maxPlayers) {
    throw new GameRuleError("PARTY_FULL", "Party is already full.");
  }

  const playerId = normalizeMemberId(input.playerId, party.members);
  if (party.members.some(member => member.playerId === playerId)) {
    throw new GameRuleError("PARTY_MEMBER_EXISTS", `Player "${playerId}" already exists in this party.`);
  }

  const nextMember: PartyMember = {
    playerId,
    playerName: normalizeMemberName(input.playerName, party.members.length + 1),
    ready: false,
    joinedAt: nowTimestamp(),
  };

  const updatedParty = upsertParty({
    ...party,
    members: [...party.members, nextMember],
  });
  return {
    party: updatedParty,
    member: cloneMember(nextMember),
  };
}

export function setPartyReady(input: SetPartyReadyInput): PartyState {
  const party = ensureParty(input.partyId);
  const normalizedPlayerId = input.playerId.trim();
  if (!normalizedPlayerId) {
    throw new GameRuleError("PLAYER_NOT_FOUND", "Player id is required.");
  }

  const memberIndex = party.members.findIndex(member => member.playerId === normalizedPlayerId);
  if (memberIndex < 0) {
    throw new GameRuleError("PARTY_MEMBER_NOT_FOUND", `Player "${normalizedPlayerId}" is not in this party.`);
  }

  const nextMembers = party.members.map(member =>
    member.playerId === normalizedPlayerId
      ? {
          ...member,
          ready: input.ready,
        }
      : member,
  );

  return upsertParty({
    ...party,
    members: nextMembers,
  });
}

export function startParty(input: StartPartyInput): PartyState {
  const party = ensureParty(input.partyId);
  if (party.status !== "open") {
    throw new GameRuleError("PARTY_NOT_OPEN", "Party has already started.");
  }

  const normalizedPlayerId = input.playerId.trim();
  if (!normalizedPlayerId) {
    throw new GameRuleError("PARTY_NOT_LEADER", "Only party leader can start the game.");
  }

  if (party.leaderPlayerId !== normalizedPlayerId) {
    throw new GameRuleError("PARTY_NOT_LEADER", "Only party leader can start the game.");
  }

  const everyoneReady = party.members.every(member => member.ready);
  if (!everyoneReady) {
    throw new GameRuleError("PARTY_NOT_READY", "All party members must be ready before starting.");
  }

  return upsertParty({
    ...party,
    status: "in_game",
  });
}

export function linkPartySession(partyId: string, sessionId: string): PartyState {
  const party = ensureParty(partyId);
  return upsertParty({
    ...party,
    status: "in_game",
    sessionId,
  });
}

export function leaveParty(input: LeavePartyInput): PartyState | null {
  const party = ensureParty(input.partyId);
  const normalizedPlayerId = input.playerId.trim();
  if (!normalizedPlayerId) {
    throw new GameRuleError("PARTY_MEMBER_NOT_FOUND", "Player id is required.");
  }

  const remainingMembers = party.members.filter(member => member.playerId !== normalizedPlayerId);
  if (remainingMembers.length === party.members.length) {
    throw new GameRuleError("PARTY_MEMBER_NOT_FOUND", `Player "${normalizedPlayerId}" is not in this party.`);
  }

  if (remainingMembers.length === 0) {
    partyStore.delete(party.partyId);
    partyIdByCode.delete(party.partyCode);
    if (party.sessionId) {
      partyIdBySessionId.delete(party.sessionId);
    }
    return null;
  }

  const nextLeader = party.leaderPlayerId === normalizedPlayerId ? remainingMembers[0]?.playerId : party.leaderPlayerId;
  if (!nextLeader) {
    throw new GameRuleError("PARTY_MEMBER_NOT_FOUND", "Unable to determine next party leader.");
  }

  return upsertParty({
    ...party,
    leaderPlayerId: nextLeader,
    members: remainingMembers,
  });
}

export function clearPartiesForTests(): void {
  partyStore.clear();
  partyIdByCode.clear();
  partyIdBySessionId.clear();
}
