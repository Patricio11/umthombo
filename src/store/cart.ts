"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  slug: string;
  name: string;
  variant?: string;
  qty: number;
  unitPriceZAR: number;
  image: string;
  /** Does this product come in a returnable container? (from the product) */
  containerEligible?: boolean;
  /** How many containers the customer is bringing back for this line (≤ qty). */
  containersReturned?: number;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  lastAdded: number; // timestamp-ish counter to trigger the badge pop
  addItem: (
    item: Omit<CartItem, "qty">,
    qty?: number,
    opts?: { open?: boolean }
  ) => void;
  removeItem: (slug: string, variant?: string) => void;
  setQty: (slug: string, variant: string | undefined, qty: number) => void;
  /** Set how many containers are coming back for a line (clamped to its qty). */
  setContainers: (
    slug: string,
    variant: string | undefined,
    n: number
  ) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
}

const sameLine = (a: CartItem, slug: string, variant?: string) =>
  a.slug === slug && (a.variant ?? "") === (variant ?? "");

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      lastAdded: 0,

      addItem: (item, qty = 1, opts) =>
        set((state) => {
          const existing = state.items.find((i) =>
            sameLine(i, item.slug, item.variant)
          );
          const items = existing
            ? state.items.map((i) =>
                sameLine(i, item.slug, item.variant)
                  ? { ...i, qty: i.qty + qty }
                  : i
              )
            : [...state.items, { ...item, qty }];
          return {
            items,
            isOpen: opts?.open ?? true, // quick-add from the grid can skip opening
            lastAdded: state.lastAdded + 1,
          };
        }),

      removeItem: (slug, variant) =>
        set((state) => ({
          items: state.items.filter((i) => !sameLine(i, slug, variant)),
        })),

      setQty: (slug, variant, qty) =>
        set((state) => ({
          items: state.items
            .map((i) =>
              sameLine(i, slug, variant)
                ? {
                    ...i,
                    qty: Math.max(0, qty),
                    // Never let jars outlive the quantity they belong to.
                    containersReturned: Math.min(
                      i.containersReturned ?? 0,
                      Math.max(0, qty)
                    ),
                  }
                : i
            )
            .filter((i) => i.qty > 0),
        })),

      setContainers: (slug, variant, n) =>
        set((state) => ({
          items: state.items.map((i) =>
            sameLine(i, slug, variant)
              ? {
                  ...i,
                  containersReturned: Math.min(Math.max(0, Math.trunc(n)), i.qty),
                }
              : i
          ),
        })),

      clear: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
    }),
    {
      name: "umthombo-selection",
      partialize: (s) => ({ items: s.items }),
    }
  )
);

// Derived selectors (call with the store's state)
export const selectCount = (s: CartState) =>
  s.items.reduce((n, i) => n + i.qty, 0);

export const selectSubtotal = (s: CartState) =>
  s.items.reduce((n, i) => n + i.qty * i.unitPriceZAR, 0);

/** Cart lines in the shape `lib/discount` expects. The discount itself is NOT
 *  computed here — it depends on the admin's rule, which comes from the server;
 *  callers pass both to `computeDiscount`. The server re-computes before charging. */
export const selectDiscountLines = (s: CartState) =>
  s.items.map((i) => ({
    unitPriceZAR: i.unitPriceZAR,
    qty: i.qty,
    containerEligible: !!i.containerEligible,
    containersReturned: i.containersReturned ?? 0,
  }));
