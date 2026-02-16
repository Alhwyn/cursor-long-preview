import { GameRuleError } from "./engine";

const DEFAULT_TTL_SECONDS = 15 * 60;
const MIN_TTL_SECONDS = 30;
const MAX_TTL_SECONDS = 6 * 60 * 60;
const DEFAULT_MAX_USES = 1;

export interface AgentAccessGrant {
  accessKey: string;
  sessionId: string;
  issuedByPlayerId: string;
  issuedAt: number;
  expiresAt: number;
  maxUses: number;
  remainingUses: number;
}

interface IssueAgentAccessInput {
  sessionId: string;
  issuedByPlayerId: string;
  ttlSeconds?: number;
  maxUses?: number;
}

const accessKeyStore = new Map<string, AgentAccessGrant>();

function nowTimestamp(): number {
  return Date.now();
}

function cloneGrant(grant: AgentAccessGrant): AgentAccessGrant {
  return { ...grant };
}

function pruneExpiredGrants(now = nowTimestamp()): void {
  for (const [accessKey, grant] of accessKeyStore.entries()) {
    if (grant.expiresAt <= now) {
      accessKeyStore.delete(accessKey);
    }
  }
}

function parseTtlSeconds(ttlSeconds: number | undefined): number {
  if (ttlSeconds === undefined) {
    return DEFAULT_TTL_SECONDS;
  }
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < MIN_TTL_SECONDS || ttlSeconds > MAX_TTL_SECONDS) {
    throw new GameRuleError(
      "INVALID_ACCESS_KEY_TTL",
      `ttlSeconds must be an integer from ${MIN_TTL_SECONDS} to ${MAX_TTL_SECONDS}.`,
    );
  }
  return ttlSeconds;
}

function parseMaxUses(maxUses: number | undefined): number {
  if (maxUses === undefined) {
    return DEFAULT_MAX_USES;
  }
  if (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 16) {
    throw new GameRuleError("INVALID_ACCESS_KEY_MAX_USES", "maxUses must be an integer from 1 to 16.");
  }
  return maxUses;
}

function resolveValidGrant(accessKey: string): AgentAccessGrant {
  pruneExpiredGrants();
  const grant = accessKeyStore.get(accessKey);
  if (!grant) {
    throw new GameRuleError("ACCESS_KEY_NOT_FOUND", "Agent access key is invalid.");
  }
  if (grant.expiresAt <= nowTimestamp()) {
    accessKeyStore.delete(accessKey);
    throw new GameRuleError("ACCESS_KEY_EXPIRED", "Agent access key has expired.");
  }
  if (grant.remainingUses <= 0) {
    accessKeyStore.delete(accessKey);
    throw new GameRuleError("ACCESS_KEY_EXHAUSTED", "Agent access key has already been used.");
  }
  return grant;
}

export function issueAgentAccessKey(input: IssueAgentAccessInput): AgentAccessGrant {
  const sessionId = input.sessionId.trim();
  const issuedByPlayerId = input.issuedByPlayerId.trim();
  if (!sessionId) {
    throw new GameRuleError("SESSION_NOT_FOUND", "Session id is required.");
  }
  if (!issuedByPlayerId) {
    throw new GameRuleError("PLAYER_NOT_FOUND", "Player id is required.");
  }

  const ttlSeconds = parseTtlSeconds(input.ttlSeconds);
  const maxUses = parseMaxUses(input.maxUses);
  const issuedAt = nowTimestamp();
  const accessKey = `agent_${crypto.randomUUID()}`;
  const grant: AgentAccessGrant = {
    accessKey,
    sessionId,
    issuedByPlayerId,
    issuedAt,
    expiresAt: issuedAt + ttlSeconds * 1000,
    maxUses,
    remainingUses: maxUses,
  };
  accessKeyStore.set(accessKey, grant);
  return cloneGrant(grant);
}

export function getAgentAccessGrant(accessKey: string): AgentAccessGrant {
  const normalized = accessKey.trim();
  if (!normalized) {
    throw new GameRuleError("ACCESS_KEY_NOT_FOUND", "Agent access key is required.");
  }
  return cloneGrant(resolveValidGrant(normalized));
}

export function consumeAgentAccessKey(accessKey: string): AgentAccessGrant {
  const normalized = accessKey.trim();
  if (!normalized) {
    throw new GameRuleError("ACCESS_KEY_NOT_FOUND", "Agent access key is required.");
  }
  const current = resolveValidGrant(normalized);
  const nextRemaining = current.remainingUses - 1;
  if (nextRemaining <= 0) {
    accessKeyStore.delete(normalized);
    return {
      ...cloneGrant(current),
      remainingUses: 0,
    };
  }

  const updated: AgentAccessGrant = {
    ...current,
    remainingUses: nextRemaining,
  };
  accessKeyStore.set(normalized, updated);
  return cloneGrant(updated);
}

export function clearAgentAccessForTests(): void {
  accessKeyStore.clear();
}
