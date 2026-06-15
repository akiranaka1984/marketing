/**
 * Loads the admin auth config from the environment (RULES 第4条: secrets stay server-side).
 *
 * Pure and env-injectable so it can be unit-tested without process.env. The session secret
 * is a base64 key (>= 32 bytes) used to sign the stateless session cookie; the admin
 * username/password are the single-operator login credentials.
 */

import type { AdminCredentials } from "./credentials";

const MIN_SECRET_BYTES = 32;

/** Session lifetime: an authenticated admin cookie is valid for 12 hours. */
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export interface AuthConfig {
  sessionSecret: Buffer;
  admin: AdminCredentials;
}

type AuthEnv = Record<string, string | undefined>;

export function loadAuthConfig(env: AuthEnv): AuthConfig {
  const secret = requireEnv(env, "AUTH_SESSION_SECRET");
  const sessionSecret = Buffer.from(secret, "base64");
  if (sessionSecret.length < MIN_SECRET_BYTES) {
    throw new Error(`AUTH_SESSION_SECRET must decode to >= ${MIN_SECRET_BYTES} bytes (got ${sessionSecret.length})`);
  }

  return {
    sessionSecret,
    admin: {
      username: requireEnv(env, "ADMIN_USERNAME"),
      password: requireEnv(env, "ADMIN_PASSWORD"),
    },
  };
}

function requireEnv(env: AuthEnv, name: string): string {
  const value = env[name];
  if (!value) {
    throw new Error(`${name} is required but missing or empty`);
  }
  return value;
}
