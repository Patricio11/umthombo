import "server-only";
import type { BobgoConfig, BobgoCollection } from "@/lib/integrations";
import { ZA_PROVINCES } from "@/lib/integrations";
import {
  PARCEL_DEFAULTS,
  type DeliveryAddress,
  type RateOption,
} from "@/lib/shipping";

/* ------------------------------------------------------------------ */
/*  Low-level BobGo client                                             */
/* ------------------------------------------------------------------ */

const apiBase = (sandbox: boolean) =>
  sandbox
    ? "https://api.sandbox.bobgo.co.za/v2"
    : "https://api.bobgo.co.za/v2";

/** BobGo address payload. */
interface BobgoAddress {
  company: string;
  street_address: string;
  local_area: string;
  city: string;
  zone: string;
  country: string;
  code: string;
}

/** One line item in a rate request. */
export interface ShipItem {
  description: string;
  priceZAR: number; // unit price (whole rand)
  quantity: number;
  weightKg: number | null;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  sku?: string;
}

const PROVINCE_CODES = new Set<string>(ZA_PROVINCES.map((p) => p.code));
const PROVINCE_BY_NAME = new Map<string, string>(
  ZA_PROVINCES.map((p) => [p.name.toLowerCase(), p.code])
);

/** Accept a province code or full name and return a BobGo zone code. */
export function normalizeZone(input: string): string {
  const v = (input ?? "").trim();
  if (PROVINCE_CODES.has(v.toUpperCase())) return v.toUpperCase();
  const byName = PROVINCE_BY_NAME.get(v.toLowerCase());
  return byName ?? v;
}

function collectionToBobgo(c: BobgoCollection): BobgoAddress {
  return {
    company: c.company || "",
    street_address: c.streetAddress,
    local_area: c.localArea || "",
    city: c.city,
    zone: normalizeZone(c.zone),
    country: c.country || "ZA",
    code: c.code,
  };
}

function deliveryToBobgo(a: DeliveryAddress): BobgoAddress {
  return {
    company: a.company || "",
    street_address: a.streetAddress,
    local_area: a.localArea || "",
    city: a.city,
    zone: normalizeZone(a.zone),
    country: a.country || "ZA",
    code: a.code,
  };
}

function itemsToBobgo(items: ShipItem[]) {
  return items.map((it) => ({
    description: it.description,
    price: it.priceZAR,
    quantity: it.quantity,
    weight_kg: it.weightKg ?? PARCEL_DEFAULTS.weightKg,
    length_cm: it.lengthCm ?? PARCEL_DEFAULTS.lengthCm,
    width_cm: it.widthCm ?? PARCEL_DEFAULTS.widthCm,
    height_cm: it.heightCm ?? PARCEL_DEFAULTS.heightCm,
  }));
}

/** Raw rate as returned by BobGo. */
interface BobgoRate {
  service_code?: string;
  service_name?: string;
  total_price?: number | string;
  currency?: string;
  min_delivery_date?: string;
  max_delivery_date?: string;
}

async function bobgoFetch(
  config: BobgoConfig,
  path: string,
  body: unknown
): Promise<unknown> {
  const res = await fetch(`${apiBase(config.sandbox)}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `BobGo ${path} failed (${res.status})${text ? `: ${text.slice(0, 300)}` : ""}`
    );
  }
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Rates at checkout                                                  */
/* ------------------------------------------------------------------ */
export async function getRatesAtCheckout(
  config: BobgoConfig,
  input: {
    deliveryAddress: DeliveryAddress;
    items: ShipItem[];
    declaredValueZAR: number;
  }
): Promise<RateOption[]> {
  const payload = {
    collection_address: collectionToBobgo(config.collection),
    delivery_address: deliveryToBobgo(input.deliveryAddress),
    items: itemsToBobgo(input.items),
    declared_value: input.declaredValueZAR,
  };

  const json = (await bobgoFetch(config, "/rates-at-checkout", payload)) as {
    rates?: BobgoRate[];
  };

  const rates = Array.isArray(json.rates) ? json.rates : [];
  return rates
    .map((r): RateOption | null => {
      const price = Number(r.total_price);
      if (!r.service_code || !Number.isFinite(price)) return null;
      return {
        serviceCode: String(r.service_code),
        serviceName: r.service_name || "Courier",
        priceZAR: Math.round(price),
        currency: r.currency || "ZAR",
        minDeliveryDate: r.min_delivery_date,
        maxDeliveryDate: r.max_delivery_date,
      };
    })
    .filter((r): r is RateOption => r !== null)
    .sort((a, b) => a.priceZAR - b.priceZAR);
}

/* ------------------------------------------------------------------ */
/*  Create order (post-payment, used in Phase 6)                       */
/* ------------------------------------------------------------------ */
export interface CreateBobgoOrderInput {
  channelOrderNumber: string;
  customerName: string; // full name (e.g. "Entle Mahlukani")
  customerSurname?: string; // explicit surname (BobGo requires it)
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: DeliveryAddress;
  shippingCostZAR: number;
  shippingMethod: string; // service_code chosen at checkout
  items: (ShipItem & { sku?: string })[];
}

export async function createBobgoOrder(
  config: BobgoConfig,
  input: CreateBobgoOrderInput
): Promise<{ id: string | null; raw: unknown }> {
  // BobGo requires first name + surname split (mirrors the official Wix plugin).
  // Prefer the explicit surname; otherwise derive it by splitting the full name.
  const fullName = input.customerName.trim();
  const parts = fullName.split(/\s+/);
  const explicitSurname = (input.customerSurname ?? "").trim();
  const customerSurname = explicitSurname || parts.slice(1).join(" ");
  const customerName =
    explicitSurname && fullName.toLowerCase().endsWith(explicitSurname.toLowerCase())
      ? fullName.slice(0, fullName.length - explicitSurname.length).trim() || fullName
      : parts[0] || fullName;

  const payload = {
    channel_order_number: input.channelOrderNumber,
    customer_name: customerName,
    customer_surname: customerSurname,
    customer_email: input.customerEmail,
    customer_phone: input.customerPhone,
    currency: "ZAR",
    payment_status: "paid",
    buyer_selected_shipping_cost: input.shippingCostZAR,
    buyer_selected_shipping_method: input.shippingMethod,
    delivery_address: deliveryToBobgo(input.deliveryAddress),
    order_items: input.items.map((it) => ({
      description: it.description,
      vendor: "",
      sku: it.sku || "",
      unit_price: it.priceZAR,
      qty: it.quantity,
      unit_weight_kg: it.weightKg ?? PARCEL_DEFAULTS.weightKg,
    })),
  };

  const json = (await bobgoFetch(config, "/orders", payload)) as {
    id?: string | number;
  };
  return {
    id: json.id != null ? String(json.id) : null,
    raw: json,
  };
}
