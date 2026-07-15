"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { settings, products, promotions } from "@/server/db/schema";
import { requireAdmin } from "@/server/auth/guard";
import type { DiscountScope } from "@/lib/discount";
import { promotionSchema, type PromotionInput } from "@/lib/promotion-schema";
import type { PromotionType } from "@/lib/promotions";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function revalidate() {
  // The rule + eligibility drive the storefront cart/checkout too.
  revalidatePath("/", "layout");
  revalidatePath("/admin/discounts");
}

/** Save the bring-back discount rule (on/off, percent, scope, label). */
export async function updateDiscountRule(input: {
  enabled: boolean;
  percent: number;
  scope: DiscountScope;
  label: string;
}): Promise<ActionResult> {
  await requireAdmin();

  const percent = Math.trunc(Number(input.percent));
  if (!Number.isFinite(percent) || percent < 1 || percent > 100) {
    return { ok: false, error: "Percent must be between 1 and 100." };
  }
  const label = input.label.trim();
  if (!label) return { ok: false, error: "Give the discount a name." };
  if (label.length > 60) return { ok: false, error: "That name is too long." };

  const scope: DiscountScope = input.scope === "all" ? "all" : "selected";
  const values = {
    containerDiscountEnabled: !!input.enabled,
    containerDiscountPercent: percent,
    containerDiscountScope: scope,
    containerDiscountLabel: label,
  };

  await db
    .insert(settings)
    .values({ id: "site", ...values })
    .onConflictDoUpdate({ target: settings.id, set: values });

  revalidate();
  return { ok: true };
}

/**
 * Bulk-set exactly which products are container-eligible. Everything not in
 * `ids` is cleared, so the picker is the whole truth in one save.
 */
export async function setEligibleProducts(ids: string[]): Promise<ActionResult> {
  await requireAdmin();
  const unique = [...new Set(ids.filter(Boolean))];

  await db.transaction(async (tx) => {
    await tx.update(products).set({ containerEligible: false });
    if (unique.length > 0) {
      await tx
        .update(products)
        .set({ containerEligible: true })
        .where(inArray(products.id, unique));
    }
  });

  revalidate();
  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Promotions & coupons                                               */
/* ------------------------------------------------------------------ */
function toRow(d: ReturnType<typeof promotionSchema.parse>) {
  return {
    name: d.name,
    code: d.code,
    type: d.type as PromotionType,
    value: d.type === "free_shipping" ? 0 : d.value,
    minSubtotalZAR: d.minSubtotalZAR,
    // A cap only means anything for free delivery.
    freeShippingCapZAR: d.type === "free_shipping" ? d.freeShippingCapZAR : null,
    startsAt: d.startsAt,
    endsAt: d.endsAt,
    usageLimit: d.usageLimit,
    stackable: d.stackable,
    enabled: d.enabled,
  };
}

const isDuplicateCode = (err: unknown) =>
  /unique|duplicate|promotions_code_unique/i.test((err as Error)?.message ?? "");

export async function createPromotion(
  input: PromotionInput
): Promise<ActionResult & { id?: string }> {
  await requireAdmin();
  const parsed = promotionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid promotion." };
  }
  try {
    const [row] = await db
      .insert(promotions)
      .values(toRow(parsed.data))
      .returning({ id: promotions.id });
    revalidate();
    return { ok: true, id: row.id };
  } catch (err) {
    if (isDuplicateCode(err)) return { ok: false, error: "That code is already in use." };
    console.error("[promotions] create failed:", err);
    return { ok: false, error: "Couldn’t save the promotion." };
  }
}

export async function updatePromotion(
  id: string,
  input: PromotionInput
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = promotionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid promotion." };
  }
  try {
    await db.update(promotions).set(toRow(parsed.data)).where(eq(promotions.id, id));
    revalidate();
    return { ok: true };
  } catch (err) {
    if (isDuplicateCode(err)) return { ok: false, error: "That code is already in use." };
    console.error("[promotions] update failed:", err);
    return { ok: false, error: "Couldn’t save the promotion." };
  }
}

/** Quick on/off from the list. */
export async function setPromotionEnabled(
  id: string,
  enabled: boolean
): Promise<ActionResult> {
  await requireAdmin();
  await db.update(promotions).set({ enabled }).where(eq(promotions.id, id));
  revalidate();
  return { ok: true };
}

/** Delete a promotion. Redemptions cascade; orders keep their code snapshot. */
export async function deletePromotion(id: string): Promise<ActionResult> {
  await requireAdmin();
  await db.delete(promotions).where(eq(promotions.id, id));
  revalidate();
  return { ok: true };
}
