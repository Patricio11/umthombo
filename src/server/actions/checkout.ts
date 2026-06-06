"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { orders, orderItems, products } from "@/server/db/schema";
import {
  getBobgoConfig,
  getYetopayConfig,
  isIntegrationEnabled,
} from "@/server/db/integrations";
import { getRatesAtCheckout, type ShipItem } from "@/server/shipping/bobgo";
import { createPaymentLink } from "@/server/payments/yetopay";
import { getSiteSettings } from "@/server/db/settings";
import { getOrderConfirmation } from "@/server/db/order-public";
import { ZA_PROVINCES } from "@/lib/integrations";
import {
  createPendingOrderSchema,
  type CreatePendingOrderInput,
} from "@/lib/checkout-schema";
import { formatZAR } from "@/lib/format";
import { site } from "@/data/site";
import type { DeliveryAddress } from "@/lib/shipping";

export interface CreatePendingOrderResult {
  ok: boolean;
  error?: string;
  orderId?: string;
  orderNumber?: string;
  totalZAR?: number;
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

const provinceName = (code: string) =>
  ZA_PROVINCES.find((p) => p.code === code.toUpperCase())?.name ?? code;

function flattenAddress(a: DeliveryAddress): string {
  return [
    a.company,
    a.streetAddress,
    a.localArea,
    a.city,
    provinceName(a.zone),
    a.code,
  ]
    .map((s) => (s ?? "").trim())
    .filter(Boolean)
    .join(", ");
}

/**
 * Create an order in the `pending` payment state. Everything is re-priced
 * from the DB and, for delivery, the chosen courier rate is re-verified
 * against BobGo (never trust the client). Returns the new order's identifiers
 * so the caller can start payment (Phase 5) or show a confirmation.
 */
export async function createPendingOrder(
  input: CreatePendingOrderInput
): Promise<CreatePendingOrderResult> {
  const parsed = createPendingOrderSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check your details.",
    };
  }
  const data = parsed.data;

  // 1. Re-price every line from the DB.
  const slugs = [...new Set(data.items.map((i) => i.slug))];
  const rows = await db
    .select()
    .from(products)
    .where(inArray(products.slug, slugs));
  const bySlug = new Map(rows.map((r) => [r.slug, r]));

  const lines: (typeof orderItems.$inferInsert)[] = [];
  const shipItems: ShipItem[] = [];
  let subtotal = 0;

  for (const it of data.items) {
    const p = bySlug.get(it.slug);
    if (!p || p.status !== "active") {
      return { ok: false, error: `"${it.slug}" is no longer available.` };
    }
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
    shipItems.push({
      description: p.name,
      priceZAR: unit,
      quantity: it.qty,
      weightKg: p.weightKg,
      lengthCm: p.lengthCm,
      widthCm: p.widthCm,
      heightCm: p.heightCm,
      sku: p.slug,
    });
  }

  const goodsTotal = data.ownContainer ? Math.round(subtotal * 0.9) : subtotal;

  // 2. Delivery: re-verify the chosen rate against BobGo.
  let deliveryFee = 0;
  let shippingService: string | null = null;
  let shippingServiceCode: string | null = null;
  let shippingAddressJson: DeliveryAddress | null = null;
  let shippingAddressText: string | null = null;

  if (data.method === "delivery") {
    const address = data.address as DeliveryAddress;
    const config = await getBobgoConfig();
    if (!config) {
      return { ok: false, error: "Delivery isn’t available right now." };
    }
    let rates;
    try {
      rates = await getRatesAtCheckout(config, {
        deliveryAddress: address,
        items: shipItems,
        declaredValueZAR: subtotal,
      });
    } catch (err) {
      console.error("[checkout] rate re-verification failed:", err);
      return {
        ok: false,
        error: "We couldn’t confirm delivery. Please try again.",
      };
    }
    const chosen = rates.find((r) => r.serviceCode === data.serviceCode);
    if (!chosen) {
      return {
        ok: false,
        error: "That delivery option is no longer available — please refresh.",
      };
    }
    deliveryFee = chosen.priceZAR;
    shippingService = chosen.serviceName;
    shippingServiceCode = chosen.serviceCode;
    shippingAddressJson = address;
    shippingAddressText = flattenAddress(address);
  }

  const total = goodsTotal + deliveryFee;
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
        shippingAddress: shippingAddressText,
        shippingAddressJson:
          (shippingAddressJson as Record<string, unknown> | null) ?? undefined,
        note: data.note ?? null,
        ownContainer: data.ownContainer,
        subtotalZAR: subtotal,
        deliveryFeeZAR: deliveryFee,
        totalZAR: total,
        status: "new",
        shippingService,
        shippingServiceCode,
        paymentStatus: "pending",
      });
      await tx.insert(orderItems).values(lines.map((l) => ({ ...l, orderId })));
    });
  } catch (err) {
    console.error("[checkout] createPendingOrder failed:", err);
    return { ok: false, error: "We couldn’t save your order. Please try again." };
  }

  revalidatePath("/admin", "layout");
  return { ok: true, orderId, orderNumber, totalZAR: total };
}

