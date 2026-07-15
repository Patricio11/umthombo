"use server";

import { inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { products } from "@/server/db/schema";
import { getSiteSettings } from "@/server/db/settings";
import { computeDiscount } from "@/lib/discount";
import { resolvePromotion } from "@/server/payments/promo-resolver";

export interface CouponPreview {
  ok: boolean;
  /** Why it didn't apply — customer-facing. */
  error?: string;
  /** The promotion's name, for the summary line. */
  name?: string;
  /** What it's worth on this cart. */
  valueZAR?: number;
  freeShipping?: boolean;
}

export interface PreviewInput {
  code: string;
  method: "delivery" | "collection";
  /** The courier fee the customer has selected, if any. */
  deliveryFeeZAR: number;
  items: { slug: string; qty: number; containersReturned?: number }[];
}

/**
 * Check a coupon and tell the customer what it's worth — **preview only**.
 * `placeOrder` re-resolves everything server-side before charging, so a stale
 * or tampered preview can never affect the price.
 */
export async function previewCoupon(input: PreviewInput): Promise<CouponPreview> {
  const code = input.code?.trim();
  if (!code) return { ok: false, error: "Enter a code." };
  if (!input.items?.length) return { ok: false, error: "Your basket is empty." };

  const slugs = [...new Set(input.items.map((i) => i.slug))];
  const [rows, settings] = await Promise.all([
    db.select().from(products).where(inArray(products.slug, slugs)),
    getSiteSettings(),
  ]);
  const bySlug = new Map(rows.map((r) => [r.slug, r]));

  // Re-price + re-discount from the DB, exactly like placeOrder does.
  let subtotalZAR = 0;
  const lines = [];
  for (const it of input.items) {
    const p = bySlug.get(it.slug);
    if (!p || p.status !== "active") continue;
    subtotalZAR += p.priceZAR * it.qty;
    lines.push({
      unitPriceZAR: p.priceZAR,
      qty: it.qty,
      containerEligible: p.containerEligible,
      containersReturned: it.containersReturned ?? 0,
    });
  }
  const containerDiscountZAR = computeDiscount(
    lines,
    settings.containerDiscount
  ).totalZAR;

  const res = await resolvePromotion(
    {
      subtotalZAR,
      containerDiscountZAR,
      deliveryFeeZAR: Math.max(0, input.deliveryFeeZAR || 0),
      method: input.method,
      usageCount: 0, // resolver re-reads the real count
      now: new Date(),
    },
    code
  );

  if (!res.applied) {
    return { ok: false, error: res.codeError ?? "That code doesn’t apply." };
  }
  return {
    ok: true,
    name: res.applied.promo.name,
    valueZAR: res.applied.evaluation.valueZAR,
    freeShipping: res.applied.evaluation.freeShipping,
  };
}
