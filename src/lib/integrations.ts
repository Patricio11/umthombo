/** Client-safe integration metadata, config shapes, and secret-field map.
 *  No server imports — shared by the admin forms and the server layer. */

export type IntegrationKey = "bobgo" | "yetopay" | "resend" | "whatsapp";
export type IntegrationCategory = "shipping" | "payment" | "email" | "channel";

export interface BobgoCollection {
  company: string;
  streetAddress: string;
  localArea: string;
  city: string;
  zone: string; // ZA province code (WC, GP, KZN, …)
  country: string; // ZA
  code: string; // postal code
}

export interface BobgoConfig {
  apiKey: string;
  sandbox: boolean;
  collection: BobgoCollection;
}

export interface YetopayConfig {
  baseUrl: string;
  apiKey: string;
  apiSecret: string;
  merchantId: string;
  webhookSecret: string;
  paymentMethod: "eft_direct" | "card";
}

export interface ResendConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

/** Config keys that are secrets — never sent to the client; blank-on-save keeps the existing value. */
export const SECRET_FIELDS: Record<IntegrationKey, string[]> = {
  bobgo: ["apiKey"],
  yetopay: ["apiKey", "apiSecret", "webhookSecret"],
  resend: ["apiKey"],
  whatsapp: [],
};

export const INTEGRATION_META: Record<
  IntegrationKey,
  { name: string; category: IntegrationCategory; blurb: string }
> = {
  bobgo: {
    name: "BobGo",
    category: "shipping",
    blurb: "Live courier rates at checkout, shipment creation and tracking.",
  },
  yetopay: {
    name: "YetoEFT",
    category: "payment",
    blurb: "Take payment online — instant EFT and card via YetoPay.",
  },
  resend: {
    name: "Resend",
    category: "email",
    blurb: "Send order confirmations, tracking and admin notifications by email.",
  },
  whatsapp: {
    name: "WhatsApp ordering",
    category: "channel",
    blurb: "Offer a secondary “order over WhatsApp” option at checkout.",
  },
};

export const CATEGORY_LABEL: Record<IntegrationCategory, string> = {
  shipping: "Shipping",
  payment: "Payment",
  email: "Email",
  channel: "Channel",
};

/** Default empty config used to scaffold a new/blank integration in the form. */
export const ZA_PROVINCES = [
  { code: "EC", name: "Eastern Cape" },
  { code: "FS", name: "Free State" },
  { code: "GP", name: "Gauteng" },
  { code: "KZN", name: "KwaZulu-Natal" },
  { code: "LP", name: "Limpopo" },
  { code: "MP", name: "Mpumalanga" },
  { code: "NC", name: "Northern Cape" },
  { code: "NW", name: "North West" },
  { code: "WC", name: "Western Cape" },
] as const;
