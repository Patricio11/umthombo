import "server-only";
import {
  evaluatePromotion,
  type Promotion,
  type PromoContext,
  type PromoEvaluation,
} from "@/lib/promotions";
import {
  getPromotionByCode,
  getAutomaticPromotions,
  getPromotionUsage,
} from "@/server/db/promotions";

export interface ResolvedPromo {
  promo: Promotion;
  evaluation: PromoEvaluation;
}

export interface PromoResolution {
  /** The winning promotion, if any qualifies. */
  applied: ResolvedPromo | null;
  /** Set only when the customer typed a code that didn't work — so we can say why. */
  codeError?: string;
}

/**
 * Decide which promotion (if any) applies to a cart. **The single authority** —
 * used by the checkout preview and again by `placeOrder` before charging.
 *
 * A typed code always takes precedence (and explains itself if it fails).
 * Otherwise the best-value automatic promotion wins, so the customer never has
 * to know a rule exists.
 */
export async function resolvePromotion(
  ctx: PromoContext,
  code?: string | null
): Promise<PromoResolution> {
  const typed = code?.trim();

  if (typed) {
    const promo = await getPromotionByCode(typed);
    if (!promo) {
      return { applied: null, codeError: "We don’t recognise that code." };
    }
    const usageCount = await getPromotionUsage(promo.id);
    const evaluation = evaluatePromotion(promo, { ...ctx, usageCount });
    if (!evaluation.ok) {
      return { applied: null, codeError: evaluation.message };
    }
    return { applied: { promo, evaluation } };
  }

  // No code: apply the best automatic promotion that qualifies.
  const autos = await getAutomaticPromotions();
  let best: ResolvedPromo | null = null;
  for (const promo of autos) {
    const usageCount = await getPromotionUsage(promo.id);
    const evaluation = evaluatePromotion(promo, { ...ctx, usageCount });
    if (!evaluation.ok) continue;
    if (!best || evaluation.valueZAR > best.evaluation.valueZAR) {
      best = { promo, evaluation };
    }
  }
  return { applied: best };
}
