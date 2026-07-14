"use server";

import { revalidatePath } from "next/cache";
import { inArray } from "drizzle-orm";
import { db } from "@/server/db";
import { settings, products } from "@/server/db/schema";
import { requireAdmin } from "@/server/auth/guard";
import type { DiscountScope } from "@/lib/discount";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

function revalidate() {
  // The rule + eligibility drive the storefront cart/checkout too.
  revalidatePath("/", "layout");
  revalidatePath("/admin/discounts");
}

/** Save the bring-back discount rule (on/off, percent, scope). */
export async function updateDiscountRule(input: {
  enabled: boolean;
  percent: number;
  scope: DiscountScope;
}): Promise<ActionResult> {
  await requireAdmin();

  const percent = Math.trunc(Number(input.percent));
  if (!Number.isFinite(percent) || percent < 1 || percent > 100) {
    return { ok: false, error: "Percent must be between 1 and 100." };
  }
  const scope: DiscountScope = input.scope === "all" ? "all" : "selected";
  const values = {
    containerDiscountEnabled: !!input.enabled,
    containerDiscountPercent: percent,
    containerDiscountScope: scope,
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
