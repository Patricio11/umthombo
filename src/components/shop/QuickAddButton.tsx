"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Plus, Check } from "lucide-react";
import type { ProductView } from "@/lib/view-types";
import { useQuickAdd } from "@/components/shop/useQuickAdd";
import { cn } from "@/lib/utils";

/** Inline "Add to order" pill (on-page use, e.g. the home Featured blocks). */
export function QuickAddButton({
  product,
  className,
}: {
  product: ProductView;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const { added, quickAdd } = useQuickAdd(product);

  return (
    <button
      type="button"
      onClick={quickAdd}
      aria-label={
        added
          ? `${product.name} added to your selection`
          : `Add ${product.name} to your selection`
      }
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-olive px-5 py-2.5 text-sm font-medium text-cream transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-olive-soft active:scale-[0.98]",
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {added ? (
          <motion.span
            key="added"
            initial={reduce ? false : { opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.25 }}
            className="inline-flex items-center gap-2"
          >
            <Check size={16} /> Added
          </motion.span>
        ) : (
          <motion.span
            key="add"
            initial={reduce ? false : { opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.25 }}
            className="inline-flex items-center gap-2"
          >
            <Plus size={16} /> Add to order
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
