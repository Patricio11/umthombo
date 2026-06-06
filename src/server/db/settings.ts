import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { settings } from "@/server/db/schema";
import { site } from "@/data/site";
import type { SiteSettings } from "@/lib/settings-types";

const pick = (v: string | null | undefined, fallback: string) =>
  v && v.trim() ? v.trim() : fallback;

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
  };
});

/** Raw settings row for the admin form (nulls = "use default"). */
export async function getRawSettings() {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.id, "site"))
    .limit(1);
  return row ?? null;
}
