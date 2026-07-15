import "server-only";
import { desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { promotions, promotionRedemptions } from "@/server/db/schema";
import type { Promotion } from "@/lib/promotions";

/** A promotion row + how many times it's been redeemed. */
export interface AdminPromotionRow extends Promotion {
  usageCount: number;
  createdAt: Date;
}

const usageSubquery = sql<number>`(
  select count(*)::int from ${promotionRedemptions}
  where ${promotionRedemptions.promotionId} = ${promotions.id}
)`;

export async function getAdminPromotions(): Promise<AdminPromotionRow[]> {
  return db
    .select({
      id: promotions.id,
      name: promotions.name,
      code: promotions.code,
      type: promotions.type,
      value: promotions.value,
      minSubtotalZAR: promotions.minSubtotalZAR,
      freeShippingCapZAR: promotions.freeShippingCapZAR,
      startsAt: promotions.startsAt,
      endsAt: promotions.endsAt,
      usageLimit: promotions.usageLimit,
      stackable: promotions.stackable,
      enabled: promotions.enabled,
      createdAt: promotions.createdAt,
      usageCount: usageSubquery,
    })
    .from(promotions)
    .orderBy(desc(promotions.createdAt));
}

/** How many times a promotion has been redeemed. */
export async function getPromotionUsage(id: string): Promise<number> {
  const [r] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(promotionRedemptions)
    .where(eq(promotionRedemptions.promotionId, id));
  return r?.n ?? 0;
}

/** Look a coupon up by code (case-insensitive). Null when unknown. */
export async function getPromotionByCode(
  code: string
): Promise<Promotion | null> {
  const [row] = await db
    .select()
    .from(promotions)
    .where(sql`lower(${promotions.code}) = lower(${code.trim()})`)
    .limit(1);
  return row ?? null;
}

/**
 * Promotions that apply with no code. Several may exist; the caller picks the
 * one worth the most for this cart.
 */
export async function getAutomaticPromotions(): Promise<Promotion[]> {
  return db
    .select()
    .from(promotions)
    .where(isNull(promotions.code))
    .orderBy(desc(promotions.createdAt));
}

export async function getPromotion(id: string): Promise<Promotion | null> {
  const [row] = await db
    .select()
    .from(promotions)
    .where(eq(promotions.id, id))
    .limit(1);
  return row ?? null;
}
