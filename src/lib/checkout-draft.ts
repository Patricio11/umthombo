import type { DeliveryAddress } from "@/lib/shipping";

/**
 * The checkout form draft, kept in localStorage so a customer's details survive
 * the payment redirect round-trip (e.g. a failed payment → "Try again"). Cleared
 * once an order is successfully placed.
 */
export interface CheckoutDraft {
  name?: string;
  email?: string;
  phone?: string;
  method?: "delivery" | "collection";
  address?: DeliveryAddress;
  note?: string;
  addrMode?: "saved" | "new";
  selectedAddrId?: string | null;
  serviceCode?: string | null;
}

const KEY = "umthombo-checkout-draft";

export function loadCheckoutDraft(): CheckoutDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CheckoutDraft) : null;
  } catch {
    return null;
  }
}

export function saveCheckoutDraft(draft: CheckoutDraft): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* quota / privacy mode — non-fatal */
  }
}

export function clearCheckoutDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
