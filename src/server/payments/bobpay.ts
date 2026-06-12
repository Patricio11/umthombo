import "server-only";
import type { BobpayConfig } from "@/lib/integrations";

/** API host for the active environment. */
const apiBase = (sandbox: boolean) =>
  sandbox ? "https://api.sandbox.bobpay.co.za" : "https://api.bobpay.co.za";

const headers = (apiKey: string) => ({
  Authorization: `Bearer ${apiKey}`,
  "Content-Type": "application/json",
  Accept: "application/json",
});

/** Bob Pay amounts are rand with 2 decimals (e.g. "150.00"), NOT cents. */
const randAmount = (zar: number) => Math.max(1, zar).toFixed(2);

/* ------------------------------------------------------------------ */
/*  Create a payment intent (hosted redirect link)                     */
/* ------------------------------------------------------------------ */
export interface CreateIntentInput {
  amountZAR: number;
  /** Our reference — becomes `custom_payment_id`; the webhook resolves by it. */
  reference: string;
  itemName: string;
  description?: string;
  customerEmail?: string;
  customerPhone?: string;
  successUrl: string;
  cancelUrl: string;
  notifyUrl: string;
}

export interface CreateIntentResult {
  ok: boolean;
  error?: string;
  /** The hosted payment page to redirect the customer to. */
  redirectUrl?: string;
  paymentId?: string;
}

/**
 * Create a Bob Pay payment intent and get back the hosted-page URL. Off-site:
 * we redirect the customer to `short_url`; the webhook (`notify_url`) is
 * authoritative for "paid".
 */
export async function createBobpayIntent(
  config: BobpayConfig,
  input: CreateIntentInput
): Promise<CreateIntentResult> {
  const body: Record<string, unknown> = {
    custom_payment_id: input.reference,
    amount: randAmount(input.amountZAR),
    email: input.customerEmail ?? "",
    mobile_number: input.customerPhone ?? "",
    item_name: input.itemName,
    item_description: input.description ?? "",
    notify_url: input.notifyUrl,
    success_url: input.successUrl,
    pending_url: input.successUrl,
    cancel_url: input.cancelUrl,
    source: "umthombo-creations",
  };

  let res: Response;
  try {
    res = await fetch(`${apiBase(config.sandbox)}/payments/intents/link`, {
      method: "POST",
      headers: headers(config.apiKey),
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[bobpay] createIntent network error:", err);
    return { ok: false, error: "Couldn’t reach the payment provider." };
  }

  const json = (await res.json().catch(() => null)) as
    | {
        short_url?: string;
        url?: string;
        id?: string;
        intent_id?: string;
        message?: string;
        error?: string;
      }
    | null;

  const redirectUrl = json?.short_url || json?.url;
  if (!res.ok || !redirectUrl) {
    const msg =
      json?.message || json?.error || `Payment provider error (${res.status}).`;
    console.error("[bobpay] createIntent failed:", res.status, json);
    return { ok: false, error: msg };
  }

  return { ok: true, redirectUrl, paymentId: json?.id ?? json?.intent_id };
}

/* ------------------------------------------------------------------ */
/*  Webhook verification (echo-back)                                   */
/* ------------------------------------------------------------------ */
/** IPs Bob Pay sends webhooks from (per their WooCommerce plugin). */
export const BOBPAY_WEBHOOK_IPS = ["13.245.84.126", "13.246.100.25"];

/**
 * Verify a Bob Pay webhook the way their own plugins do: POST the raw payload
 * back to `/payments/intents/validate`; a 200 means Bob Pay recognises it as a
 * genuine, current intent. (There's no HMAC signature to check.)
 */
export async function verifyBobpayWebhook(
  config: BobpayConfig,
  rawBody: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `${apiBase(config.sandbox)}/payments/intents/validate`,
      {
        method: "POST",
        headers: headers(config.apiKey),
        body: rawBody,
        cache: "no-store",
      }
    );
    return res.ok;
  } catch (err) {
    console.error("[bobpay] validate error:", err);
    return false;
  }
}

/** Shape of the webhook payload Bob Pay POSTs to `notify_url`. */
export interface BobpayWebhookPayload {
  custom_payment_id?: string;
  status?: string; // "paid" | "unpaid"
  amount?: string | number;
  payment?: { id?: string; payment_method?: string };
  payment_method?: string;
}
