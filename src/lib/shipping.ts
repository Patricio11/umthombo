/** Client-safe shipping types + parcel defaults  shared by the checkout UI
 *  and the server BobGo service. No server imports. */

/** A delivery address as captured at checkout (BobGo "delivery_address" shape). */
export interface DeliveryAddress {
  company?: string;
  streetAddress: string;
  localArea: string; // suburb / area
  city: string;
  zone: string; // ZA province code (WC, GP, KZN, …)
  code: string; // postal code
  country?: string; // ZA
}

/** A courier option returned by BobGo's rates-at-checkout, normalised. */
export interface RateOption {
  serviceCode: string;
  serviceName: string;
  priceZAR: number; // rounded to whole rand (the app stores integer ZAR)
  currency: string;
  minDeliveryDate?: string;
  maxDeliveryDate?: string;
}

/** Fallback parcel dimensions when a product hasn't been measured yet. */
export const PARCEL_DEFAULTS = {
  weightKg: 0.5,
  lengthCm: 15,
  widthCm: 15,
  heightCm: 15,
} as const;

/** A short, human ETA from a rate's delivery window. */
export function rateEta(rate: RateOption): string | null {
  const fmt = (d?: string) => {
    if (!d) return null;
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString("en-ZA", { day: "numeric", month: "short" });
  };
  const min = fmt(rate.minDeliveryDate);
  const max = fmt(rate.maxDeliveryDate);
  if (min && max && min !== max) return `${min} – ${max}`;
  return max ?? min;
}
