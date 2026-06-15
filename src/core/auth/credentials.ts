/**
 * Single-operator admin login check (RULES 第4条: secrets stay server-side).
 *
 * The expected username/password come from the environment — never code — and are compared
 * with a constant-time HMAC over each field so the check leaks neither length nor content
 * via timing. HMAC tags are fixed-width, so `timingSafeEqual` never throws on length
 * mismatch and a short guess cannot be distinguished from a wrong-but-same-length one.
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export interface AdminCredentials {
  username: string;
  password: string;
}

/** Returns true iff both username AND password match, in constant time. */
export function verifyLogin(input: AdminCredentials, expected: AdminCredentials): boolean {
  const key = randomBytes(32);
  const userOk = constantTimeEqual(input.username, expected.username, key);
  const passOk = constantTimeEqual(input.password, expected.password, key);
  return userOk && passOk;
}

function constantTimeEqual(a: string, b: string, key: Buffer): boolean {
  const ha = createHmac("sha256", key).update(a, "utf8").digest();
  const hb = createHmac("sha256", key).update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}
