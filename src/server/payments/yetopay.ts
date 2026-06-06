import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { YetopayConfig } from "@/lib/integrations";

/* ------------------------------------------------------------------ */
/*  Signing helpers                                                    */
/* ------------------------------------------------------------------ */
const sha256Hex = (s: string) => createHash("sha256").update(s).digest("hex");

const hmacHex = (key: string, msg: string) =>
  createHmac("sha256", key).update(msg).digest("hex");

/**
 * Request signature per the YetoPay spec:
 *   X-Signature: sha256=HMAC_SHA256( key = SHA256_hex(apiSecret),
 *                                    msg = merchantId + timestamp + rawBody )
 */
function signRequest(
  config: YetopayConfig,
  timestamp: string,
  rawBody: string
): string {
  const key = sha256Hex(config.apiSecret);
  return hmacHex(key, config.merchantId + timestamp + rawBody);
}

/* ------------------------------------------------------------------ */
/*  Create payment link                                                */
/* ------------------------------------------------------------------ */
export interface CreatePaymentLinkInput {
  amountZAR: number; // whole rand, >= 1
  reference: string; // unique (our order number)
  description?: string;
  customerName?: string;
  customerEmail?: string;
  successUrl?: string;
  failureUrl?: string;
  cancelledUrl?: string;
  notifyUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface CreatePaymentLinkResult {
  ok: boolean;
  error?: string;
  paymentUrl?: string;
  transactionId?: string;
  token?: string;
}

export async function createPaymentLink(
  config: YetopayConfig,
  input: CreatePaymentLinkInput
): Promise<CreatePaymentLinkResult> {
  const body: Record<string, unknown> = {
    amount: Math.max(1, Math.round(input.amountZAR)),
    reference: input.reference,
    paymentMethod: config.paymentMethod,
  };
  if (input.description) body.description = input.description;
  if (input.customerName) body.customerName = input.customerName;
  if (input.customerEmail) body.customerEmail = input.customerEmail;
  if (input.successUrl) body.successUrl = input.successUrl;
  if (input.failureUrl) body.failureUrl = input.failureUrl;
  if (input.cancelledUrl) body.cancelledUrl = input.cancelledUrl;
  if (input.notifyUrl) body.notifyUrl = input.notifyUrl;
  if (input.metadata) body.metadata = input.metadata;

  // Sign the exact string we send.
  const rawBody = JSON.stringify(body);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = signRequest(config, timestamp, rawBody);

  let res: Response;
  try {
    res = await fetch(`${config.baseUrl}/api/payment-links`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "X-Merchant-ID": config.merchantId,
        "X-Timestamp": timestamp,
        "X-Signature": `sha256=${signature}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: rawBody,
      cache: "no-store",
    });
  } catch (err) {
    console.error("[yetopay] createPaymentLink network error:", err);
    return { ok: false, error: "Couldn’t reach the payment provider." };
  }

  const json = (await res.json().catch(() => null)) as
    | { success?: boolean; data?: Record<string, unknown>; message?: string }
    | null;

  if (!res.ok || !json?.data) {
    const msg = json?.message || `Payment provider error (${res.status}).`;
    console.error("[yetopay] createPaymentLink failed:", res.status, json);
    return { ok: false, error: msg };
  }

  const data = json.data;
  const paymentUrl = typeof data.paymentUrl === "string" ? data.paymentUrl : "";
  if (!paymentUrl) {
    return { ok: false, error: "Payment link was not returned." };
  }
  return {
    ok: true,
    paymentUrl,
    transactionId:
      typeof data.transactionId === "string" ? data.transactionId : undefined,
    token: typeof data.token === "string" ? data.token : undefined,
  };
}

/* ------------------------------------------------------------------ */
/*  Webhook signature verification                                     */
/* ------------------------------------------------------------------ */
/**
 * The webhook is signed with a BARE hex HMAC-SHA256 of the raw body using
 * the webhook secret (header `X-Webhook-Signature`). Constant-time compare.
 */
export function verifyWebhookSignature(
  webhookSecret: string,
  rawBody: string,
  signatureHeader: string | null
): boolean {
  if (!signatureHeader) return false;
  const provided = signatureHeader.replace(/^sha256=/i, "").trim();
  const expected = hmacHex(webhookSecret, rawBody);
  const a = Buffer.from(provided, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
