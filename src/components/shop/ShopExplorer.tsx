"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { products, categoryMeta, type Category } from "@/data/products";
import { ProductCard } from "@/components/shop/ProductCard";
import { cn } from "@/lib/utils";

type Filter = "all" | Category;

const tabs: { key: Filter; label: string }[] = [
  { key: "all", label: "Everything" },
  { key: "candles", label: "Candles" },
  { key: "skin", label: "Body & Skin" },
  { key: "home", label: "Diffusers & Mists" },
  { key: "hampers", label: "Hampers" },
];

export function ShopExplorer({ initial = "all" }: { initial?: Filter }) {
  const reduce = useReducedMotion();
  const [filter, setFilter] = useState<Filter>(initial);

  const list = useMemo(
    () =>
      filter === "all" ? products : products.filter((p) => p.category === filter),
    [filter]
  );

  return (
    <div className="px-5 pb-24 sm:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Filter tabs */}
        <div className="sticky top-[68px] z-30 -mx-5 mb-10 overflow-x-auto bg-cream/80 px-5 py-3 backdrop-blur-md sm:mx-0 sm:rounded-full sm:px-2">
          <div className="flex w-max gap-1.5">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setFilter(t.key)}
                className={cn(
                  "relative whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium transition-colors",
                  filter === t.key ? "text-cream" : "text-ink-soft hover:text-ink"
                )}
              >
                {filter === t.key && (
                  <motion.span
                    layoutId="shop-tab"
                    className="absolute inset-0 -z-10 rounded-full bg-olive"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* count + active category blurb */}
        <div className="mb-8 flex items-baseline justify-between">
          <p className="text-sm text-ink-soft">
            {list.length} {list.length === 1 ? "piece" : "pieces"}
          </p>
          {filter !== "all" && (
            <p className="editorial-italic hidden text-ink-soft sm:block">
              {categoryMeta[filter].blurb}
            </p>
          )}
        </div>

        {/* Grid */}
        <motion.div
          layout={!reduce}
          className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {list.map((p, i) => (
              <motion.div
                key={p.slug}
                layout={!reduce}
                initial={reduce ? false : { opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              >
                <ProductCard product={p} index={i} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
