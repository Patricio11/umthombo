/** Client-safe integration metadata, config shapes, and secret-field map.
 *  No server imports  shared by the admin forms and the server layer. */

export type IntegrationKey = "bobgo" | "yetopay" | "yoco" | "resend" | "whatsapp";
export type IntegrationCategory = "shipping" | "payment" | "email" | "channel";

/** The online payment gateways (the admin picks which one is live). */
export type PaymentProvider = "yetopay" | "yoco";

/** Customer-facing presentation for each gateway at checkout. */
export const PAYMENT_PRESENTATION: Record<
  PaymentProvider,
  { label: string; sublabel: string }
> = {
  yetopay: { label: "Pay by bank", sublabel: "Instant EFT · powered by YetoPay" },
  yoco: { label: "Card", sublabel: "Credit & debit card · powered by Yoco" },
};

export interface CheckoutPaymentOption {
  provider: PaymentProvider;
  label: string;
  sublabel: string;
}

/** What the checkout needs to render the (optional) gateway picker. */
export interface CheckoutPaymentInfo {
  /** Show the customer a choice (both gateways ready + admin opted in). */
  choose: boolean;
  /** Pre-selected / fallback gateway (the admin's active pick). */
  defaultProvider: PaymentProvider | null;
  options: CheckoutPaymentOption[];
}

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
  /** How the hosted payment page is presented at checkout. */
  displayMode: "redirect" | "iframe";
}

/** Yoco Checkout API - far simpler than YetoPay (no merchant id / request HMAC).
 *  `secretKey` (sk_test_… / sk_live_…) authenticates API calls; `webhookSecret`
 *  (whsec_…) verifies incoming webhooks. */
export interface YocoConfig {
  secretKey: string;
  webhookSecret: string;
}

export interface ResendConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

/** Config keys that are secrets  never sent to the client; blank-on-save keeps the existing value. */
export const SECRET_FIELDS: Record<IntegrationKey, string[]> = {
  bobgo: ["apiKey"],
  yetopay: ["apiKey", "apiSecret", "webhookSecret"],
  yoco: ["secretKey", "webhookSecret"],
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
    blurb: "Take payment online  instant EFT and card via YetoPay.",
  },
  yoco: {
    name: "Yoco",
    category: "payment",
    blurb: "Take card payments online via Yoco's hosted checkout.",
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
