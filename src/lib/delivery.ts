export interface DeliveryConfig {
  enabled: boolean; // delivery offered at all (off = collection only)
  charge: boolean; // charge a fee (off = free delivery)
  type: "flat" | "percent";
  flatZAR: number;
  percent: number;
}

/**
 * Order delivery fee — "highest item wins":
 * each item's fee = its product override (if set) else the global fee
 * (flat, or a percentage of the goods subtotal); the order pays the largest.
 */
export function computeDeliveryFee(
  items: { deliveryFeeZAR?: number | null }[],
  goodsSubtotal: number,
  cfg: DeliveryConfig
): number {
  if (!cfg.enabled || !cfg.charge || items.length === 0) return 0;
  const globalFee =
    cfg.type === "percent"
      ? Math.round((cfg.percent / 100) * goodsSubtotal)
      : cfg.flatZAR;

  let fee = 0;
  let anyUsesGlobal = false;
  for (const it of items) {
    if (it.deliveryFeeZAR != null) fee = Math.max(fee, it.deliveryFeeZAR);
    else anyUsesGlobal = true;
  }
  if (anyUsesGlobal) fee = Math.max(fee, globalFee);
  return fee;
}
