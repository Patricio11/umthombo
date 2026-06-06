"use server";

import { z } from "zod";
import { inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { products } from "@/server/db/schema";
import { getBobgoConfig } from "@/server/db/integrations";
import { getRatesAtCheckout, type ShipItem } from "@/server/shipping/bobgo";
import type { RateOption } from "@/lib/shipping";

const addressSchema = z.object({
  company: z.string().trim().max(120).optional().default(""),
  streetAddress: z.string().trim().min(3, "Enter a street address.").max(200),
  localArea: z.string().trim().max(120).optional().default(""),
  city: z.string().trim().min(2, "Enter a city.").max(120),
  zone: z.string().trim().min(2, "Choose a province.").max(40),
  code: z.string().trim().min(4, "Enter a postal code.").max(10),
  country: z.string().trim().max(2).optional().default("ZA"),
});

const ratesInputSchema = z.object({
  items: z
    .array(
      z.object({
        slug: z.string().min(1),
        qty: z.number().int().min(1).max(99),
      })
    )
    .min(1, "Your selection is empty."),
  address: addressSchema,
});

export type GetDeliveryRatesInput = z.input<typeof ratesInputSchema>;

export interface GetDeliveryRatesResult {
  ok: boolean;
  rates?: RateOption[];
  error?: string;
}

/**
 * Live courier rates for a cart + delivery address. Prices and parcel
 * dimensions are taken from the DB (never trust the client). Returns a
 * graceful message when BobGo is disabled or unconfigured.
 */
export async function getDeliveryRates(
  input: GetDeliveryRatesInput
): Promise<GetDeliveryRatesResult> {
  const parsed = ratesInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Please check the address.",
    };
  }
  const data = parsed.data;

  const config = await getBobgoConfig();
  if (!config) {
    return { ok: false, error: "Delivery isn’t available right now." };
  }

  const slugs = [...new Set(data.items.map((i) => i.slug))];
  const rows = await db
    .select()
    .from(products)
    .where(inArray(products.slug, slugs));
  const bySlug = new Map(rows.map((r) => [r.slug, r]));

  const shipItems: ShipItem[] = [];
  let declaredValue = 0;
  for (const it of data.items) {
    const p = bySlug.get(it.slug);
    if (!p || p.status !== "active") {
      return { ok: false, error: `"${it.slug}" is no longer available.` };
    }
    declaredValue += p.priceZAR * it.qty;
    shipItems.push({
      description: p.name,
      priceZAR: p.priceZAR,
      quantity: it.qty,
      weightKg: p.weightKg,
      lengthCm: p.lengthCm,
      widthCm: p.widthCm,
      heightCm: p.heightCm,
      sku: p.slug,
    });
  }

  try {
    const rates = await getRatesAtCheckout(config, {
      deliveryAddress: data.address,
      items: shipItems,
      declaredValueZAR: declaredValue,
    });
    if (rates.length === 0) {
      return {
        ok: false,
        error: "No courier options for that address. Please check the details.",
      };
    }
    return { ok: true, rates };
  } catch (err) {
    console.error("[shipping] getDeliveryRates failed:", err);
    return {
      ok: false,
      error: "We couldn’t fetch delivery options. Please try again.",
    };
  }
}
