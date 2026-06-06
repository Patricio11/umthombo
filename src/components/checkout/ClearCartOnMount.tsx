"use client";

import { useEffect } from "react";
import { useCart } from "@/store/cart";

/** Clears the persisted selection once an order has been placed. */
export function ClearCartOnMount() {
  const clear = useCart((s) => s.clear);
  useEffect(() => {
    clear();
  }, [clear]);
  return null;
}
