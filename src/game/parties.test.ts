import { afterEach, describe, expect, test } from "bun:test";
import { GameRuleError } from "./engine";
import {
  clearPartiesForTests,
  createParty,
  getParty,
  getPartyByCode,
  getPartyBySessionId,
  joinPartyByCode,
  leaveParty,
  linkPartySession,
  listParties,
  setPartyReady,
  startParty,
} from "./parties";

afterEach(() => {
  clearPartiesForTests();
});

describe("party manager", () => {
  test("createParty initializes leader and code", () => {
    const created = createParty({ playerName: "Leader" });

    expect(created.party.partyId.startsWith("party-")).toBe(true);
    expect(created.party.partyCode.length).toBe(6);
    expect(created.party.status).toBe("open");
    expect(created.party.members).toHaveLength(1);
    expect(created.party.leaderPlayerId).toBe(created.member.playerId);
    expect(created.member.playerName).toBe("Leader");
  });

  test("joinPartyByCode adds up to four members and enforces capacity", () => {
    const created = createParty({ playerName: "Leader" });
    joinPartyByCode({ partyCode: created.party.partyCode, playerName: "Two" });
    joinPartyByCode({ partyCode: created.party.partyCode, playerName: "Three" });
    joinPartyByCode({ partyCode: created.party.partyCode, playerName: "Four" });

    const party = getParty(created.party.partyId);
    expect(party?.members).toHaveLength(4);

    expect(() =>
      joinPartyByCode({
        partyCode: created.party.partyCode,
        playerName: "Overflow",
      }),
    ).toThrow(GameRuleError);
  });

  test("joinPartyByCode rejects duplicate player identifiers", () => {
    const created = createParty({
      playerId: "leader-id",
      playerName: "Leader",
    });

    expect(() =>
      joinPartyByCode({
        partyCode: created.party.partyCode,
        playerId: "leader-id",
        playerName: "Duplicate",
      }),
    ).toThrow(GameRuleError);
  });

  test("setPartyReady toggles readiness for members", () => {
    const created = createParty({ playerName: "Leader" });
    const joined = joinPartyByCode({
      partyCode: created.party.partyCode,
      playerName: "Two",
    });

    const afterLeaderReady = setPartyReady({
      partyId: created.party.partyId,
      playerId: created.member.playerId,
      ready: true,
    });
    expect(afterLeaderReady.members.find(member => member.playerId === created.member.playerId)?.ready).toBe(true);

    const afterGuestReady = setPartyReady({
      partyId: created.party.partyId,
      playerId: joined.member.playerId,
      ready: true,
    });
    expect(afterGuestReady.members.find(member => member.playerId === joined.member.playerId)?.ready).toBe(true);
  });

  test("startParty requires leader and all members ready", () => {
    const created = createParty({ playerName: "Leader" });
    const joined = joinPartyByCode({
      partyCode: created.party.partyCode,
      playerName: "Two",
    });

    expect(() =>
      startParty({
        partyId: created.party.partyId,
        playerId: joined.member.playerId,
      }),
    ).toThrow(GameRuleError);

    expect(() =>
      startParty({
        partyId: created.party.partyId,
        playerId: created.member.playerId,
      }),
    ).toThrow(GameRuleError);

    setPartyReady({
      partyId: created.party.partyId,
      playerId: created.member.playerId,
      ready: true,
    });
    setPartyReady({
      partyId: created.party.partyId,
      playerId: joined.member.playerId,
      ready: true,
    });

    const started = startParty({
      partyId: created.party.partyId,
      playerId: created.member.playerId,
    });
    expect(started.status).toBe("in_game");
  });

  test("linkPartySession maps session to party", () => {
    const created = createParty({ playerName: "Leader" });
    setPartyReady({
      partyId: created.party.partyId,
      playerId: created.member.playerId,
      ready: true,
    });
    startParty({
      partyId: created.party.partyId,
      playerId: created.member.playerId,
    });

    const linked = linkPartySession(created.party.partyId, "session-123");
    expect(linked.sessionId).toBe("session-123");
    expect(getPartyBySessionId("session-123")?.partyId).toBe(created.party.partyId);
  });

  test("leaveParty transfers leadership and removes party when empty", () => {
    const created = createParty({ playerId: "leader-id", playerName: "Leader" });
    const joined = joinPartyByCode({
      partyCode: created.party.partyCode,
      playerId: "guest-id",
      playerName: "Guest",
    });

    const afterLeaderLeave = leaveParty({
      partyId: created.party.partyId,
      playerId: created.member.playerId,
    });
    expect(afterLeaderLeave?.leaderPlayerId).toBe(joined.member.playerId);
    expect(afterLeaderLeave?.members).toHaveLength(1);

    const deleted = leaveParty({
      partyId: created.party.partyId,
      playerId: joined.member.playerId,
    });
    expect(deleted).toBeNull();
    expect(getParty(created.party.partyId)).toBeNull();
  });

  test("getPartyByCode and listParties expose stored parties", () => {
    const first = createParty({ playerName: "A" });
    const second = createParty({ playerName: "B" });

    const byCode = getPartyByCode(first.party.partyCode);
    expect(byCode?.partyId).toBe(first.party.partyId);

    const listed = listParties();
    expect(listed).toHaveLength(2);
    expect(listed.some(party => party.partyId === second.party.partyId)).toBe(true);
  });
});
