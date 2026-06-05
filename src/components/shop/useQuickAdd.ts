"use client";

import { useState } from "react";
import { useCart } from "@/store/cart";

/** The minimal product shape quick-add needs (satisfied by ProductView). */
type QuickAddProduct = {
  slug: string;
  name: string;
  variants?: string[] | null;
  priceZAR: number;
  image: string;
  deliveryFeeZAR?: number | null;
};

/**
 * Shared quick-add behaviour for product cards / featured blocks.
 * Adds qty 1 (with the first variant as a sensible default) without yanking
 * the drawer open, and exposes an `added` flag for the check confirmation.
 */
export function useQuickAdd(product: QuickAddProduct) {
  const addItem = useCart((s) => s.addItem);
  const [added, setAdded] = useState(false);

  const quickAdd = () => {
    addItem(
      {
        slug: product.slug,
        name: product.name,
        variant: product.variants?.[0],
        unitPriceZAR: product.priceZAR,
        image: product.image,
        deliveryFeeZAR: product.deliveryFeeZAR ?? null,
      },
      1,
      { open: false }
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return { added, quickAdd };
}
