import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { addresses } from "@/server/db/schema";
import type { AddressView } from "@/lib/address-schema";

type Row = typeof addresses.$inferSelect;

const toView = (r: Row): AddressView => ({
  id: r.id,
  label: r.label,
  recipientName: r.recipientName,
  phone: r.phone,
  company: r.company,
  streetAddress: r.streetAddress,
  localArea: r.localArea,
  city: r.city,
  zone: r.zone,
  code: r.code,
  country: r.country,
  isPrimary: r.isPrimary,
});

/** All of a customer's saved addresses, primary first. */
export async function getUserAddresses(userId: string): Promise<AddressView[]> {
  const rows = await db
    .select()
    .from(addresses)
    .where(eq(addresses.userId, userId))
    .orderBy(desc(addresses.isPrimary), asc(addresses.createdAt));
  return rows.map(toView);
}

/** A single owned address, or null. */
export async function getUserAddress(
  id: string,
  userId: string
): Promise<AddressView | null> {
  const [row] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.id, id), eq(addresses.userId, userId)))
    .limit(1);
  return row ? toView(row) : null;
}

/** The customer's primary address, or null. */
export async function getPrimaryAddress(
  userId: string
): Promise<AddressView | null> {
  const [row] = await db
    .select()
    .from(addresses)
    .where(and(eq(addresses.userId, userId), eq(addresses.isPrimary, true)))
    .limit(1);
  return row ? toView(row) : null;
}
