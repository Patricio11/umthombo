import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { orders, orderItems, products } from "@/server/db/schema";
import { getBobgoConfig } from "@/server/db/integrations";
import { getSiteSettings } from "@/server/db/settings";
import { createBobgoOrder, type ShipItem } from "@/server/shipping/bobgo";
import { sendEmail } from "@/server/email/resend";
import {
  orderConfirmationEmail,
  adminOrderEmail,
  trackingEmail,
  type OrderEmailData,
} from "@/server/email/templates";
import type { DeliveryAddress } from "@/lib/shipping";

type OrderRow = typeof orders.$inferSelect;

interface FulfilmentItem {
  name: string;
  variant: string | null;
  qty: number;
  unitPriceZAR: number;
  lineTotalZAR: number;
  weightKg: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  slug: string | null;
}

async function loadOrderWithItems(
  orderId: string
): Promise<{ order: OrderRow; items: FulfilmentItem[] } | null> {
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order) return null;

  const items = await db
    .select({
      name: orderItems.name,
      variant: orderItems.variant,
      qty: orderItems.qty,
      unitPriceZAR: orderItems.unitPriceZAR,
      lineTotalZAR: orderItems.lineTotalZAR,
      weightKg: products.weightKg,
      lengthCm: products.lengthCm,
      widthCm: products.widthCm,
      heightCm: products.heightCm,
      slug: products.slug,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, orderId));

  return { order, items };
}

function toEmailData(order: OrderRow, items: FulfilmentItem[]): OrderEmailData {
  return {
    orderNumber: order.orderNumber,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    method: order.method,
    items: items.map((i) => ({
      name: i.name,
      variant: i.variant,
      qty: i.qty,
      lineTotalZAR: i.lineTotalZAR,
    })),
    subtotalZAR: order.subtotalZAR,
    deliveryFeeZAR: order.deliveryFeeZAR,
    totalZAR: order.totalZAR,
    shippingService: order.shippingService,
    addressText: order.shippingAddress,
    trackingReference: order.trackingReference,
    trackingUrl: order.trackingUrl,
  };
}

/**
 * Runs once when an order first becomes paid: notify the customer + admin,
 * and (for a delivery order with BobGo on) create the courier order so the
 * owner can fulfil it. Best-effort  never throws into the webhook.
 */
export async function handleOrderPaid(orderId: string): Promise<void> {
  try {
    const loaded = await loadOrderWithItems(orderId);
    if (!loaded) return;
    const { order, items } = loaded;
    const settings = await getSiteSettings();
    const emailData = toEmailData(order, items);

    // 1. Notify customer + admin.
    const customer = orderConfirmationEmail(emailData);
    await sendEmail({
      to: order.customerEmail,
      subject: customer.subject,
      html: customer.html,
    });
    if (settings.email) {
      const admin = adminOrderEmail(emailData);
      await sendEmail({
        to: settings.email,
        subject: admin.subject,
        html: admin.html,
        replyTo: order.customerEmail,
      });
    }

    // 2. Create the BobGo courier order for delivery orders.
    await createBobgoShipment(order.id);
  } catch (err) {
    console.error("[fulfilment] handleOrderPaid failed:", err);
  }
}

/**
 * Create the BobGo courier order for a paid delivery order (idempotent: skips
 * if it already has a `bobgoOrderId`). Usable from the admin "Create shipment"
 * action and from `handleOrderPaid`.
 */
export async function createBobgoShipment(
  orderId: string
): Promise<{ ok: boolean; error?: string }> {
  const loaded = await loadOrderWithItems(orderId);
  if (!loaded) return { ok: false, error: "Order not found." };
  const { order, items } = loaded;

  if (order.method !== "delivery" || !order.shippingAddressJson) {
    return { ok: false, error: "This isn’t a delivery order." };
  }
  if (order.bobgoOrderId) {
    return { ok: true }; // already created
  }
  const config = await getBobgoConfig();
  if (!config) return { ok: false, error: "BobGo isn’t enabled." };

  const shipItems: ShipItem[] = items.map((i) => ({
    description: i.name,
    priceZAR: i.unitPriceZAR,
    quantity: i.qty,
    weightKg: i.weightKg,
    lengthCm: i.lengthCm,
    widthCm: i.widthCm,
    heightCm: i.heightCm,
    sku: i.slug ?? undefined,
  }));
  try {
    const created = await createBobgoOrder(config, {
      channelOrderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      deliveryAddress: order.shippingAddressJson as unknown as DeliveryAddress,
      shippingCostZAR: order.deliveryFeeZAR,
      shippingMethod: order.shippingServiceCode ?? "",
      items: shipItems,
    });
    if (created.id) {
      await db
        .update(orders)
        .set({ bobgoOrderId: created.id })
        .where(eq(orders.id, order.id));
    }
    return { ok: true };
  } catch (err) {
    console.error("[fulfilment] createBobgoShipment failed:", err);
    return { ok: false, error: "Couldn’t create the BobGo shipment." };
  }
}

/**
 * Applies a BobGo fulfilment webhook to an order: updates tracking +
 * shipment status on every call, advances the lifecycle, and emails the
 * customer their tracking link the first time a waybill appears.
 */
export async function applyBobgoFulfilment(
  order: OrderRow,
  update: {
    trackingReference: string | null;
    methodStatus: string | null;
    failed: boolean;
  }
): Promise<void> {
  const trackingUrl = update.trackingReference
    ? `https://track.bobgo.co.za/${update.trackingReference}`
    : order.trackingUrl;

  const isFirstTracking =
    !!update.trackingReference && !order.trackingReference;

  const nextStatus =
    update.methodStatus === "delivered"
      ? "completed"
      : update.trackingReference
      ? "preparing"
      : order.status;

  await db
    .update(orders)
    .set({
      trackingReference: update.trackingReference ?? order.trackingReference,
      trackingUrl,
      shipmentStatus: update.methodStatus ?? order.shipmentStatus,
      status: nextStatus,
    })
    .where(eq(orders.id, order.id));

  if (isFirstTracking) {
    const loaded = await loadOrderWithItems(order.id);
    if (loaded) {
      const data = toEmailData(loaded.order, loaded.items);
      const mail = trackingEmail({
        ...data,
        trackingReference: update.trackingReference,
        trackingUrl,
      });
      await sendEmail({
        to: order.customerEmail,
        subject: mail.subject,
        html: mail.html,
      });
    }
  }
}
