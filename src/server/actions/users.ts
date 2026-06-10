"use server";

import { revalidatePath } from "next/cache";
import { eq, and } from "drizzle-orm";
import { db } from "@/server/db";
import { user, session, account } from "@/server/db/auth-schema";
import { auth } from "@/server/auth/auth";
import { requireAdmin } from "@/server/auth/guard";
import { countAdmins } from "@/server/db/admin-users";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function revalidateUser(id: string) {
  revalidatePath("/admin/customers");
  revalidatePath(`/admin/customers/${id}`);
}

/**
 * Send the customer a link to set/reset their password. Picks the right flow:
 * a reset link if they already have a password, else a verify→set-password link.
 */
export async function sendUserPasswordLink(id: string): Promise<ActionResult> {
  await requireAdmin();
  const [u] = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);
  if (!u) return { ok: false, error: "User not found." };

  const [cred] = await db
    .select({ password: account.password })
    .from(account)
    .where(and(eq(account.userId, id), eq(account.providerId, "credential")))
    .limit(1);

  try {
    if (cred?.password) {
      await auth.api.requestPasswordReset({
        body: { email: u.email, redirectTo: "/set-password" },
      });
    } else {
      await auth.api.sendVerificationEmail({
        body: { email: u.email, callbackURL: "/set-password" },
      });
    }
    return { ok: true };
  } catch (err) {
    console.error("[users] sendUserPasswordLink failed:", err);
    return { ok: false, error: "Couldn’t send the email." };
  }
}

export async function markUserVerified(id: string): Promise<ActionResult> {
  await requireAdmin();
  await db.update(user).set({ emailVerified: true }).where(eq(user.id, id));
  revalidateUser(id);
  return { ok: true };
}

export async function setUserBanned(
  id: string,
  banned: boolean
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (me.id === id) {
    return { ok: false, error: "You can’t disable your own account." };
  }
  await db.update(user).set({ banned }).where(eq(user.id, id));
  // Revoke active sessions so the disable takes effect immediately.
  if (banned) {
    await db.delete(session).where(eq(session.userId, id));
  }
  revalidateUser(id);
  return { ok: true };
}

export async function deleteUserAccount(id: string): Promise<ActionResult> {
  const me = await requireAdmin();
  if (me.id === id) {
    return { ok: false, error: "You can’t delete your own account." };
  }
  const [target] = await db
    .select({ role: user.role })
    .from(user)
    .where(eq(user.id, id))
    .limit(1);
  if (!target) return { ok: false, error: "User not found." };
  if (target.role === "admin" && (await countAdmins()) <= 1) {
    return { ok: false, error: "Can’t delete the last admin." };
  }

  // Remove auth rows first, then the user (other FKs unlink/cascade their rows).
  await db.delete(session).where(eq(session.userId, id));
  await db.delete(account).where(eq(account.userId, id));
  await db.delete(user).where(eq(user.id, id));

  revalidatePath("/admin/customers");
  return { ok: true };
}
