import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken } from "./session";

const KEY = Buffer.alloc(32, 5);
const OTHER = Buffer.alloc(32, 9);
const T0 = 1_700_000_000_000;

describe("session token", () => {
  it("round-trips a valid token signed with the same key", () => {
    const token = createSessionToken({ sub: "admin", expiresAt: T0 + 1000 }, KEY);
    const payload = verifySessionToken(token, KEY, () => new Date(T0));
    expect(payload).toEqual({ sub: "admin", expiresAt: T0 + 1000 });
  });

  it("rejects a token signed with a different key (tamper-proof)", () => {
    const token = createSessionToken({ sub: "admin", expiresAt: T0 + 1000 }, KEY);
    expect(verifySessionToken(token, OTHER, () => new Date(T0))).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = createSessionToken({ sub: "admin", expiresAt: T0 - 1 }, KEY);
    expect(verifySessionToken(token, KEY, () => new Date(T0))).toBeNull();
  });

  it("rejects a token whose payload was altered after signing", () => {
    const token = createSessionToken({ sub: "admin", expiresAt: T0 + 1000 }, KEY);
    const [, sig] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ sub: "root", expiresAt: T0 + 1000 })).toString("base64url");
    expect(verifySessionToken(`${forgedPayload}.${sig}`, KEY, () => new Date(T0))).toBeNull();
  });

  it("rejects structurally malformed tokens", () => {
    const now = () => new Date(T0);
    expect(verifySessionToken("", KEY, now)).toBeNull();
    expect(verifySessionToken("onlyonepart", KEY, now)).toBeNull();
    expect(verifySessionToken("a.b.c", KEY, now)).toBeNull();
    expect(verifySessionToken("notbase64!.deadbeef", KEY, now)).toBeNull();
  });
});
