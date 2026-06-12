import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { orders, customRequests, paymentEvents } from "@/server/db/schema";
import { getBobpayConfig } from "@/server/db/integrations";
import {
  verifyBobpayWebhook,
  type BobpayWebhookPayload,
} from "@/server/payments/bobpay";
import { handleOrderPaid } from "@/server/orders/fulfilment";
import { handleCustomPaymentPaid } from "@/server/custom-requests/fulfilment";

export const dynamic = "force-dynamic";

/**
 * Bob Pay payment webhook (the intent's `notify_url`). Bob Pay POSTs
 * `{ custom_payment_id, status, amount, payment }`. We authenticate it by
 * echoing the body back to Bob Pay's validate endpoint, then resolve the record
 * from `custom_payment_id` — which is our own reference: an order number
 * (`UMT-…`) or a custom-request payment ref (`CR-…-DEP-<n>` / `-BAL-<n>`).
 * Idempotent via `payment_events`.
 */
export async function POST(req: Request) {
  const raw = await req.text();
  console.log("[bobpay webhook] received", { bytes: raw.length });

  const config = await getBobpayConfig();
  if (!config) {
    console.warn(
      "[bobpay webhook] IGNORED - Bob Pay disabled or not configured in /admin/integrations"
    );
    return Response.json({ ok: true, ignored: true });
  }

  const ok = await verifyBobpayWebhook(config, raw);
  if (!ok) {
    console.warn("[bobpay webhook] VALIDATION FAILED (validate endpoint != 200)");
    return new Response("Invalid", { status: 401 });
  }

  let event: BobpayWebhookPayload;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const cpid = event.custom_payment_id ?? "";
  const status = event.status;
  const paymentId = event.payment?.id;
  const isPaid = status === "paid";
  const eventId = `bobpay:${paymentId ?? cpid}:${status ?? "?"}`;

  // Custom-request payment? Ref looks like "CR-260608-7F3A-DEP-500".
  const cr = /^(.+)-(DEP|BAL)-\d+$/.exec(cpid);
  if (cr) {
    const requestNumber = cr[1];
    const kind = cr[2] === "BAL" ? "balance" : "deposit";
    const [row] = await db
      .select({ id: customRequests.id })
      .from(customRequests)
      .where(eq(customRequests.requestNumber, requestNumber))
      .limit(1);

    const inserted = await db
      .insert(paymentEvents)
      .values({
        provider: "bobpay",
        eventId,
        orderId: null,
        type: null,
        status: status ?? null,
        raw: event as unknown as Record<string, unknown>,
      })
      .onConflictDoNothing({ target: paymentEvents.eventId })
      .returning({ id: paymentEvents.id });
    if (inserted.length === 0) {
      return Response.json({ ok: true, duplicate: true });
    }

    if (isPaid && row) {
      await handleCustomPaymentPaid(row.id, kind);
    }
    return Response.json({ ok: true, custom: true });
  }

  // Otherwise it's an order — custom_payment_id is the order number.
  let orderRow: typeof orders.$inferSelect | undefined;
  if (cpid) {
    [orderRow] = await db
      .select()
      .from(orders)
      .where(eq(orders.orderNumber, cpid))
      .limit(1);
  }

  const inserted = await db
    .insert(paymentEvents)
    .values({
      provider: "bobpay",
      eventId,
      orderId: orderRow?.id ?? null,
      type: null,
      status: status ?? null,
      raw: event as unknown as Record<string, unknown>,
    })
    .onConflictDoNothing({ target: paymentEvents.eventId })
    .returning({ id: paymentEvents.id });
  if (inserted.length === 0) {
    return Response.json({ ok: true, duplicate: true });
  }

  if (!orderRow) {
    console.warn("[bobpay webhook] NO ORDER MATCHED", { cpid });
    return Response.json({ ok: true, unmatched: true });
  }

  if (isPaid && orderRow.paymentStatus !== "paid") {
    await db
      .update(orders)
      .set({
        paymentStatus: "paid",
        paymentProvider: "bobpay",
        paymentReference: paymentId ?? orderRow.paymentReference,
        paidAt: new Date(),
        status: orderRow.status === "new" ? "confirmed" : orderRow.status,
      })
      .where(eq(orders.id, orderRow.id));
    await handleOrderPaid(orderRow.id);
    console.log("[bobpay webhook] ORDER MARKED PAID", orderRow.orderNumber);
  }

  return Response.json({ ok: true });
}
