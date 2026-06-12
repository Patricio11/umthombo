import "server-only";
import {
  getYetopayConfig,
  getYocoConfig,
  getBobpayConfig,
} from "@/server/db/integrations";
import { getSiteSettings } from "@/server/db/settings";
import { createPaymentLink } from "@/server/payments/yetopay";
import { createYocoCheckout } from "@/server/payments/yoco";
import { createBobpayIntent } from "@/server/payments/bobpay";
import type { PaymentProvider } from "@/lib/integrations";
import { site } from "@/data/site";

const appUrl = () =>
  (process.env.NEXT_PUBLIC_APP_URL || site.url).replace(/\/+$/, "");

export interface StartPaymentInput {
  amountZAR: number;
  reference: string; // unique per payment
  description?: string;
  customerName?: string;
  customerEmail?: string;
  successUrl: string;
  failureUrl: string;
  metadata: Record<string, string>;
}

export interface StartPaymentResult {
  ok: boolean;
  error?: string;
  redirectUrl?: string;
  provider?: PaymentProvider;
  reference?: string; // gateway transaction / checkout id
}

/**
 * Start a payment on the active gateway (admin's pick, else first ready one).
 * A generic primitive - used for custom-request deposits and balances. The
 * gateway webhook (matched by `metadata`) is authoritative for "paid".
 */
export async function startGatewayPayment(
  input: StartPaymentInput
): Promise<StartPaymentResult> {
  const [yeto, yoco, bobpay, settings] = await Promise.all([
    getYetopayConfig(),
    getYocoConfig(),
    getBobpayConfig(),
    getSiteSettings(),
  ]);
  const available: Record<PaymentProvider, unknown> = {
    yetopay: yeto,
    yoco,
    bobpay,
  };
  const preferred = settings.paymentProvider;
  const active: PaymentProvider | null =
    preferred && available[preferred]
      ? preferred
      : yeto
        ? "yetopay"
        : yoco
          ? "yoco"
          : bobpay
            ? "bobpay"
            : null;

  if (active === "bobpay" && bobpay) {
    const c = await createBobpayIntent(bobpay, {
      amountZAR: input.amountZAR,
      reference: input.reference,
      itemName: input.description ?? input.reference,
      description: input.description,
      customerEmail: input.customerEmail,
      successUrl: input.successUrl,
      cancelUrl: input.failureUrl,
      notifyUrl: `${appUrl()}/api/webhooks/bobpay`,
    });
    if (!c.ok || !c.redirectUrl) return { ok: false, error: c.error };
    return {
      ok: true,
      redirectUrl: c.redirectUrl,
      provider: "bobpay",
      reference: c.paymentId,
    };
  }

  if (active === "yoco" && yoco) {
    const c = await createYocoCheckout(yoco, {
      amountZAR: input.amountZAR,
      reference: input.reference,
      successUrl: input.successUrl,
      cancelUrl: input.failureUrl,
      failureUrl: input.failureUrl,
      metadata: input.metadata,
    });
    if (!c.ok || !c.redirectUrl) return { ok: false, error: c.error };
    return { ok: true, redirectUrl: c.redirectUrl, provider: "yoco", reference: c.checkoutId };
  }

  if (active === "yetopay" && yeto) {
    const link = await createPaymentLink(yeto, {
      amountZAR: input.amountZAR,
      reference: input.reference,
      description: input.description,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      successUrl: input.successUrl,
      failureUrl: input.failureUrl,
      cancelledUrl: input.failureUrl,
      notifyUrl: `${appUrl()}/api/webhooks/yetopay`,
      metadata: input.metadata,
    });
    if (!link.ok || !link.paymentUrl) return { ok: false, error: link.error };
    return {
      ok: true,
      redirectUrl: link.paymentUrl,
      provider: "yetopay",
      reference: link.transactionId,
    };
  }

  return { ok: false, error: "No payment gateway is configured." };
}
