import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { settings } from "@/server/db/schema";
import { site } from "@/data/site";
import type { SiteSettings } from "@/lib/settings-types";
import type { PaymentProvider } from "@/lib/integrations";
import { DEFAULT_DISCOUNT_RULE, type DiscountRule } from "@/lib/discount";

const pick = (v: string | null | undefined, fallback: string) =>
  v && v.trim() ? v.trim() : fallback;

const PAYMENT_PROVIDERS: PaymentProvider[] = ["yetopay", "yoco", "bobpay"];

/** Merged, resolved site settings (DB over defaults). Cached per request. */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.id, "site"))
    .limit(1);

  const number = pick(row?.whatsappNumber, site.whatsapp.number);

  return {
    name: site.name,
    url: site.url,
    since: site.since,
    meaning: site.meaning,
    location: site.location,
    tagline: pick(row?.tagline, site.tagline),
    story: pick(row?.story, site.story),
    collection: pick(row?.collection, site.collection),
    email: pick(row?.email, site.email),
    whatsapp: {
      number,
      display: pick(row?.whatsappDisplay, site.whatsapp.display),
      href: `https://wa.me/${number}`,
    },
    instagram: {
      handle: pick(row?.instagramHandle, site.instagram.handle),
      href: pick(row?.instagramUrl, site.instagram.href),
      enabled: row?.instagramEnabled ?? true,
    },
    facebook: {
      handle: pick(row?.facebookHandle, site.facebook.handle),
      href: pick(row?.facebookUrl, site.facebook.href),
      enabled: row?.facebookEnabled ?? true,
    },
    paymentProvider: PAYMENT_PROVIDERS.includes(
      row?.paymentProvider as PaymentProvider
    )
      ? (row!.paymentProvider as PaymentProvider)
      : null,
    offerBothGateways: row?.offerBothGateways ?? false,
    containerDiscount: {
      enabled: row?.containerDiscountEnabled ?? DEFAULT_DISCOUNT_RULE.enabled,
      percent: clampPercent(row?.containerDiscountPercent),
      scope: row?.containerDiscountScope === "all" ? "all" : "selected",
      label: pick(row?.containerDiscountLabel, DEFAULT_DISCOUNT_RULE.label),
    },
  };
});

/** 1–100, else the default. */
function clampPercent(v: number | null | undefined): DiscountRule["percent"] {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    return DEFAULT_DISCOUNT_RULE.percent;
  }
  return Math.min(100, Math.max(0, Math.trunc(v)));
}

/** Raw settings row for the admin form (nulls = "use default"). */
export async function getRawSettings() {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.id, "site"))
    .limit(1);
  return row ?? null;
}
