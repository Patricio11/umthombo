"use client";

import { useState } from "react";
import { Minus, Plus, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { Product } from "@/data/products";
import { useCart } from "@/store/cart";
import { Button } from "@/components/ui/Button";
import { accentFor, accentClasses } from "@/lib/accents";

export function AddToOrder({ product }: { product: Product }) {
  const addItem = useCart((s) => s.addItem);
  const accent = accentClasses[accentFor[product.category]];

  const hasVariants = !!product.variants?.length;
  const [variant, setVariant] = useState<string | undefined>(
    hasVariants ? product.variants![0] : undefined
  );
  const [qty, setQty] = useState(1);
  const [pack, setPack] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const unitPrice = pack && product.packPriceZAR ? product.packPriceZAR : product.priceZAR;

  const handleAdd = () => {
    addItem(
      {
        slug: product.slug,
        name: pack ? `${product.name} (pack)` : product.name,
        variant,
        unitPriceZAR: unitPrice,
        image: product.image,
      },
      qty
    );
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1800);
  };

  return (
    <div className="space-y-6">
      {/* Variant picker */}
      {hasVariants && (
        <div>
          <p className="eyebrow mb-3 text-ink-soft">Choose a scent / colour</p>
          <div className="flex flex-wrap gap-2">
            {product.variants!.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setVariant(v)}
                className={`rounded-full border px-4 py-2 text-sm transition-all ${
                  variant === v
                    ? `${accent.border} ${accent.bgSoft} ${accent.text}`
                    : "border-cream-3 text-ink-soft hover:border-ink/30"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pack option */}
      {product.packPriceZAR && (
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-cream-2 px-4 py-3 text-sm">
          <input
            type="checkbox"
            checked={pack}
            onChange={(e) => setPack(e.target.checked)}
            className="h-4 w-4 accent-olive"
          />
          <span>
            Make it a <span className="font-medium">pack of two</span>  better
            value
          </span>
        </label>
      )}

      {/* Qty + add */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="inline-flex items-center justify-between rounded-full border border-cream-3 px-1.5">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Decrease quantity"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:text-olive"
          >
            <Minus size={16} />
          </button>
          <span className="w-8 text-center tabular-nums">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => q + 1)}
            aria-label="Increase quantity"
            className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft transition-colors hover:text-olive"
          >
            <Plus size={16} />
          </button>
        </div>

        <Button size="lg" onClick={handleAdd} className="flex-1">
          <AnimatePresence mode="wait" initial={false}>
            {justAdded ? (
              <motion.span
                key="added"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="inline-flex items-center gap-2"
              >
                <Check size={18} /> Added to your selection
              </motion.span>
            ) : (
              <motion.span
                key="add"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                Add to Order
              </motion.span>
            )}
          </AnimatePresence>
        </Button>
      </div>

      <p className="text-xs text-ink-soft">
        No payment now  add what you love, then send your order over WhatsApp.
      </p>
    </div>
  );
}
