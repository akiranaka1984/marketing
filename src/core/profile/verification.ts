/**
 * Non-forgeable proof that an independent checker verified a profile (RULES 第3条).
 *
 * The structural fields verifiedBy/verifiedAt/confidence are just data — anything that
 * loads a profile from a DB row or an API body could fake them and bypass the maker ≠
 * checker gate. To make verification unforgeable, the {@link ProfileVerifier} signs the
 * approved profile with an HMAC over its canonical form and stamps the result as
 * provenance.verificationToken. The usability gate recomputes the HMAC and refuses any
 * profile whose token is missing or does not match — so only the holder of the server
 * verification key (the checker) can mint a usable profile.
 *
 * The key never lives in code; it is loaded from PROFILE_VERIFICATION_KEY (base64).
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import type { ServiceProfile } from "./service-profile";

const MIN_KEY_BYTES = 32;

/** Decode + validate a base64 verification key (>= 32 bytes of entropy). */
export function loadVerificationKey(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, "base64");
  if (key.length < MIN_KEY_BYTES) {
    throw new Error(`verification key must decode to >= ${MIN_KEY_BYTES} bytes (got ${key.length})`);
  }
  return key;
}

/**
 * HMAC-SHA256 over the profile's canonical form WITH the token field removed, so the
 * signature binds every other field — including verifiedBy/verifiedAt/confidence. Any
 * later mutation of those fields invalidates the token.
 */
export function signProfile(profile: ServiceProfile, key: Buffer): string {
  return createHmac("sha256", key).update(canonicalMessage(profile)).digest("hex");
}

/** True iff the profile carries a token that matches a fresh HMAC over its contents. */
export function isProfileVerified(profile: ServiceProfile, key: Buffer): boolean {
  const token = profile.provenance.verificationToken;
  if (token === undefined) return false;
  const expected = signProfile(profile, key);
  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(expected, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Canonical JSON (sorted keys, token excluded) so signing is order-independent. */
function canonicalMessage(profile: ServiceProfile): string {
  const { verificationToken: _omit, ...provenance } = profile.provenance;
  return stableStringify({ ...profile, provenance });
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}
