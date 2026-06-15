import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { loadAuthConfig, SESSION_TTL_MS, type AuthConfig } from "@/core/auth/auth-config";
import { createSessionToken, verifySessionToken, type SessionPayload } from "@/core/auth/session";

export const SESSION_COOKIE = "admin_session";

const COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
} as const;

function getAuthConfig(): AuthConfig {
  return loadAuthConfig(process.env);
}

/** Mint a signed session cookie for the given admin username. */
export async function createSession(username: string): Promise<void> {
  const { sessionSecret } = getAuthConfig();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const token = createSessionToken({ sub: username, expiresAt }, sessionSecret);

  (await cookies()).set(SESSION_COOKIE, token, { ...COOKIE_BASE, expires: new Date(expiresAt) });
}

/** Clear the session cookie with attributes matching how it was set (maxAge 0 to expire it). */
export async function deleteSession(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, "", { ...COOKIE_BASE, maxAge: 0 });
}

/**
 * Data Access Layer guard: verifies the session at the data source and redirects to /login
 * when absent or invalid. Proxy is only the first (optimistic) gate; this is the authoritative
 * check and MUST run in every admin page render AND every admin Server Action. Memoized per
 * render pass so multiple callers share one verification.
 *
 * The token's `sub` is re-checked against the current ADMIN_USERNAME so that rotating the admin
 * credentials immediately invalidates any still-unexpired session signed for the old username.
 */
export const requireAdmin = cache(async (): Promise<SessionPayload> => {
  const { sessionSecret, admin } = getAuthConfig();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const payload = token ? verifySessionToken(token, sessionSecret) : null;
  if (!payload || payload.sub !== admin.username) {
    redirect("/login");
  }
  return payload;
});