/* ------------------------------------------------------------------ */
/*  Place order — create the pending order, then route to payment      */
/* ------------------------------------------------------------------ */
export interface PlaceOrderResult {
  ok: boolean;
  error?: string;
  mode?: "payment" | "whatsapp" | "manual";
  redirectUrl?: string; // YetoPay hosted payment page
  whatsappUrl?: string; // WhatsApp fallback deep link
  orderNumber?: string;
}

const appUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL || site.url).replace(/\/+$/, "");

/**
 * The single action the checkout calls. Creates the pending order then:
 *  1. YetoEFT configured → create a payment link, return its redirect URL.
 *  2. else WhatsApp on   → return a pre-filled WhatsApp deep link (fallback).
 *  3. else               → record as manual; the owner follows up.
 */
export async function placeOrder(
  input: CreatePendingOrderInput
): Promise<PlaceOrderResult> {
  const created = await createPendingOrder(input);
  if (!created.ok || !created.orderId || !created.orderNumber) {
    return { ok: false, error: created.error };
  }
  const { orderId, orderNumber } = created;
  const total = created.totalZAR ?? 0;

  // 1. Online payment (primary when configured).
  const yeto = await getYetopayConfig();
  if (yeto) {
    const link = await createPaymentLink(yeto, {
      amountZAR: total,
      reference: orderNumber,
      description: `Umthombo Creations order ${orderNumber}`,
      customerName: input.name,
      customerEmail: input.email,
      successUrl: `${appUrl()}/checkout/success?order=${orderNumber}`,
      failureUrl: `${appUrl()}/checkout/cancelled?order=${orderNumber}`,
      cancelledUrl: `${appUrl()}/checkout/cancelled?order=${orderNumber}`,
      notifyUrl: `${appUrl()}/api/webhooks/yetopay`,
      metadata: { orderId, orderNumber },
    });
    if (!link.ok || !link.paymentUrl) {
      return { ok: false, error: link.error ?? "Couldn’t start payment." };
    }
    await db
      .update(orders)
      .set({
        paymentProvider: "yetopay",
        paymentReference: link.transactionId ?? null,
      })
      .where(eq(orders.id, orderId));
    return {
      ok: true,
      mode: "payment",
      redirectUrl: link.paymentUrl,
      orderNumber,
    };
  }

  // 2. WhatsApp fallback.
  if (await isIntegrationEnabled("whatsapp")) {
    const settings = await getSiteSettings();
    const whatsappUrl = await buildWhatsAppLink(settings.whatsapp.href, orderNumber);
    await db
      .update(orders)
      .set({ paymentProvider: "whatsapp" })
      .where(eq(orders.id, orderId));
    return { ok: true, mode: "whatsapp", whatsappUrl, orderNumber };
  }

  // 3. Manual — order recorded, owner follows up.
  await db
    .update(orders)
    .set({ paymentProvider: "manual" })
    .where(eq(orders.id, orderId));
  return { ok: true, mode: "manual", orderNumber };
}

/** Build a pre-filled WhatsApp order message from the saved order. */
async function buildWhatsAppLink(
  whatsappHref: string,
  orderNumber: string
): Promise<string> {
  const conf = await getOrderConfirmation(orderNumber);
  const lines: string[] = [];
  lines.push(`Hi Umthombo Creations 🌱 I've just placed order ${orderNumber}:`);
  lines.push("");
  if (conf) {
    for (const it of conf.items) {
      const variant = it.variant ? ` · ${it.variant}` : "";
      lines.push(
        `• ${it.qty} × ${it.name}${variant}  ${formatZAR(it.lineTotalZAR)}`
      );
    }
    lines.push("");
    if (conf.method === "delivery") {
      lines.push(
        `Delivery${conf.shippingService ? ` (${conf.shippingService})` : ""}: ${formatZAR(conf.deliveryFeeZAR)}`
      );
    } else {
      lines.push("Collection");
    }
    lines.push(`Total: ${formatZAR(conf.totalZAR)}`);
    lines.push(`Name: ${conf.customerName}`);
  }
  lines.push("");
  lines.push("I'd like to arrange payment, please.");
  return `${whatsappHref}?text=${encodeURIComponent(lines.join("\n"))}`;
}
