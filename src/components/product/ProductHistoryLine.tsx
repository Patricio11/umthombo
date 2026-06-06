"use client";

import { useEffect, useState } from "react";
import { RotateCcw, Check } from "lucide-react";
import { useCart } from "@/store/cart";
import { getMyProductHistory } from "@/server/actions/reorder";

/** Shows "You ordered this on …" + a quick re-add for past buyers (logged in). */
export function ProductHistoryLine({
  productId,
  cartItem,
}: {
  productId: string;
  cartItem: { slug: string; name: string; unitPriceZAR: number; image: string };
}) {
  const [lastOrderedAt, setLastOrderedAt] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const addItem = useCart((s) => s.addItem);

  useEffect(() => {
    let active = true;
    getMyProductHistory(productId)
      .then((r) => active && setLastOrderedAt(r.lastOrderedAt))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [productId]);

  if (!lastOrderedAt) return null;

  const date = new Date(lastOrderedAt).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-olive/20 bg-olive/5 px-4 py-3">
      <p className="text-sm text-ink-soft">
        You ordered this on <span className="text-ink">{date}</span>.
      </p>
      <button
        type="button"
        onClick={() => {
          addItem(cartItem, 1, { open: true });
          setAdded(true);
          setTimeout(() => setAdded(false), 1800);
        }}
        className="inline-flex items-center gap-1.5 rounded-full bg-olive px-4 py-2 text-xs font-medium text-cream transition-colors hover:bg-olive-soft"
      >
        {added ? <Check size={13} /> : <RotateCcw size={13} />}
        {added ? "Added" : "Order again"}
      </button>
    </div>
  );
}
