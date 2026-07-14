/** The bring-back (reusable container) discount — one shared implementation.
 *  Client-safe (no server imports) so the cart, the checkout, the admin order
 *  form and the server all compute it identically. The server is still the only
 *  authority: it re-reads prices + eligibility from the DB before charging. */

export type DiscountScope = "selected" | "all";

/** The admin-configured rule. */
export interface DiscountRule {
  enabled: boolean;
  /** Percent off ONE unit's price, per container returned. */
  percent: number;
  /** "selected" = only products flagged `containerEligible`; "all" = every product. */
  scope: DiscountScope;
}

export const DEFAULT_DISCOUNT_RULE: DiscountRule = {
  enabled: true,
  percent: 10,
  scope: "selected",
};

export interface DiscountLine {
  unitPriceZAR: number;
  qty: number;
  /** The product's `containerEligible` flag. */
  containerEligible: boolean;
  /** How many containers the customer says they're bringing back. */
  containersReturned: number;
}

export interface DiscountLineResult {
  /** May this line earn the discount at all? */
  eligible: boolean;
  /** Containers actually counted (clamped to 0…qty, 0 when not eligible). */
  jars: number;
  discountZAR: number;
}

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.trunc(Number.isFinite(n) ? n : 0)));

/** Can a product earn the discount under this rule? */
export function isLineEligible(
  rule: DiscountRule,
  containerEligible: boolean
): boolean {
  if (!rule.enabled) return false;
  return rule.scope === "all" ? true : containerEligible;
}

/** What one returned container is worth on this unit price. */
export function unitDiscountZAR(unitPriceZAR: number, percent: number): number {
  return Math.round((unitPriceZAR * percent) / 100);
}

/**
 * One line's discount: `percent` off a single unit, once per container returned,
 * never more than the line's quantity.
 */
export function computeLineDiscount(
  line: DiscountLine,
  rule: DiscountRule
): DiscountLineResult {
  const eligible = isLineEligible(rule, line.containerEligible);
  const jars = eligible ? clamp(line.containersReturned, 0, line.qty) : 0;
  return {
    eligible,
    jars,
    discountZAR: unitDiscountZAR(line.unitPriceZAR, rule.percent) * jars,
  };
}

export interface DiscountTotals {
  lines: DiscountLineResult[];
  totalZAR: number;
}

/** Every line's discount + the order total. */
export function computeDiscount(
  lines: DiscountLine[],
  rule: DiscountRule
): DiscountTotals {
  const results = lines.map((l) => computeLineDiscount(l, rule));
  return {
    lines: results,
    totalZAR: results.reduce((n, r) => n + r.discountZAR, 0),
  };
}

/** Customer-facing label, e.g. "Own container · 10% off". */
export const discountLabel = (rule: DiscountRule) =>
  `Own container · ${rule.percent}% off`;
