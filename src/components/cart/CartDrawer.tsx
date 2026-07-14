"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import {
  useCart,
  selectSubtotal,
  selectDiscountLines,
  selectCount,
} from "@/store/cart";
import { formatZAR } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { CartLine } from "@/components/cart/CartLine";
import { lockScroll, unlockScroll } from "@/lib/lenis";
import {
  computeDiscount,
  discountLabel,
  DEFAULT_DISCOUNT_RULE,
  type DiscountRule,
} from "@/lib/discount";

const EASE = [0.22, 1, 0.36, 1] as const;

export function CartDrawer({
  rule = DEFAULT_DISCOUNT_RULE,
}: {
  rule?: DiscountRule;
}) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const isOpen = useCart((s) => s.isOpen);
  const closeCart = useCart((s) => s.closeCart);
  const items = useCart((s) => s.items);
  const count = useCart(selectCount);
  const subtotal = useCart(selectSubtotal);
  const discountLines = useCart(selectDiscountLines);
  const discount = computeDiscount(discountLines, rule).totalZAR;
  const total = subtotal - discount;

  const goToCheckout = () => {
    closeCart();
    router.push("/checkout");
  };

  // Don't render persisted contents until mounted (hydration safety).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Pause Lenis smooth scroll while the drawer is open (so the page behind
  // it doesn't scroll instead of the drawer contents).
  useEffect(() => {
    if (!isOpen) return;
    lockScroll();
    return () => unlockScroll();
  }, [isOpen]);

  return (
    <>
      <Dialog.Root
        open={isOpen}
        onOpenChange={(o) => !o && closeCart()}
      >
        <AnimatePresence>
          {isOpen && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild forceMount>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="fixed inset-0 z-[70] bg-ink/35 backdrop-blur-[2px]"
                />
              </Dialog.Overlay>

              <Dialog.Content asChild forceMount aria-describedby={undefined}>
                <motion.aside
                  initial={reduce ? { opacity: 0 } : { x: "100%" }}
                  animate={reduce ? { opacity: 1 } : { x: 0 }}
                  exit={reduce ? { opacity: 0 } : { x: "100%" }}
                  transition={{ duration: 0.55, ease: EASE }}
                  className="fixed inset-y-0 right-0 z-[71] flex w-full max-w-md flex-col bg-cream shadow-2xl"
                >
                  <Dialog.Title asChild>
                    <header className="flex items-center justify-between border-b border-cream-2 px-6 py-5">
                      <span className="font-display text-2xl">
                        Your Selection
                        {mounted && count > 0 && (
                          <span className="ml-2 align-middle text-sm font-normal text-ink-soft">
                            {count} item{count === 1 ? "" : "s"}
                          </span>
                        )}
                      </span>
                      <Dialog.Close
                        aria-label="Close selection"
                        className="rounded-full p-1.5 text-ink-soft transition-colors hover:bg-cream-2 hover:text-olive"
                      >
                        <X size={20} />
                      </Dialog.Close>
                    </header>
                  </Dialog.Title>

                  {/* Body */}
                  {!mounted || items.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <div
                      data-lenis-prevent
                      className="flex-1 divide-y divide-cream-2 overflow-y-auto px-6"
                    >
                      <AnimatePresence initial={false}>
                        {items.map((item) => (
                          <motion.div
                            key={`${item.slug}-${item.variant ?? ""}`}
                            layout={!reduce}
                            initial={reduce ? false : { opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                            transition={{ duration: 0.35, ease: EASE }}
                          >
                            <CartLine item={item} rule={rule} />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Footer */}
                  {mounted && items.length > 0 && (
                    <footer className="border-t border-cream-2 px-6 py-5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-ink-soft">Subtotal</span>
                        <span
                          className={
                            discount > 0
                              ? "text-sm text-ink-soft line-through"
                              : "font-display text-2xl"
                          }
                        >
                          {formatZAR(subtotal)}
                        </span>
                      </div>
                      {discount > 0 && (
                        <>
                          <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-sm text-olive">
                              {discountLabel(rule)}
                            </span>
                            <span className="text-sm text-olive">
                              −{formatZAR(discount)}
                            </span>
                          </div>
                          <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-sm text-ink-soft">Total</span>
                            <span className="font-display text-2xl">
                              {formatZAR(total)}
                            </span>
                          </div>
                        </>
                      )}

                      <Button
                        size="lg"
                        className="mt-4 w-full"
                        onClick={goToCheckout}
                      >
                        Checkout
                      </Button>
                      <p className="mt-3 text-center text-xs text-ink-soft">
                        Choose delivery or collection on the next step.
                      </p>
                    </footer>
                  )}
                </motion.aside>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
      {/* a small line-drawn fountain */}
      <svg
        width="72"
        height="72"
        viewBox="0 0 72 72"
        fill="none"
        className="text-mist"
        aria-hidden
      >
        <path
          d="M36 14c0 6-7 8-7 14a7 7 0 0 0 14 0c0-6-7-8-7-14Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M22 40h28l-3 16a4 4 0 0 1-4 3.4H29a4 4 0 0 1-4-3.4L22 40Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M30 40c0-3 2.7-5 6-5s6 2 6 5"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
      <p className="editorial-italic mt-6 text-xl text-ink">
        Your selection is still a quiet spring.
      </p>
      <p className="mt-2 max-w-xs text-sm text-ink-soft">
        Wander the shop and add a few things you love  they&rsquo;ll gather
        here.
      </p>
      <Dialog.Close asChild>
        <Link
          href="/shop"
          className="mt-7 inline-flex items-center justify-center rounded-full border border-ink/25 px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-olive hover:text-olive"
        >
          Explore the shop
        </Link>
      </Dialog.Close>
    </div>
  );
}
