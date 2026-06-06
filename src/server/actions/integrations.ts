"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { integrations } from "@/server/db/schema";
import { requireAdmin } from "@/server/auth/guard";
import {
  SECRET_FIELDS,
  type IntegrationKey,
  type BobgoConfig,
  type YetopayConfig,
  type ResendConfig,
} from "@/lib/integrations";
import { getRatesAtCheckout } from "@/server/shipping/bobgo";
import { createPaymentLink } from "@/server/payments/yetopay";
import { sendEmailWith } from "@/server/email/resend";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface TestResult {
  ok: boolean;
  message: string;
}

type Cfg = Record<string, unknown>;
const KEYS = new Set<IntegrationKey>(["bobgo", "yetopay", "resend", "whatsapp"]);

const pick = (...vals: unknown[]): string => {
  for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim();
  return "";
};

export async function updateIntegration(
  key: string,
  input: { enabled: boolean; config: Cfg }
): Promise<ActionResult> {
  await requireAdmin();
  if (!KEYS.has(key as IntegrationKey)) {
    return { ok: false, error: "Unknown integration." };
  }
  const k = key as IntegrationKey;
  const [row] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.key, k))
    .limit(1);
  if (!row) return { ok: false, error: "Integration not found." };

  const existing = (row.config ?? {}) as Cfg;
  const merged = mergeConfig(k, existing, input.config ?? {});

  await db
    .update(integrations)
    .set({ enabled: !!input.enabled, config: merged })
    .where(eq(integrations.key, k));

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Flip enabled on/off without touching the stored config. */
export async function toggleIntegration(
  key: string,
  enabled: boolean
): Promise<ActionResult> {
  await requireAdmin();
  if (!KEYS.has(key as IntegrationKey)) {
    return { ok: false, error: "Unknown integration." };
  }
  await db
    .update(integrations)
    .set({ enabled: !!enabled })
    .where(eq(integrations.key, key));
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Wipe an integration's stored config and turn it off — a clean slate. */
export async function resetIntegration(key: string): Promise<ActionResult> {
  await requireAdmin();
  if (!KEYS.has(key as IntegrationKey)) {
    return { ok: false, error: "Unknown integration." };
  }
  await db
    .update(integrations)
    .set({ enabled: false, config: {} })
    .where(eq(integrations.key, key));
  revalidatePath("/", "layout");
  return { ok: true };
}

const sval = (v: unknown): string => (typeof v === "string" ? v : "");

/** Probe the *saved* credentials against the provider and report the result. */
export async function testIntegration(key: string): Promise<TestResult> {
  await requireAdmin();
  if (!KEYS.has(key as IntegrationKey)) {
    return { ok: false, message: "Unknown integration." };
  }
  const [row] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.key, key))
    .limit(1);
  if (!row) return { ok: false, message: "Integration not found." };
  const c = (row.config ?? {}) as Cfg;

  try {
    if (key === "bobgo") {
      const col = (c.collection ?? {}) as Cfg;
      const config: BobgoConfig = {
        apiKey: sval(c.apiKey),
        sandbox: c.sandbox === true,
        collection: {
          company: sval(col.company),
          streetAddress: sval(col.streetAddress),
          localArea: sval(col.localArea),
          city: sval(col.city),
          zone: sval(col.zone),
          country: sval(col.country) || "ZA",
          code: sval(col.code),
        },
      };
      if (!config.apiKey)
        return { ok: false, message: "Add a BobGo API key, then save and test." };
      if (
        !config.collection.streetAddress ||
        !config.collection.city ||
        !config.collection.code
      )
        return { ok: false, message: "Add the collection address, then save and test." };
      const rates = await getRatesAtCheckout(config, {
        deliveryAddress: { ...config.collection },
        items: [
          {
            description: "Test parcel",
            priceZAR: 100,
            quantity: 1,
            weightKg: 0.5,
            lengthCm: 15,
            widthCm: 15,
            heightCm: 15,
          },
        ],
        declaredValueZAR: 100,
      });
      return {
        ok: true,
        message: `Connected — BobGo returned ${rates.length} rate option(s).`,
      };
    }

    if (key === "yetopay") {
      const config: YetopayConfig = {
        baseUrl: sval(c.baseUrl)
          .replace(/\/+$/, "")
          .replace(/\/api(\/payment-links)?$/i, "")
          .replace(/\/+$/, ""),
        apiKey: sval(c.apiKey),
        apiSecret: sval(c.apiSecret),
        merchantId: sval(c.merchantId),
        webhookSecret: sval(c.webhookSecret),
        paymentMethod: c.paymentMethod === "card" ? "card" : "eft_direct",
        displayMode: c.displayMode === "iframe" ? "iframe" : "redirect",
      };
      if (!config.baseUrl || !config.apiKey || !config.apiSecret || !config.merchantId)
        return {
          ok: false,
          message: "Fill in Base URL, Merchant ID, API key and secret, then save and test.",
        };
      const link = await createPaymentLink(config, {
        amountZAR: 1,
        reference: `TEST-${Date.now()}`,
        description: "Connection test (no order — safe to ignore)",
      });
      return link.ok
        ? { ok: true, message: "Connected — YetoPay accepted your credentials." }
        : { ok: false, message: link.error ?? "YetoPay rejected the request." };
    }

    if (key === "resend") {
      const config: ResendConfig = {
        apiKey: sval(c.apiKey),
        fromEmail: sval(c.fromEmail),
        fromName: sval(c.fromName) || "Umthombo Creations",
      };
      if (!config.apiKey || !config.fromEmail)
        return { ok: false, message: "Add the API key and from-email, then save and test." };
      const res = await sendEmailWith(config, {
        to: config.fromEmail,
        subject: "Umthombo Creations — test email",
        html: "<p>This is a test email confirming your Resend integration works. 🌱</p>",
      });
      return res.ok
        ? { ok: true, message: `Test email sent to ${config.fromEmail}.` }
        : { ok: false, message: res.error ?? "Resend rejected the request." };
    }

    return { ok: false, message: "Nothing to test for this integration." };
  } catch (err) {
    const msg = (err as Error).message || "Test failed.";
    if (/\b(401|403)\b/.test(msg))
      return { ok: false, message: "Authentication failed — check the API key/secret." };
    return { ok: false, message: msg.slice(0, 200) };
  }
}

