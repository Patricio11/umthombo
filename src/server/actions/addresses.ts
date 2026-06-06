"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { addresses } from "@/server/db/schema";
import { requireUser } from "@/server/auth/guard";
import { addressFormSchema, type AddressFormInput } from "@/lib/address-schema";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const norm = (v: string | undefined) => (v && v.trim() ? v.trim() : null);

function fields(d: ReturnType<typeof addressFormSchema.parse>) {
  return {
    label: norm(d.label),
    recipientName: d.recipientName,
    phone: norm(d.phone),
    company: norm(d.company),
    streetAddress: d.streetAddress,
    localArea: norm(d.localArea),
    city: d.city,
    zone: d.zone,
    code: d.code,
    country: d.country || "ZA",
  };
}

export async function createAddress(
  input: AddressFormInput
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = addressFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid address." };
  }
  const d = parsed.data;
  const existing = await db
    .select({ id: addresses.id })
    .from(addresses)
    .where(eq(addresses.userId, user.id));
  const makePrimary = d.isPrimary || existing.length === 0;

  await db.transaction(async (tx) => {
    if (makePrimary) {
      await tx
        .update(addresses)
        .set({ isPrimary: false })
        .where(eq(addresses.userId, user.id));
    }
    await tx
      .insert(addresses)
      .values({ userId: user.id, ...fields(d), isPrimary: makePrimary });
  });
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function updateAddress(
  id: string,
  input: AddressFormInput
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = addressFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid address." };
  }
  const [own] = await db
    .select({ id: addresses.id })
    .from(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, user.id)))
    .limit(1);
  if (!own) return { ok: false, error: "Address not found." };

  // Primary is managed via setPrimaryAddress, not this form.
  await db
    .update(addresses)
    .set(fields(parsed.data))
    .where(eq(addresses.id, id));
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function setPrimaryAddress(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const [own] = await db
    .select({ id: addresses.id })
    .from(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, user.id)))
    .limit(1);
  if (!own) return { ok: false, error: "Address not found." };

  await db.transaction(async (tx) => {
    await tx
      .update(addresses)
      .set({ isPrimary: false })
      .where(eq(addresses.userId, user.id));
    await tx.update(addresses).set({ isPrimary: true }).where(eq(addresses.id, id));
  });
  revalidatePath("/account/addresses");
  return { ok: true };
}

export async function deleteAddress(id: string): Promise<ActionResult> {
  const user = await requireUser();
  const [own] = await db
    .select({ id: addresses.id, isPrimary: addresses.isPrimary })
    .from(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, user.id)))
    .limit(1);
  if (!own) return { ok: false, error: "Address not found." };

  await db.transaction(async (tx) => {
    await tx.delete(addresses).where(eq(addresses.id, id));
    // If we removed the primary, promote the oldest remaining address.
    if (own.isPrimary) {
      const [next] = await tx
        .select({ id: addresses.id })
        .from(addresses)
        .where(eq(addresses.userId, user.id))
        .orderBy(asc(addresses.createdAt))
        .limit(1);
      if (next) {
        await tx
          .update(addresses)
          .set({ isPrimary: true })
          .where(eq(addresses.id, next.id));
      }
    }
  });
  revalidatePath("/account/addresses");
  return { ok: true };
}
