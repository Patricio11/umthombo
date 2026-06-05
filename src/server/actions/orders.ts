"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { orders, orderItems, products } from "@/server/db/schema";
import { requireAdmin } from "@/server/auth/guard";
import {
  createOrderSchema,
  ORDER_STATUSES,
  type CreateOrderInput,
  type OrderStatus,
} from "@/lib/order-schema";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function genOrderNumber(): string {
  const d = new Date();
  const ymd =
    String(d.getFullYear()).slice(2) +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  const rand = randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
  return `UMT-${ymd}-${rand}`;
}

/**
 * Public: create an order. Prices are re-validated against the DB (never
 * trust the client), order + items written in one transaction.
 */
export async function createOrder(
  input: CreateOrderInput
): Promise<ActionResult & { orderNumber?: string; total?: number }> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid order." };
  }
  const data = parsed.data;

  const slugs = [...new Set(data.items.map((i) => i.slug))];
  const rows = await db
    .select()
    .from(products)
    .where(inArray(products.slug, slugs));
  const bySlug = new Map(rows.map((r) => [r.slug, r]));

  const lines: (typeof orderItems.$inferInsert)[] = [];
  let subtotal = 0;

  for (const it of data.items) {
    const p = bySlug.get(it.slug);
    if (!p || p.status !== "active") {
      return { ok: false, error: `"${it.slug}" is no longer available.` };
    }
    // Accept only a price the product actually allows (base, pack, or range).
    let unit = p.priceZAR;
    const allowed = new Set<number>([p.priceZAR]);
    if (p.packPriceZAR != null) allowed.add(p.packPriceZAR);
    if (allowed.has(it.unitPriceZAR)) {
      unit = it.unitPriceZAR;
    } else if (
      p.priceMaxZAR != null &&
      it.unitPriceZAR >= p.priceZAR &&
      it.unitPriceZAR <= p.priceMaxZAR
    ) {
      unit = it.unitPriceZAR;
    }
    const lineTotal = unit * it.qty;
    subtotal += lineTotal;
    lines.push({
      orderId: "", // set in tx
      productId: p.id,
      name: p.name,
      variant: it.variant ?? null,
      qty: it.qty,
      unitPriceZAR: unit,
      lineTotalZAR: lineTotal,
    });
  }

  const total = data.ownContainer ? Math.round(subtotal * 0.9) : subtotal;
  const orderNumber = genOrderNumber();
  const orderId = randomUUID();

  try {
    await db.transaction(async (tx) => {
      await tx.insert(orders).values({
        id: orderId,
        orderNumber,
        customerName: data.name,
        customerEmail: data.email,
        customerPhone: data.phone,
        method: data.method,
        note: data.note ?? null,
        ownContainer: data.ownContainer,
        subtotalZAR: subtotal,
        totalZAR: total,
        status: "new",
      });
      await tx
        .insert(orderItems)
        .values(lines.map((l) => ({ ...l, orderId })));
    });
  } catch {
    return { ok: false, error: "We couldn't save your order. Please try again." };
  }

  revalidatePath("/admin", "layout");
  return { ok: true, orderNumber, total };
}

/** Admin: move an order through its lifecycle. */
export async function updateOrderStatus(
  id: string,
  status: OrderStatus
): Promise<ActionResult> {
  await requireAdmin();
  if (!ORDER_STATUSES.includes(status)) {
    return { ok: false, error: "Unknown status." };
  }
  await db.update(orders).set({ status }).where(eq(orders.id, id));
  revalidatePath("/admin", "layout");
  return { ok: true };
}
