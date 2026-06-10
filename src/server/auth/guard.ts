import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";

/** Current session (server). Cached per request. Never throws — a transient
 *  auth/DB error degrades to "logged out" so it can't crash the storefront. */
export const getSession = cache(async () => {
  try {
    return await auth.api.getSession({ headers: await headers() });
  } catch (err) {
    console.error("[auth] getSession failed:", err);
    return null;
  }
});

/** The signed-in user, or null. A disabled (banned) account reads as logged-out. */
export async function getCurrentUser() {
  const session = await getSession();
  const u = session?.user as { banned?: boolean } | undefined;
  if (!u || u.banned) return null;
  return session!.user;
}

/**
 * Require an authenticated **admin**. Redirects to /admin/login when absent or
 * when the user isn't an admin (a logged-in customer must not reach admin).
 */
export async function requireAdmin() {
  const session = await getSession();
  const u = session?.user as { role?: string; banned?: boolean } | undefined;
  if (!u || u.banned || u.role !== "admin") redirect("/admin/login");
  return session!.user;
}

/**
 * Require any authenticated user (customer or admin). Redirects to /login with
 * a `next` param so they return where they were going.
 */
export async function requireUser(nextPath?: string) {
  const session = await getSession();
  const u = session?.user as { banned?: boolean } | undefined;
  if (!u || u.banned) {
    const next = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";
    redirect(`/login${next}`);
  }
  return session!.user;
}
