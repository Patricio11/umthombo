"use server";

import { headers } from "next/headers";
import { auth } from "@/server/auth/auth";

export interface SetPasswordResult {
  ok: boolean;
  error?: string;
}

/**
 * Set the password for a signed-in, credential-less account (the deferred
 * checkout flow: the customer has just verified their email and is signed in,
 * but hasn't chosen a password yet). Better Auth's setPassword only links a
 * password when none exists, and requires a valid session.
 */
export async function setMyPassword(
  newPassword: string
): Promise<SetPasswordResult> {
  if (!newPassword || newPassword.length < 8) {
    return { ok: false, error: "Use at least 8 characters." };
  }
  try {
    await auth.api.setPassword({
      body: { newPassword },
      headers: await headers(),
    });
    return { ok: true };
  } catch (err) {
    const msg = (err as Error)?.message || "Couldn’t set your password.";
    if (/already/i.test(msg)) {
      return {
        ok: false,
        error: "A password is already set - please sign in or reset it.",
      };
    }
    if (/session|unauthor/i.test(msg)) {
      return { ok: false, error: "Please open the link from your email again." };
    }
    return { ok: false, error: msg };
  }
}
