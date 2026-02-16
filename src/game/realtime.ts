import type { GameState, PartyState } from "./types";

type RealtimeEventType = "connected" | "party_update" | "session_state" | "system_notice" | "ping";

interface RealtimeEnvelope<T = unknown> {
  type: RealtimeEventType;
  timestamp: number;
  data: T;
}

interface RealtimeClient {
  clientId: string;
  partyId: string;
  playerId: string;
  controller: ReadableStreamDefaultController<Uint8Array>;
}

interface StreamInput {
  partyId: string;
  playerId: string;
  signal?: AbortSignal;
}

const STREAM_HEADERS = {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
} as const;

const encoder = new TextEncoder();
const clientsById = new Map<string, RealtimeClient>();
const clientIdsByParty = new Map<string, Set<string>>();
let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

function formatSsePayload(type: RealtimeEventType, data: unknown): Uint8Array {
  const envelope: RealtimeEnvelope = {
    type,
    timestamp: Date.now(),
    data,
  };
  return encoder.encode(`event: ${type}\ndata: ${JSON.stringify(envelope)}\n\n`);
}

function removeClient(clientId: string): void {
  const client = clientsById.get(clientId);
  if (!client) {
    return;
  }

  clientsById.delete(clientId);
  const partySet = clientIdsByParty.get(client.partyId);
  if (partySet) {
    partySet.delete(clientId);
    if (partySet.size === 0) {
      clientIdsByParty.delete(client.partyId);
    }
  }
}

function addClient(client: RealtimeClient): void {
  clientsById.set(client.clientId, client);
  const existing = clientIdsByParty.get(client.partyId);
  if (existing) {
    existing.add(client.clientId);
    return;
  }
  clientIdsByParty.set(client.partyId, new Set([client.clientId]));
}

function writeEvent(client: RealtimeClient, type: RealtimeEventType, data: unknown): boolean {
  try {
    client.controller.enqueue(formatSsePayload(type, data));
    return true;
  } catch {
    removeClient(client.clientId);
    return false;
  }
}

function emitToParty(partyId: string, type: RealtimeEventType, data: unknown): void {
  const clientIds = clientIdsByParty.get(partyId);
  if (!clientIds) {
    return;
  }

  for (const clientId of clientIds) {
    const client = clientsById.get(clientId);
    if (!client) {
      continue;
    }
    writeEvent(client, type, data);
  }
}

export function createRealtimeStream(input: StreamInput): Response {
  const clientId = crypto.randomUUID();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const client: RealtimeClient = {
        clientId,
        partyId: input.partyId,
        playerId: input.playerId,
        controller,
      };
      addClient(client);
      writeEvent(client, "connected", {
        clientId,
        partyId: input.partyId,
        playerId: input.playerId,
      });
    },
    cancel() {
      removeClient(clientId);
    },
  });

  if (input.signal) {
    input.signal.addEventListener(
      "abort",
      () => {
        removeClient(clientId);
      },
      { once: true },
    );
  }

  return new Response(stream, {
    headers: STREAM_HEADERS,
  });
}

export function publishPartyUpdate(party: PartyState): void {
  emitToParty(party.partyId, "party_update", { party });
}

export function publishSessionState(partyId: string, state: GameState): void {
  emitToParty(partyId, "session_state", {
    sessionId: state.sessionId,
    state,
  });
}

export function publishSystemNotice(partyId: string, level: "info" | "warning" | "error", message: string): void {
  emitToParty(partyId, "system_notice", {
    level,
    message,
  });
}

export function startRealtimeHeartbeat(intervalMs = 15000): void {
  if (heartbeatTimer) {
    return;
  }

  heartbeatTimer = setInterval(() => {
    for (const partyId of clientIdsByParty.keys()) {
      emitToParty(partyId, "ping", { now: Date.now() });
    }
  }, intervalMs);
}

export function stopRealtimeHeartbeatForTests(): void {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
}

export function clearRealtimeClientsForTests(): void {
  for (const client of clientsById.values()) {
    try {
      client.controller.close();
    } catch {
      // no-op
    }
  }
  clientsById.clear();
  clientIdsByParty.clear();
}
