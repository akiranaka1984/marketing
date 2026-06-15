import { describe, expect, it } from "vitest";
import { LoginThrottle } from "./login-throttle";

describe("LoginThrottle", () => {
  it("allows attempts below the failure threshold", () => {
    const now = 0;
    const t = new LoginThrottle({ threshold: 3, baseDelayMs: 1000, now: () => now });
    expect(t.check("admin")).toEqual({ allowed: true });
    t.recordFailure("admin");
    t.recordFailure("admin");
    expect(t.check("admin")).toEqual({ allowed: true });
  });

  it("locks the key once the threshold of consecutive failures is reached", () => {
    const now = 0;
    const t = new LoginThrottle({ threshold: 3, baseDelayMs: 1000, now: () => now });
    t.recordFailure("admin");
    t.recordFailure("admin");
    t.recordFailure("admin");
    const result = t.check("admin");
    expect(result.allowed).toBe(false);
    if (!result.allowed) expect(result.retryAfterMs).toBeGreaterThan(0);
  });

  it("backs off exponentially with each failure past the threshold", () => {
    const now = 0;
    const t = new LoginThrottle({ threshold: 1, baseDelayMs: 1000, now: () => now });
    t.recordFailure("admin");
    const first = t.check("admin");
    t.recordFailure("admin");
    const second = t.check("admin");
    expect(first.allowed).toBe(false);
    expect(second.allowed).toBe(false);
    if (!first.allowed && !second.allowed) {
      expect(second.retryAfterMs).toBeGreaterThan(first.retryAfterMs);
    }
  });

  it("unlocks after the backoff window elapses", () => {
    let now = 0;
    const t = new LoginThrottle({ threshold: 1, baseDelayMs: 1000, now: () => now });
    t.recordFailure("admin");
    expect(t.check("admin").allowed).toBe(false);
    now += 1001;
    expect(t.check("admin").allowed).toBe(true);
  });

  it("resets the counter on success", () => {
    const now = 0;
    const t = new LoginThrottle({ threshold: 2, baseDelayMs: 1000, now: () => now });
    t.recordFailure("admin");
    t.recordSuccess("admin");
    t.recordFailure("admin");
    expect(t.check("admin").allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const now = 0;
    const t = new LoginThrottle({ threshold: 1, baseDelayMs: 1000, now: () => now });
    t.recordFailure("admin");
    expect(t.check("admin").allowed).toBe(false);
    expect(t.check("other").allowed).toBe(true);
  });
});
