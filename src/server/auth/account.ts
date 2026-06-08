import "server-only";
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { user, addresses } from "@/server/db/schema";
import { auth } from "@/server/auth/auth";
import type { DeliveryAddress } from "@/lib/shipping";

/**
 * Deferred account creation from checkout: make a credential-less, unverified
 * account and email a verification link that lands on /set-password. The
 * customer verifies → is signed in → sets their password. Best-effort; never
 * throws into the order flow. Skips if an account already exists.
 */
export async function createDeferredAccount(input: {
  name: string;
  email: string;
  phone?: string | null;
}): Promise<void> {
  const email = input.email.trim().toLowerCase();
  if (!email) return;
  try {
    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(sql`lower(${user.email})`, email))
      .limit(1);
    if (existing) return; // already has an account

    await db.insert(user).values({
      id: randomUUID(),
      name: input.name.trim() || email,
      email,
      emailVerified: false,
      role: "customer",
      phone: input.phone?.trim() || null,
    });

    await auth.api.sendVerificationEmail({
      body: { email, callbackURL: "/set-password" },
    });
  } catch (err) {
    console.error("[account] createDeferredAccount failed:", err);
  }
}

/**
 * Resolve the user for an email, creating a password-less account if none
 * exists (and emailing a set-password link). Returns the user id so callers
 * can attach a record (e.g. a custom request) to it. Best-effort.
 */
export async function resolveOrCreateUser(input: {
  name: string;
  email: string;
  phone?: string | null;
}): Promise<{ id: string; isNew: boolean } | null> {
  const email = input.email.trim().toLowerCase();
  if (!email) return null;
  try {
    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(sql`lower(${user.email})`, email))
      .limit(1);
    if (existing) return { id: existing.id, isNew: false };

    const id = randomUUID();
    await db.insert(user).values({
      id,
      name: input.name.trim() || email,
      email,
      emailVerified: false,
      role: "customer",
      phone: input.phone?.trim() || null,
    });
    await auth.api
      .sendVerificationEmail({ body: { email, callbackURL: "/set-password" } })
      .catch((err) => console.error("[account] set-password email failed:", err));
    return { id, isNew: true };
  } catch (err) {
    console.error("[account] resolveOrCreateUser failed:", err);
    return null;
  }
}

/** Save a checkout address to the customer's account (first one is primary). */
export async function saveCheckoutAddress(
  userId: string,
  addr: DeliveryAddress,
  recipientName: string,
  phone: string | null
): Promise<void> {
  try {
    const existing = await db
      .select({ id: addresses.id })
      .from(addresses)
      .where(eq(addresses.userId, userId));
    await db.insert(addresses).values({
      userId,
      recipientName: recipientName.trim() || "-",
      phone: phone?.trim() || null,
      company: addr.company?.trim() || null,
      streetAddress: addr.streetAddress,
      localArea: addr.localArea?.trim() || null,
      city: addr.city,
      zone: addr.zone,
      code: addr.code,
      country: addr.country || "ZA",
      isPrimary: existing.length === 0,
    });
  } catch (err) {
    console.error("[account] saveCheckoutAddress failed:", err);
  }
}
