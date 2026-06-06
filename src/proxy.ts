import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Optimistic auth gate at the edge — a fast cookie check for /admin/* and
 * /account/*. The real verification still happens server-side via
 * requireAdmin() / requireUser() on each protected page/action.
 */
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Never gate the admin login page itself — a stale/invalid cookie could
  // otherwise bounce login ↔ dashboard forever (the server check rejects it).
  if (path === "/admin/login") return NextResponse.next();

  const sessionCookie = getSessionCookie(request);
  if (sessionCookie) return NextResponse.next();

  // Not signed in → send to the right login for the area.
  if (path.startsWith("/account")) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  const url = new URL("/admin/login", request.url);
  url.searchParams.set("from", path);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*"],
};
