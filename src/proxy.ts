import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Optimistic auth gate for /admin/* — a fast cookie check at the edge.
 * The real verification still happens server-side via requireAdmin() on
 * each protected page/action.
 */
export function proxy(request: NextRequest) {
  const isLogin = request.nextUrl.pathname === "/admin/login";

  // Never gate the login page itself — otherwise a stale/invalid session
  // cookie can bounce login ↔ dashboard forever (the real session check in
  // requireAdmin() rejects it, sending us back to login).
  if (isLogin) return NextResponse.next();

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
