"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { orders, orderItems, products } from "@/server/db/schema";
import { requireAdmin } from "@/server/auth/guard";
import {
  handleOrderPaid,
  createBobgoShipment,
  linkOrderToAccount,
} from "@/server/orders/fulfilment";
import {
  adminOrderSchema,
  ORDER_STATUSES,
  type AdminOrderInput,
  type OrderStatus,
} from "@/lib/order-schema";
import { getSiteSettings } from "@/server/db/settings";
import { computeLineDiscount } from "@/lib/discount";

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

/** Price admin order items from the DB and build the insertable lines, applying
 *  the bring-back discount per line (eligibility + prices always from the DB). */
async function buildLines(items: AdminOrderInput["items"]) {
  const ids = [...new Set(items.map((i) => i.productId))];
  const [rows, settings] = await Promise.all([
    db.select().from(products).where(inArray(products.id, ids)),
    getSiteSettings(),
  ]);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const rule = settings.containerDiscount;

  const lines: Omit<typeof orderItems.$inferInsert, "orderId">[] = [];
  let subtotal = 0;
  let discount = 0;
  for (const it of items) {
    const p = byId.get(it.productId);
    if (!p) throw new Error("A selected product no longer exists.");
    const lineTotal = p.priceZAR * it.qty;
    subtotal += lineTotal;

    const { jars, discountZAR } = computeLineDiscount(
      {
        unitPriceZAR: p.priceZAR,
        qty: it.qty,
        containerEligible: p.containerEligible,
        containersReturned: it.containersReturned ?? 0,
      },
      rule
    );
    discount += discountZAR;

    lines.push({
      productId: p.id,
      name: p.name,
      variant: it.variant?.trim() ? it.variant.trim() : null,
      qty: it.qty,
      unitPriceZAR: p.priceZAR,
      lineTotalZAR: lineTotal,
      containersReturned: jars,
      discountZAR,
    });
  }
  return { lines, subtotal, discount };
}

/** Admin: create an order manually (e.g. a phone or walk-in order). */
export async function createOrderAdmin(
  input: AdminOrderInput
): Promise<ActionResult & { id?: string }> {
  await requireAdmin();
  const parsed = adminOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid order." };
  }
  const d = parsed.data;
  const { lines, subtotal, discount } = await buildLines(d.items);
  const goods = subtotal - discount;
  const deliveryFee = d.method === "delivery" ? d.deliveryFeeZAR : 0;
  const total = goods + deliveryFee;
  const id = randomUUID();
  await db.transaction(async (tx) => {
    await tx.insert(orders).values({
      id,
      orderNumber: genOrderNumber(),
      customerName: d.name,
      customerSurname: d.surname?.trim() || null,
      customerEmail: d.email,
      customerPhone: d.phone,
      method: d.method,
      shippingAddress: d.method === "delivery" ? d.address.trim() || null : null,
      note: d.note ?? null,
      subtotalZAR: subtotal,
      discountZAR: discount,
      deliveryFeeZAR: deliveryFee,
      totalZAR: total,
      status: d.status,
      paymentStatus: d.paymentStatus,
      paymentProvider: "manual",
      paidAt: d.paymentStatus === "paid" ? new Date() : null,
      shippingService:
        d.method === "delivery" && d.shippingService ? d.shippingService : null,
    });
    await tx.insert(orderItems).values(lines.map((l) => ({ ...l, orderId: id })));
  });
  revalidatePath("/admin", "layout");
  return { ok: true, id };
}

/** Admin: edit an order  replaces items and recomputes totals atomically. */
export async function updateOrderAdmin(
  id: string,
  input: AdminOrderInput
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = adminOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid order." };
  }
  const d = parsed.data;
  const { lines, subtotal, discount } = await buildLines(d.items);
  const goods = subtotal - discount;
  const deliveryFee = d.method === "delivery" ? d.deliveryFeeZAR : 0;
  const total = goods + deliveryFee;
  const [existing] = await db
    .select({ paymentStatus: orders.paymentStatus, paidAt: orders.paidAt })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);
  const becamePaid =
    d.paymentStatus === "paid" && existing?.paymentStatus !== "paid";
  await db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({
        customerName: d.name,
        customerSurname: d.surname?.trim() || null,
        customerEmail: d.email,
        customerPhone: d.phone,
        method: d.method,
        shippingAddress: d.method === "delivery" ? d.address.trim() || null : null,
        note: d.note ?? null,
        subtotalZAR: subtotal,
        discountZAR: discount,
        deliveryFeeZAR: deliveryFee,
        totalZAR: total,
        status: d.status,
        paymentStatus: d.paymentStatus,
        paidAt: becamePaid ? new Date() : existing?.paidAt ?? null,
        shippingService:
          d.method === "delivery" && d.shippingService ? d.shippingService : null,
      })
      .where(eq(orders.id, id));
    await tx.delete(orderItems).where(eq(orderItems.orderId, id));
    await tx.insert(orderItems).values(lines.map((l) => ({ ...l, orderId: id })));
  });
  if (becamePaid) await handleOrderPaid(id);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Admin: mark an order paid manually (e.g. a confirmed EFT or WhatsApp order)
 *   fires the same paid-order flow (customer/admin emails + BobGo shipment). */
export async function markOrderPaid(id: string): Promise<ActionResult> {
  await requireAdmin();
  const [row] = await db
    .select({ paymentStatus: orders.paymentStatus, status: orders.status })
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);
  if (!row) return { ok: false, error: "Order not found." };
  if (row.paymentStatus === "paid") return { ok: true };

  await db
    .update(orders)
    .set({
      paymentStatus: "paid",
      paidAt: new Date(),
      status: row.status === "new" ? "confirmed" : row.status,
    })
    .where(eq(orders.id, id));
  await handleOrderPaid(id);
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Admin: manually create the BobGo order for a paid delivery order. */
export async function createShipment(id: string): Promise<ActionResult> {
  await requireAdmin();
  // Catch-up: link this order to a matching account (covers older guest orders).
  await linkOrderToAccount(id);
  const res = await createBobgoShipment(id);
  if (!res.ok) return { ok: false, error: res.error ?? "Couldn’t create shipment." };
  revalidatePath("/admin", "layout");
  return { ok: true };
}

/** Admin: delete an order (items cascade). */
export async function deleteOrder(id: string): Promise<ActionResult> {
  await requireAdmin();
  await db.delete(orders).where(eq(orders.id, id));
  revalidatePath("/admin", "layout");
  return { ok: true };
}
