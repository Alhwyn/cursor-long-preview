import { describe, expect, test } from "bun:test";
import {
  asHttpError,
  error,
  HttpError,
  ok,
  optionalNonEmptyString,
  optionalNumber,
  optionalString,
  parseJsonBody,
  queryString,
  requireObject,
  requireString,
  withErrorBoundary,
} from "./http";

describe("api/http helpers", () => {
  test("ok and error envelopes include expected payload and status", async () => {
    const success = ok({ hello: "world" }, 201);
    const successBody = await success.json();
    expect(success.status).toBe(201);
    expect(successBody).toEqual({
      ok: true,
      data: { hello: "world" },
    });

    const failure = error(409, "CONFLICT", "Nope", { detail: "conflict" });
    const failureBody = await failure.json();
    expect(failure.status).toBe(409);
    expect(failureBody.ok).toBe(false);
    expect(failureBody.error.code).toBe("CONFLICT");
  });

  test("asHttpError normalizes unknown and native errors", () => {
    const existing = new HttpError(400, "BAD", "Already normalized");
    expect(asHttpError(existing)).toBe(existing);

    const native = asHttpError(new Error("boom"));
    expect(native.status).toBe(500);
    expect(native.code).toBe("INTERNAL_ERROR");
    expect(native.message).toBe("boom");

    const unknown = asHttpError({ mystery: true });
    expect(unknown.status).toBe(500);
    expect(unknown.code).toBe("INTERNAL_ERROR");
  });

  test("parseJsonBody accepts valid JSON and rejects invalid JSON", async () => {
    const request = new Request("http://localhost/test", {
      method: "POST",
      body: JSON.stringify({ value: 1 }),
      headers: { "Content-Type": "application/json" },
    });
    const parsed = await parseJsonBody(request);
    expect(parsed).toEqual({ value: 1 });

    const invalidRequest = new Request("http://localhost/test", {
      method: "POST",
      body: "{not-json",
      headers: { "Content-Type": "application/json" },
    });

    await expect(parseJsonBody(invalidRequest)).rejects.toThrow(HttpError);
  });

  test("requireObject and requireString enforce strict input", () => {
    expect(requireObject({ a: 1 })).toEqual({ a: 1 });
    expect(() => requireObject([])).toThrow("Body must be a JSON object");

    expect(requireString(" value ", "name")).toBe("value");
    expect(() => requireString(" ", "name")).toThrow('Field "name" must be a non-empty string');
  });

  test("optionalString and optionalNumber coerce optional values", () => {
    expect(optionalString(undefined, "name")).toBeUndefined();
    expect(optionalString(" test ", "name")).toBe("test");
    expect(optionalString("   ", "name")).toBeUndefined();
    expect(() => optionalString(1, "name")).toThrow('Field "name" must be a string');

    expect(optionalNumber(undefined, "count")).toBeUndefined();
    expect(optionalNumber(3, "count")).toBe(3);
    expect(() => optionalNumber(NaN, "count")).toThrow('Field "count" must be a finite number');
  });

  test("optionalNonEmptyString rejects blank values when provided", () => {
    expect(optionalNonEmptyString(undefined, "session")).toBeUndefined();
    expect(optionalNonEmptyString(" abc ", "session")).toBe("abc");
    expect(() => optionalNonEmptyString("   ", "session")).toThrow(
      'Field "session" must be a non-empty string when provided',
    );
    expect(() => optionalNonEmptyString(1, "session")).toThrow('Field "session" must be a string');
  });

  test("queryString requires non-empty query values", () => {
    const url = new URL("http://localhost/test?session=abc");
    expect(queryString(url, "session")).toBe("abc");
    expect(() => queryString(new URL("http://localhost/test"), "session")).toThrow('Query parameter "session" is required');
  });

  test("withErrorBoundary returns normalized error response", async () => {
    const success = await withErrorBoundary(() => ok({ ok: true }));
    expect(success.status).toBe(200);

    const failure = await withErrorBoundary(() => {
      throw new HttpError(418, "TEAPOT", "I'm a teapot");
    });
    const payload = await failure.json();
    expect(failure.status).toBe(418);
    expect(payload.ok).toBe(false);
    expect(payload.error.code).toBe("TEAPOT");
  });
});
