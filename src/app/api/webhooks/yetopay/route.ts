import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { orders, paymentEvents } from "@/server/db/schema";
import { getYetopayConfig } from "@/server/db/integrations";
import { verifyWebhookSignature } from "@/server/payments/yetopay";
import { handleOrderPaid } from "@/server/orders/fulfilment";

export const dynamic = "force-dynamic";

/**
 * YetoPay payment webhook. The owner subscribes this URL in the YetoPay
 * dashboard; each delivery is authenticated by the `X-Webhook-Signature`
 * HMAC over the raw body. Idempotent via `payment_events.eventId`.
 */
export async function POST(req: Request) {
  const raw = await req.text();

  const config = await getYetopayConfig();
  if (!config?.webhookSecret) {
    // Disabled or no secret configured  nothing we can verify. Ack so the
    // provider doesn't keep retrying.
    return Response.json({ ok: true, ignored: true });
  }

  const signature = req.headers.get("x-webhook-signature");
  if (!verifyWebhookSignature(config.webhookSecret, raw, signature)) {
    return new Response("Invalid signature", { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const data = payload?.data ?? {};
  const type: string | undefined = payload?.type;
  const status: string | undefined = data?.status;
  const reference: string | undefined = data?.reference;
  const metadataOrderId: string | undefined = data?.metadata?.orderId;
  const transactionId: string | undefined = data?.id;

  const eventId =
    req.headers.get("x-webhook-id") ||
    payload?.id ||
    `${type ?? "event"}:${transactionId ?? reference ?? raw.length}`;

  // Resolve the order (by our reference = orderNumber, else metadata.orderId).
  let orderRow: typeof orders.$inferSelect | undefined;
  if (reference) {
    [orderRow] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, reference))
      .limit(1);
  }
  if (!orderRow && metadataOrderId) {
    [orderRow] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, metadataOrderId))
      .limit(1);
  }

  // Idempotency: record the event; a duplicate eventId is a no-op.
  const inserted = await db
    .insert(paymentEvents)
    .values({
      provider: "yetopay",
      eventId: String(eventId),
      orderId: orderRow?.id ?? null,
      type: type ?? null,
      status: status ?? null,
      raw: payload,
    })
    .onConflictDoNothing({ target: paymentEvents.eventId })
    .returning({ id: paymentEvents.id });

  if (inserted.length === 0) {
    return Response.json({ ok: true, duplicate: true });
  }

  if (!orderRow) {
    // Recorded for audit, but we don't know the order.
    return Response.json({ ok: true, unmatched: true });
  }

  const isPaid = type === "payment.completed" || status === "completed";
  const isFailed = type === "payment.failed" || status === "failed";
  const isCancelled = type === "payment.cancelled" || status === "cancelled";

  if (isPaid && orderRow.paymentStatus !== "paid") {
    await db
      .update(orders)
      .set({
        paymentStatus: "paid",
        paymentProvider: "yetopay",
        paymentReference: transactionId ?? orderRow.paymentReference,
        paidAt: new Date(),
        status: orderRow.status === "new" ? "confirmed" : orderRow.status,
      })
      .where(eq(orders.id, orderRow.id));
    // First paid → notify customer/admin + create the BobGo courier order.
    await handleOrderPaid(orderRow.id);
  } else if (isFailed) {
    await db
      .update(orders)
      .set({ paymentStatus: "failed" })
      .where(eq(orders.id, orderRow.id));
  } else if (isCancelled) {
    await db
      .update(orders)
      .set({ paymentStatus: "cancelled" })
      .where(eq(orders.id, orderRow.id));
  }

  return Response.json({ ok: true });
}
