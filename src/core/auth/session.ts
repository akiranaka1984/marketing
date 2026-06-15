/**
 * Stateless, signed admin session token (RULES 第4条: secrets stay server-side).
 *
 * A token is `base64url(payload) . hex(HMAC-SHA256(secret, base64url(payload)))`. The HMAC
 * binds the whole payload, so a client cannot alter the username or expiry without
 * invalidating the signature — the same non-forgeability trick used for profile verification.
 * Verification is constant-time and also enforces the embedded expiry. No DB, no library:
 * good enough for a single-operator admin gate; swap for a session store when multi-user.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

export interface SessionPayload {
  /** The authenticated admin username. */
  sub: string;
  /** Absolute expiry as epoch milliseconds. */
  expiresAt: number;
}

export function createSessionToken(payload: SessionPayload, key: Buffer): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, key)}`;
}

/** Returns the payload iff the signature matches AND the token has not expired; else null. */
export function verifySessionToken(
  token: string,
  key: Buffer,
  now: () => Date = () => new Date(),
): SessionPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  if (!body || !sig) return null;

  const expected = sign(body, key);
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expected, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return null;
  }
  if (!isPayload(payload)) return null;
  if (payload.expiresAt <= now().getTime()) return null;
  return payload;
}

function sign(body: string, key: Buffer): string {
  return createHmac("sha256", key).update(body).digest("hex");
}

function isPayload(value: unknown): value is SessionPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as SessionPayload).sub === "string" &&
    typeof (value as SessionPayload).expiresAt === "number"
  );
}
