"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { ProductView, CategoryView } from "@/lib/view-types";
import { ProductCard } from "@/components/shop/ProductCard";
import { CustomRequestModal } from "@/components/custom/CustomRequestModal";
import { cn } from "@/lib/utils";

type Filter = "all" | string;

const tabLabels: Record<string, string> = {
  candles: "Candles",
  skin: "Body & Skin",
  home: "Diffusers & Mists",
  hampers: "Hampers",
};

export function ShopExplorer({
  products,
  categories,
  initial = "all",
}: {
  products: ProductView[];
  categories: CategoryView[];
  initial?: Filter;
}) {
  const reduce = useReducedMotion();
  const [filter, setFilter] = useState<Filter>(initial);

  const tabs = useMemo(
    () => [
      { key: "all", label: "Everything" },
      ...categories.map((c) => ({
        key: c.slug,
        label: tabLabels[c.slug] ?? c.label,
      })),
    ],
    [categories]
  );

  const blurbBySlug = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.slug, c.blurb])),
    [categories]
  );

  const list = useMemo(
    () =>
      filter === "all"
        ? products
        : products.filter((p) => p.category === filter),
    [filter, products]
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
                  "relative cursor-pointer whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-medium transition-colors",
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
          {filter !== "all" && blurbBySlug[filter] && (
            <p className="editorial-italic hidden text-ink-soft sm:block">
              {blurbBySlug[filter]}
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

        {/* Didn't find it? - request a custom piece (pre-fills the category). */}
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10% 0px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="mt-20 overflow-hidden rounded-3xl border border-cream-3 bg-cream-2/40 px-6 py-10 text-center sm:px-10 sm:py-12"
        >
          <p className="eyebrow text-olive">Made for you</p>
          <h2 className="mt-2 font-display text-2xl font-light sm:text-3xl">
            Didn’t find quite what you’re after?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-ink-soft">
            We make bespoke pieces to order - your scent, colour and vessel. Tell
            us your idea and we’ll come back with a quote. No payment now.
          </p>
          <CustomRequestModal
            defaultType={filter !== "all" ? tabLabels[filter] : undefined}
            trigger={
              <button
                type="button"
                className="mt-7 inline-flex items-center justify-center rounded-full bg-olive px-8 py-4 text-base font-medium text-cream transition-all duration-300 hover:bg-olive-soft hover:shadow-[0_12px_34px_-12px_rgba(75,90,48,0.7)] active:scale-[0.98]"
              >
                Request a custom piece
              </button>
            }
          />
        </motion.div>
      </div>
    </div>
  );
}
