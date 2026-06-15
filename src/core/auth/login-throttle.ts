/**
 * In-memory throttle that slows online password guessing against the single-operator admin
 * login. After `threshold` consecutive failures for a key (the submitted username), each further
 * failure imposes an exponentially growing lock window. A success resets the counter.
 *
 * Process-local and non-durable — adequate for a single-operator gate behind one server. A
 * distributed deployment would back this with Redis; the call sites stay the same.
 */

const DEFAULTS = { threshold: 5, baseDelayMs: 2000, maxDelayMs: 15 * 60 * 1000 };

export type ThrottleDecision = { allowed: true } | { allowed: false; retryAfterMs: number };

interface ThrottleOptions {
  threshold?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  now?: () => number;
}

interface Attempt {
  failures: number;
  lockedUntil: number;
}

export class LoginThrottle {
  private readonly threshold: number;
  private readonly baseDelayMs: number;
  private readonly maxDelayMs: number;
  private readonly now: () => number;
  private readonly attempts = new Map<string, Attempt>();

  constructor(options: ThrottleOptions = {}) {
    this.threshold = options.threshold ?? DEFAULTS.threshold;
    this.baseDelayMs = options.baseDelayMs ?? DEFAULTS.baseDelayMs;
    this.maxDelayMs = options.maxDelayMs ?? DEFAULTS.maxDelayMs;
    this.now = options.now ?? Date.now;
  }

  check(key: string): ThrottleDecision {
    const entry = this.attempts.get(key);
    if (!entry) return { allowed: true };
    const remaining = entry.lockedUntil - this.now();
    if (remaining > 0) return { allowed: false, retryAfterMs: remaining };
    return { allowed: true };
  }

  recordFailure(key: string): void {
    const entry = this.attempts.get(key) ?? { failures: 0, lockedUntil: 0 };
    entry.failures += 1;
    if (entry.failures >= this.threshold) {
      const over = entry.failures - this.threshold;
      const delay = Math.min(this.baseDelayMs * 2 ** over, this.maxDelayMs);
      entry.lockedUntil = this.now() + delay;
    }
    this.attempts.set(key, entry);
  }

  recordSuccess(key: string): void {
    this.attempts.delete(key);
  }
}