function mergeConfig(key: IntegrationKey, existing: Cfg, incoming: Cfg): Cfg {
  const out: Cfg = { ...existing };
  const secrets = SECRET_FIELDS[key];

  const setStr = (field: string, max = 500) => {
    const v = incoming[field];
    if (typeof v !== "string") return;
    const t = v.trim();
    if (secrets.includes(field)) {
      if (t) out[field] = t; // blank → keep existing secret
    } else {
      out[field] = t.slice(0, max);
    }
  };

  if (key === "bobgo") {
    setStr("apiKey");
    out.sandbox = incoming.sandbox === true;
    const col = (incoming.collection ?? {}) as Cfg;
    const ecol = (existing.collection ?? {}) as Cfg;
    out.collection = {
      company: pick(col.company, ecol.company),
      streetAddress: pick(col.streetAddress, ecol.streetAddress),
      localArea: pick(col.localArea, ecol.localArea),
      city: pick(col.city, ecol.city),
      zone: pick(col.zone, ecol.zone),
      country: pick(col.country, ecol.country, "ZA"),
      code: pick(col.code, ecol.code),
    };
  } else if (key === "yetopay") {
    setStr("apiKey");
    setStr("apiSecret");
    setStr("webhookSecret");
    setStr("baseUrl");
    setStr("merchantId");
    out.paymentMethod = incoming.paymentMethod === "card" ? "card" : "eft_direct";
    out.displayMode = incoming.displayMode === "iframe" ? "iframe" : "redirect";
  } else if (key === "resend") {
    setStr("apiKey");
    setStr("fromEmail", 160);
    setStr("fromName", 80);
  }
  // whatsapp has no config

  return out;
}
