"use client";

import { Minus, Plus, Recycle } from "lucide-react";
import type { CartItem } from "@/store/cart";
import { useCart } from "@/store/cart";
import type { DiscountRule } from "@/lib/discount";
import { computeLineDiscount, isLineEligible } from "@/lib/discount";
import { formatZAR } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Per-line "bringing a container back?" control. Only rendered for products the
 * admin marked eligible, and capped at that line's quantity — so the discount
 * can only ever be worth what actually comes back through the door.
 */
export function ContainerStepper({
  item,
  rule,
}: {
  item: CartItem;
  rule: DiscountRule;
}) {
  const setContainers = useCart((s) => s.setContainers);

  if (!isLineEligible(rule, !!item.containerEligible)) return null;

  const jars = Math.min(item.containersReturned ?? 0, item.qty);
  const { discountZAR } = computeLineDiscount(
    {
      unitPriceZAR: item.unitPriceZAR,
      qty: item.qty,
      containerEligible: !!item.containerEligible,
      containersReturned: jars,
    },
    rule
  );

  const set = (n: number) => setContainers(item.slug, item.variant, n);
  const noun = item.qty > 1 ? "containers" : "container";

  return (
    <div
      className={cn(
        "mt-3 flex items-center justify-between gap-3 rounded-xl px-3 py-2 transition-colors",
        jars > 0 ? "bg-olive/10" : "bg-cream-2"
      )}
    >
      <span className="flex min-w-0 items-center gap-2 text-xs">
        <Recycle
          size={14}
          className={cn("shrink-0", jars > 0 ? "text-olive" : "text-taupe")}
        />
        <span className="min-w-0">
          {jars > 0 ? (
            <span className="text-olive">
              −{formatZAR(discountZAR)} · {jars} {noun} back
            </span>
          ) : (
            <span className="text-ink-soft">
              Bringing a {noun.replace(/s$/, "")} back?
            </span>
          )}
        </span>
      </span>

      <div className="inline-flex shrink-0 items-center rounded-full border border-cream-3 bg-cream">
        <button
          type="button"
          onClick={() => set(jars - 1)}
          disabled={jars <= 0}
          aria-label={`One fewer ${noun} for ${item.name}`}
          className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft transition-colors hover:text-olive disabled:opacity-35"
        >
          <Minus size={13} />
        </button>
        <span className="w-6 text-center text-xs tabular-nums">{jars}</span>
        <button
          type="button"
          onClick={() => set(jars + 1)}
          disabled={jars >= item.qty}
          aria-label={`One more ${noun} for ${item.name}`}
          className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft transition-colors hover:text-olive disabled:opacity-35"
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}
