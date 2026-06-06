import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { orders, paymentEvents } from "@/server/db/schema";
import { applyBobgoFulfilment } from "@/server/orders/fulfilment";

export const dynamic = "force-dynamic";

/**
 * BobGo fulfilment webhook. The owner subscribes this URL in the BobGo
 * dashboard. BobGo sends a plain payload (no token, no HMAC); we treat it as
 * trusted because it only ever updates an existing order matched by
 * `channel_order_number` and only writes shipping/tracking fields. It fires
 * once per status change, so we update on every call.
 */
export async function POST(req: Request) {
  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const channelOrderNumber: string | undefined = payload?.channel_order_number;
  if (!channelOrderNumber) {
    return new Response("Missing channel_order_number", { status: 400 });
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.orderNumber, channelOrderNumber))
    .limit(1);
  if (!order) {
    // Unknown order  acknowledge so BobGo stops retrying.
    return Response.json({ ok: true, unmatched: true });
  }

  const methodReference: string | null = payload?.method_reference ?? null;
  const methodStatus: string | null = payload?.method_status ?? null;
  const failed =
    payload?.status === "failed" || !!payload?.failed_reason;

  // Idempotency/audit: dedupe identical (shipment, status) re-fires.
  const eventId = `bobgo:${payload?.id ?? channelOrderNumber}:${
    methodStatus ?? "update"
  }:${methodReference ?? ""}`;
  const inserted = await db
    .insert(paymentEvents)
    .values({
      provider: "bobgo",
      eventId,
      orderId: order.id,
      type: "fulfilment",
      status: methodStatus ?? (failed ? "failed" : null),
      raw: payload,
    })
    .onConflictDoNothing({ target: paymentEvents.eventId })
    .returning({ id: paymentEvents.id });

  if (inserted.length === 0) {
    return Response.json({ ok: true, duplicate: true });
  }

  await applyBobgoFulfilment(order, {
    trackingReference: methodReference,
    methodStatus,
    failed,
  });

  return Response.json({ ok: true });
}
