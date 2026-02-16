import { afterEach, describe, expect, test } from "bun:test";
import {
  clearAgentAccessForTests,
  consumeAgentAccessKey,
  getAgentAccessGrant,
  issueAgentAccessKey,
} from "./agent-access";

afterEach(() => {
  clearAgentAccessForTests();
});

describe("agent access key manager", () => {
  test("issues key and allows single-use consumption by default", () => {
    const grant = issueAgentAccessKey({
      sessionId: "session-1",
      issuedByPlayerId: "p-1",
    });

    const fetched = getAgentAccessGrant(grant.accessKey);
    expect(fetched.sessionId).toBe("session-1");
    expect(fetched.remainingUses).toBe(1);

    const consumed = consumeAgentAccessKey(grant.accessKey);
    expect(consumed.remainingUses).toBe(0);

    expect(() => getAgentAccessGrant(grant.accessKey)).toThrow("invalid");
  });

  test("supports multi-use grants and tracks remaining uses", () => {
    const grant = issueAgentAccessKey({
      sessionId: "session-1",
      issuedByPlayerId: "p-1",
      maxUses: 2,
    });

    const first = consumeAgentAccessKey(grant.accessKey);
    expect(first.remainingUses).toBe(1);

    const second = consumeAgentAccessKey(grant.accessKey);
    expect(second.remainingUses).toBe(0);

    expect(() => consumeAgentAccessKey(grant.accessKey)).toThrow("invalid");
  });

  test("rejects invalid ttl bounds", () => {
    expect(() =>
      issueAgentAccessKey({
        sessionId: "session-1",
        issuedByPlayerId: "p-1",
        ttlSeconds: 5,
      }),
    ).toThrow("ttlSeconds");
  });
});
