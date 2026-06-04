import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Optimistic auth gate for /admin/* — a fast cookie check at the edge.
 * The real verification still happens server-side via requireAdmin() on
 * each protected page/action.
 */
export function middleware(request: NextRequest) {
  const isLogin = request.nextUrl.pathname === "/admin/login";
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie && !isLogin) {
    const url = new URL("/admin/login", request.url);
    url.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (sessionCookie && isLogin) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
