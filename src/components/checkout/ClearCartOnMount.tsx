"use client";

import { useEffect } from "react";
import { useCart } from "@/store/cart";

/** Clears the persisted selection once an order has been placed. */
export function ClearCartOnMount() {
  useEffect(() => {
    useCart.getState().clear();

    // If this page is being shown *inside* the inline payment iframe, the
    // hosted page redirected here after a completed payment. Signal the parent
    // window so it empties its basket and leaves the overlay (the parent's
    // in-memory cart store won't have seen our localStorage clear).
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        { type: "payment_complete", status: "completed" },
        window.location.origin
      );
    }
  }, []);
  return null;
}
