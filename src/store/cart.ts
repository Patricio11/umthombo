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
  deliveryFeeZAR?: number | null;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
  ownContainer: boolean; // 10% reusable-container discount
  lastAdded: number; // timestamp-ish counter to trigger the badge pop
  addItem: (
    item: Omit<CartItem, "qty">,
    qty?: number,
    opts?: { open?: boolean }
  ) => void;
  removeItem: (slug: string, variant?: string) => void;
  setQty: (slug: string, variant: string | undefined, qty: number) => void;
  clear: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  setOwnContainer: (v: boolean) => void;
}

const sameLine = (a: CartItem, slug: string, variant?: string) =>
  a.slug === slug && (a.variant ?? "") === (variant ?? "");

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      ownContainer: false,
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
              sameLine(i, slug, variant) ? { ...i, qty: Math.max(0, qty) } : i
            )
            .filter((i) => i.qty > 0),
        })),

      clear: () => set({ items: [] }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
      setOwnContainer: (v) => set({ ownContainer: v }),
    }),
    {
      name: "umthombo-selection",
      partialize: (s) => ({ items: s.items, ownContainer: s.ownContainer }),
    }
  )
);

// Derived selectors (call with the store's state)
export const selectCount = (s: CartState) =>
  s.items.reduce((n, i) => n + i.qty, 0);

export const selectSubtotal = (s: CartState) =>
  s.items.reduce((n, i) => n + i.qty * i.unitPriceZAR, 0);

export const selectTotal = (s: CartState) => {
  const sub = selectSubtotal(s);
  return s.ownContainer ? Math.round(sub * 0.9) : sub;
};
