"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { orders, orderItems, products } from "@/server/db/schema";
import { getBobgoConfig } from "@/server/db/integrations";
import { getRatesAtCheckout, type ShipItem } from "@/server/shipping/bobgo";
import { ZA_PROVINCES } from "@/lib/integrations";
import {
  createPendingOrderSchema,
  type CreatePendingOrderInput,
} from "@/lib/checkout-schema";
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
