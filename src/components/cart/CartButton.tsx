"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useCart, selectCount } from "@/store/cart";
import { cn } from "@/lib/utils";

export function CartButton({ className }: { className?: string }) {
  const count = useCart(selectCount);
  const lastAdded = useCart((s) => s.lastAdded);
  const openCart = useCart((s) => s.openCart);

  // Avoid hydration mismatch: render count only after mount (it's persisted).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label={`Open your selection${mounted && count ? `, ${count} item${count === 1 ? "" : "s"}` : ""}`}
      className={cn(
        "group relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-ink transition-colors hover:text-olive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive",
        className
      )}
    >
      <span className="hidden sm:inline">Selection</span>
      {/* small fountain-jar glyph */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M6 9h12l-1 10a2 2 0 0 1-2 1.8H9A2 2 0 0 1 7 19L6 9Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M9 9V7a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.5" />
      </svg>

      <AnimatePresence>
        {mounted && count > 0 && (
          <motion.span
            key={lastAdded}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-olive px-1 text-[11px] font-semibold text-cream"
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}
