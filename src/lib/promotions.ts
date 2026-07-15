/** Promotions & coupons — one shared implementation.
 *  Client-safe (no server imports) so the checkout preview and the server agree
 *  exactly. The server is still the only authority: it re-reads the promotion
 *  and re-computes at `placeOrder`. Nothing here is hardcoded — every number,
 *  window and label comes from the admin's promotion row. */

export type PromotionType = "percent" | "fixed" | "free_shipping";

export const PROMOTION_TYPES: PromotionType[] = [
  "percent",
  "fixed",
  "free_shipping",
];

/** The admin-configured promotion (mirrors the `promotions` row). */
export interface Promotion {
  id: string;
  /** Admin label — also what the customer sees on the order summary. */
  name: string;
  /** null = applies automatically (no code to type). */
  code: string | null;
  type: PromotionType;
  /** percent (10 = 10%) or rand (50 = R50). Ignored for free_shipping. */
  value: number;
  minSubtotalZAR: number | null;
  /** free_shipping only: most we absorb. null = the whole courier fee. */
  freeShippingCapZAR: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  stackable: boolean;
  enabled: boolean;
}

/** Everything the rule needs to judge a cart. */
export interface PromoContext {
  /** Goods subtotal BEFORE any discount — what the customer sees in the cart. */
  subtotalZAR: number;
  /** The bring-back discount already worked out for this cart. */
  containerDiscountZAR: number;
  /** The real courier cost (0 for collection). */
  deliveryFeeZAR: number;
  method: "delivery" | "collection";
  /** How many times this promotion has already been redeemed. */
  usageCount: number;
  now: Date;
}

export type PromoRejection =
  | "not_found"
  | "disabled"
  | "not_started"
  | "expired"
  | "used_up"
  | "below_minimum"
  | "delivery_only";

export interface PromoEvaluation {
  ok: boolean;
  reason?: PromoRejection;
  /** Customer-facing explanation when `ok` is false. */
  message?: string;
  /** The promotion's worth in rand — goods discount, or the shipping we waive.
   *  Lets "best one wins" compare a coupon against the bring-back discount. */
  valueZAR: number;
  /** True when the value is a waived delivery fee rather than money off goods. */
  freeShipping: boolean;
}

const money = (n: number) => `R${Math.round(n)}`;

/** Judge a promotion against a cart. Pure — no I/O. */
export function evaluatePromotion(
  promo: Promotion,
  ctx: PromoContext
): PromoEvaluation {
  const fail = (reason: PromoRejection, message: string): PromoEvaluation => ({
    ok: false,
    reason,
    message,
    valueZAR: 0,
    freeShipping: false,
  });

  if (!promo.enabled) return fail("disabled", "That code isn’t available.");
  if (promo.startsAt && ctx.now < promo.startsAt) {
    return fail("not_started", "That code isn’t active yet.");
  }
  if (promo.endsAt && ctx.now > promo.endsAt) {
    return fail("expired", "That code has expired.");
  }
  if (promo.usageLimit != null && ctx.usageCount >= promo.usageLimit) {
    return fail("used_up", "That code has been fully redeemed.");
  }
  if (promo.minSubtotalZAR != null && ctx.subtotalZAR < promo.minSubtotalZAR) {
    return fail(
      "below_minimum",
      `Spend ${money(promo.minSubtotalZAR)} or more to use this — you’re ${money(
        promo.minSubtotalZAR - ctx.subtotalZAR
      )} away.`
    );
  }

  if (promo.type === "free_shipping") {
    if (ctx.method !== "delivery" || ctx.deliveryFeeZAR <= 0) {
      return fail(
        "delivery_only",
        "That code applies to delivery orders — your order is for collection."
      );
    }
    // Uncapped by default (cap = null); a cap means the customer pays the excess.
    const waived =
      promo.freeShippingCapZAR != null
        ? Math.min(promo.freeShippingCapZAR, ctx.deliveryFeeZAR)
        : ctx.deliveryFeeZAR;
    return { ok: true, valueZAR: Math.max(0, waived), freeShipping: true };
  }

  // Goods discounts never exceed what's left after the bring-back discount.
  const goodsAfterContainer = Math.max(
    0,
    ctx.subtotalZAR - ctx.containerDiscountZAR
  );
  const raw =
    promo.type === "percent"
      ? Math.round((goodsAfterContainer * promo.value) / 100)
      : promo.value;

  return {
    ok: true,
    valueZAR: Math.max(0, Math.min(raw, goodsAfterContainer)),
    freeShipping: false,
  };
}

