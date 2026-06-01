"use client";

import Image from "next/image";
import { Minus, Plus, X } from "lucide-react";
import { useCart, type CartItem } from "@/store/cart";
import { formatZAR } from "@/lib/format";

export function CartLine({ item }: { item: CartItem }) {
  const setQty = useCart((s) => s.setQty);
  const removeItem = useCart((s) => s.removeItem);

  return (
    <div className="flex gap-4 py-5">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden blob-2 bg-cream-2">
        <Image
          src={item.image}
          alt={item.name}
          fill
          sizes="80px"
          className="object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className="truncate font-display text-lg leading-tight">
              {item.name}
            </h4>
            {item.variant && (
              <p className="mt-0.5 text-xs text-ink-soft">{item.variant}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => removeItem(item.slug, item.variant)}
            aria-label={`Remove ${item.name}`}
            className="-mr-1 shrink-0 rounded-full p-1 text-ink-soft transition-colors hover:text-clay"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-auto flex items-center justify-between pt-3">
          <div className="inline-flex items-center rounded-full border border-cream-3">
            <button
              type="button"
              onClick={() => setQty(item.slug, item.variant, item.qty - 1)}
              aria-label="Decrease quantity"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:text-clay"
            >
              <Minus size={14} />
            </button>
            <span className="w-7 text-center text-sm tabular-nums">
              {item.qty}
            </span>
            <button
              type="button"
              onClick={() => setQty(item.slug, item.variant, item.qty + 1)}
              aria-label="Increase quantity"
              className="flex h-8 w-8 items-center justify-center rounded-full text-ink-soft transition-colors hover:text-clay"
            >
              <Plus size={14} />
            </button>
          </div>
          <span className="font-display text-base">
            {formatZAR(item.unitPriceZAR * item.qty)}
          </span>
        </div>
      </div>
    </div>
  );
}
