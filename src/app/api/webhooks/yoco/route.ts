import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { orders, paymentEvents } from "@/server/db/schema";
import { getYocoConfig } from "@/server/db/integrations";
import { verifyYocoWebhook } from "@/server/payments/yoco";
import { handleOrderPaid } from "@/server/orders/fulfilment";
import { handleCustomPaymentPaid } from "@/server/custom-requests/fulfilment";

export const dynamic = "force-dynamic";

/**
 * Yoco payment webhook. Register this URL from /admin/integrations (the
 * "Register webhook" button), which stores the signing secret. Each delivery
 * is authenticated with the Standard Webhooks headers and de-duplicated by
 * `payment_events.eventId` (the `webhook-id`).
 */
export async function POST(req: Request) {
  const raw = await req.text();
  console.log("[yoco webhook] received", { bytes: raw.length });

  const config = await getYocoConfig();
  if (!config?.webhookSecret) {
    console.warn(
      "[yoco webhook] IGNORED - Yoco disabled or webhook secret not set in /admin/integrations"
    );
    return Response.json({ ok: true, ignored: true });
  }

  const ok = verifyYocoWebhook(config.webhookSecret, raw, {
    id: req.headers.get("webhook-id"),
    timestamp: req.headers.get("webhook-timestamp"),
    signature: req.headers.get("webhook-signature"),
  });
  if (!ok) {
    console.warn("[yoco webhook] SIGNATURE MISMATCH or stale timestamp");
    return new Response("Invalid signature", { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const type: string | undefined = event?.type;
  const payload = event?.payload ?? {};
  const status: string | undefined = payload?.status;
  const meta = (payload?.metadata ?? {}) as Record<string, string>;
  const orderNumber = meta.orderNumber;
  const metaOrderId = meta.orderId;
  const paymentId: string | undefined = payload?.id;

  const eventId =
    req.headers.get("webhook-id") ||
    event?.id ||
    `${type ?? "event"}:${paymentId ?? orderNumber ?? raw.length}`;

  // Custom-request payment (deposit/balance) — separate from order fulfilment.
  if (meta.customRequestId) {
    const inserted = await db
      .insert(paymentEvents)
      .values({
        provider: "yoco",
        eventId: String(eventId),
        orderId: null,
        type: type ?? null,
        status: status ?? null,
        raw: event,
      })
      .onConflictDoNothing({ target: paymentEvents.eventId })
      .returning({ id: paymentEvents.id });
    if (inserted.length === 0) {
      return Response.json({ ok: true, duplicate: true });
    }
    if (type === "payment.succeeded" || status === "succeeded") {
      await handleCustomPaymentPaid(
        meta.customRequestId,
        meta.kind === "balance" ? "balance" : "deposit"
      );
    }
    return Response.json({ ok: true, custom: true });
  }

  // Resolve the order (by our orderNumber, else metadata.orderId).
  let orderRow: typeof orders.$inferSelect | undefined;
  if (orderNumber) {
    [orderRow] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, orderNumber))
      .limit(1);
  }
  if (!orderRow && metaOrderId) {
    [orderRow] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, metaOrderId))
      .limit(1);
  }

  // Idempotency: record the event; a duplicate eventId is a no-op.
  const inserted = await db
    .insert(paymentEvents)
    .values({
      provider: "yoco",
      eventId: String(eventId),
      orderId: orderRow?.id ?? null,
      type: type ?? null,
      status: status ?? null,
      raw: event,
    })
    .onConflictDoNothing({ target: paymentEvents.eventId })
    .returning({ id: paymentEvents.id });

  if (inserted.length === 0) {
    return Response.json({ ok: true, duplicate: true });
  }

  if (!orderRow) {
    console.warn("[yoco webhook] NO ORDER MATCHED", { orderNumber, metaOrderId });
    return Response.json({ ok: true, unmatched: true });
  }

  console.log("[yoco webhook] event", { type, orderNumber, status });

  const isPaid = type === "payment.succeeded" || status === "succeeded";

  if (isPaid && orderRow.paymentStatus !== "paid") {
    await db
      .update(orders)
      .set({
        paymentStatus: "paid",
        paymentProvider: "yoco",
        paymentReference: paymentId ?? orderRow.paymentReference,
        paidAt: new Date(),
        status: orderRow.status === "new" ? "confirmed" : orderRow.status,
      })
      .where(eq(orders.id, orderRow.id));
    // First paid → notify customer/admin + create the BobGo courier order.
    await handleOrderPaid(orderRow.id);
    console.log("[yoco webhook] ORDER MARKED PAID", orderRow.orderNumber);
  }

  return Response.json({ ok: true });
}