/* ------------------------------------------------------------------ */
/*  Resolving the order's money                                        */
/* ------------------------------------------------------------------ */
export interface AppliedPromo {
  stackable: boolean;
  valueZAR: number;
  freeShipping: boolean;
}

export interface OrderTotals {
  subtotalZAR: number;
  /** Bring-back discount actually applied (0 if a better coupon displaced it). */
  containerDiscountZAR: number;
  /** Coupon money off the goods (0 for a free-shipping coupon). */
  promoDiscountZAR: number;
  /** What the customer pays for delivery (0 when fully waived). */
  chargedDeliveryZAR: number;
  /** What the courier costs us — unchanged by any promotion. */
  shippingCostZAR: number;
  freeShipping: boolean;
  totalZAR: number;
}

/**
 * Combine the bring-back discount, the promotion and delivery into final money.
 *
 * Stacking is the admin's per-coupon choice:
 *  - `stackable` → both the bring-back discount and the coupon apply.
 *  - otherwise   → **best one wins**: whichever saves the customer more, never
 *    both. Free shipping compares fairly because its value is the courier fee.
 */
export function resolveTotals(input: {
  subtotalZAR: number;
  containerDiscountZAR: number;
  /** The real courier cost (0 for collection). */
  deliveryFeeZAR: number;
  promo?: AppliedPromo | null;
}): OrderTotals {
  const shippingCostZAR = Math.max(0, input.deliveryFeeZAR);
  let containerDiscountZAR = Math.max(0, input.containerDiscountZAR);
  let promoDiscountZAR = 0;
  let chargedDeliveryZAR = shippingCostZAR;
  let freeShipping = false;

  const promo = input.promo;
  if (promo && promo.valueZAR > 0) {
    const promoWins = promo.valueZAR > containerDiscountZAR;
    const usePromo = promo.stackable || promoWins;
    const useContainer = promo.stackable || !promoWins;

    if (!useContainer) containerDiscountZAR = 0;
    if (usePromo) {
      if (promo.freeShipping) {
        chargedDeliveryZAR = Math.max(0, shippingCostZAR - promo.valueZAR);
        freeShipping = chargedDeliveryZAR === 0;
      } else {
        promoDiscountZAR = Math.min(
          promo.valueZAR,
          Math.max(0, input.subtotalZAR - containerDiscountZAR)
        );
      }
    }
  }

  const goods = Math.max(
    0,
    input.subtotalZAR - containerDiscountZAR - promoDiscountZAR
  );
  return {
    subtotalZAR: input.subtotalZAR,
    containerDiscountZAR,
    promoDiscountZAR,
    chargedDeliveryZAR,
    shippingCostZAR,
    freeShipping,
    totalZAR: goods + chargedDeliveryZAR,
  };
}

/* ------------------------------------------------------------------ */
/*  Copy helpers (admin-authored, never hardcoded)                     */
/* ------------------------------------------------------------------ */
/** Plain-English summary of a promotion, for the admin list + preview. */
export function describePromotion(p: Promotion): string {
  const what =
    p.type === "free_shipping"
      ? p.freeShippingCapZAR != null
        ? `Up to ${money(p.freeShippingCapZAR)} off delivery`
        : "Free delivery"
      : p.type === "percent"
        ? `${p.value}% off`
        : `${money(p.value)} off`;
  const min =
    p.minSubtotalZAR != null ? ` on orders over ${money(p.minSubtotalZAR)}` : "";
  const how = p.code ? ` with code ${p.code}` : " — no code needed";
  return `${what}${min}${how}.`;
}
