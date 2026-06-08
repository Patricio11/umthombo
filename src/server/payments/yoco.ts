import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { YocoConfig } from "@/lib/integrations";

const API = "https://payments.yoco.com/api";

/* ------------------------------------------------------------------ */
/*  Create checkout                                                    */
/* ------------------------------------------------------------------ */
export interface CreateCheckoutInput {
  amountZAR: number; // whole rand, >= 1 (converted to cents here)
  reference: string; // our order number (used as idempotency key)
  successUrl?: string;
  cancelUrl?: string;
  failureUrl?: string;
  metadata?: Record<string, string>;
}

export interface CreateCheckoutResult {
  ok: boolean;
  error?: string;
  redirectUrl?: string;
  checkoutId?: string;
}

/**
 * Create a Yoco hosted checkout. Yoco amounts are in **cents**. Always called
 * server-side. The `Idempotency-Key` (our order number) stops a retried submit
 * from creating two checkouts.
 */
export async function createYocoCheckout(
  config: YocoConfig,
  input: CreateCheckoutInput
): Promise<CreateCheckoutResult> {
  const amount = Math.max(100, Math.round(input.amountZAR * 100)); // ≥ R1.00
  const body: Record<string, unknown> = { amount, currency: "ZAR" };
  if (input.successUrl) body.successUrl = input.successUrl;
  if (input.cancelUrl) body.cancelUrl = input.cancelUrl;
  if (input.failureUrl) body.failureUrl = input.failureUrl;
  if (input.metadata) body.metadata = input.metadata;

  let res: Response;
  try {
    res = await fetch(`${API}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.reference,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[yoco] createCheckout network error:", err);
    return { ok: false, error: "Couldn’t reach the payment provider." };
  }

  const json = (await res.json().catch(() => null)) as
    | { id?: string; redirectUrl?: string; message?: string; description?: string }
    | null;

  if (!res.ok || !json?.redirectUrl) {
    const msg =
      json?.message || json?.description || `Payment provider error (${res.status}).`;
    console.error("[yoco] createCheckout failed:", res.status, json);
    return { ok: false, error: msg };
  }

  return { ok: true, redirectUrl: json.redirectUrl, checkoutId: json.id };
}

/* ------------------------------------------------------------------ */
/*  Webhook registration                                               */
/* ------------------------------------------------------------------ */
export interface RegisterWebhookResult {
  ok: boolean;
  error?: string;
  secret?: string; // whsec_… — returned ONCE by Yoco
}

/**
 * Register (subscribe) our webhook URL with Yoco. The response contains the
 * signing secret, which Yoco returns only once — we store it immediately.
 */
export async function registerYocoWebhook(
  secretKey: string,
  url: string,
  name = "umthombo-payments"
): Promise<RegisterWebhookResult> {
  let res: Response;
  try {
    res = await fetch(`${API}/webhooks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, url }),
      cache: "no-store",
    });
  } catch (err) {
    console.error("[yoco] registerWebhook network error:", err);
    return { ok: false, error: "Couldn’t reach Yoco." };
  }

  const json = (await res.json().catch(() => null)) as
    | { secret?: string; message?: string; description?: string }
    | null;

  if (!res.ok || !json?.secret) {
    const msg =
      json?.message || json?.description || `Yoco error (${res.status}).`;
    return { ok: false, error: msg };
  }
  return { ok: true, secret: json.secret };
}

/* ------------------------------------------------------------------ */
/*  Webhook signature verification (Standard Webhooks)                 */
/* ------------------------------------------------------------------ */
export interface WebhookHeaders {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
}

/**
 * Verify a Yoco webhook per the Standard Webhooks spec:
 *   signedContent = `${id}.${timestamp}.${rawBody}`
 *   secret        = base64-decode(whsecValue without the "whsec_" prefix)
 *   expected      = base64( HMAC_SHA256(secret, signedContent) )
 * The `webhook-signature` header is a space-separated list of `v1,<sig>`.
 * Also rejects timestamps outside a 5-minute window (replay protection).
 */
export function verifyYocoWebhook(
  webhookSecret: string,
  rawBody: string,
  headers: WebhookHeaders
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature || !webhookSecret) return false;

  // Replay protection — timestamp within ±5 minutes.
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) return false;

  const secretB64 = webhookSecret.includes("_")
    ? webhookSecret.split("_")[1]
    : webhookSecret;
  let secretBytes: Buffer;
  try {
    secretBytes = Buffer.from(secretB64, "base64");
  } catch {
    return false;
  }
  if (secretBytes.length === 0) return false;

  const signedContent = `${id}.${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secretBytes)
    .update(signedContent)
    .digest("base64");
  const expectedBuf = Buffer.from(expected);

  // Header may carry multiple "v1,<sig>" entries — any match passes.
  return signature.split(" ").some((part) => {
    const sig = part.includes(",") ? part.split(",")[1] : part;
    if (!sig) return false;
    const provided = Buffer.from(sig);
    return (
      provided.length === expectedBuf.length &&
      timingSafeEqual(provided, expectedBuf)
    );
  });
}
