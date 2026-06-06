"use server";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { orders, orderItems, products } from "@/server/db/schema";
import { requireUser, getCurrentUser } from "@/server/auth/guard";

export interface ReorderItem {
  slug: string;
  name: string;
  variant: string | null;
  qty: number;
  unitPriceZAR: number; // current price (re-priced from the DB)
  image: string;
}

export interface ReorderResult {
  ok: boolean;
  items: ReorderItem[];
  skipped: number; // items whose product is gone / no longer available
  error?: string;
}

/** Build cart-ready items from a past order, re-priced from current products. */
export async function reorder(orderId: string): Promise<ReorderResult> {
  const user = await requireUser();
  const [order] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.userId, user.id)))
    .limit(1);
  if (!order) {
    return { ok: false, items: [], skipped: 0, error: "Order not found." };
  }

  const rows = await db
    .select({
      variant: orderItems.variant,
      qty: orderItems.qty,
      slug: products.slug,
      name: products.name,
      priceZAR: products.priceZAR,
      image: products.image,
      status: products.status,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, orderId));

  const items: ReorderItem[] = [];
  let skipped = 0;
  for (const r of rows) {
    if (!r.slug || r.status !== "active") {
      skipped++;
      continue;
    }
    items.push({
      slug: r.slug,
      name: r.name ?? r.slug,
      variant: r.variant,
      qty: r.qty,
      unitPriceZAR: r.priceZAR ?? 0,
      image: r.image ?? "",
    });
  }
  return { ok: true, items, skipped };
}

/** When did the current user last order this product? (null if never / guest) */
export async function getMyProductHistory(
  productId: string
): Promise<{ lastOrderedAt: string | null }> {
  const user = await getCurrentUser();
  if (!user) return { lastOrderedAt: null };
  const [row] = await db
    .select({ createdAt: orders.createdAt })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(eq(orders.userId, user.id), eq(orderItems.productId, productId)))
    .orderBy(desc(orders.createdAt))
    .limit(1);
  return { lastOrderedAt: row ? row.createdAt.toISOString() : null };
}
