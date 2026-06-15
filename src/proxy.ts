import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/app/lib/auth";

/**
 * First-gate auth redirect: bounce anonymous requests to /admin/* over to /login before any
 * admin code runs. This is an optimistic cookie-PRESENCE check only — it does NOT verify the
 * signature (the authoritative check is requireAdmin() in the DAL, run at the data source).
 *
 * We deliberately do NOT redirect a "logged-in" visitor away from /login based on cookie
 * presence: an expired-or-forged cookie would otherwise ping-pong between /login (proxy →
 * /admin) and /admin (DAL → /login) forever. The login page handling stays in the app.
 */
export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith("/admin") && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
