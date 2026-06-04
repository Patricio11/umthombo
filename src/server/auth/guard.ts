import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";

/** Current session (server). Cached per request. */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

/**
 * Require an authenticated admin. Redirects to /admin/login when absent.
 * Returns the session user for convenience.
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session?.user) redirect("/admin/login");
  return session.user;
}
