import "server-only";
import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { integrations } from "@/server/db/schema";
import {
  INTEGRATION_META,
  SECRET_FIELDS,
  type IntegrationKey,
  type IntegrationCategory,
  type BobgoConfig,
  type YetopayConfig,
  type YocoConfig,
  type ResendConfig,
} from "@/lib/integrations";

type Row = typeof integrations.$inferSelect;
type Cfg = Record<string, unknown>;

/** Raw integration row (server-only). Cached per request. */
export const getIntegrationRow = cache(async (key: IntegrationKey) => {
  const [row] = await db
    .select()
    .from(integrations)
    .where(eq(integrations.key, key))
    .limit(1);
  return row ?? null;
});

export async function isIntegrationEnabled(key: IntegrationKey): Promise<boolean> {
  const row = await getIntegrationRow(key);
  return !!row?.enabled;
}

const str = (v: unknown, fallback = "") =>
  typeof v === "string" ? v : fallback;

/** Is the integration's config complete enough to use? */
export function isConfigured(key: IntegrationKey, config: Cfg): boolean {
  switch (key) {
    case "bobgo": {
      const c = config as Partial<BobgoConfig>;
      return !!(
        c.apiKey &&
        c.collection?.streetAddress &&
        c.collection?.city &&
        c.collection?.zone &&
        c.collection?.code
      );
    }
    case "yetopay": {
      const c = config as Partial<YetopayConfig>;
      return !!(c.baseUrl && c.apiKey && c.apiSecret && c.merchantId);
    }
    case "yoco": {
      const c = config as Partial<YocoConfig>;
      return !!c.secretKey;
    }
    case "resend": {
      const c = config as Partial<ResendConfig>;
      return !!(c.apiKey && c.fromEmail);
    }
    case "whatsapp":
      return true;
  }
}

/* ------------------------------------------------------------------ */
/*  Typed config getters  null when disabled or not configured        */
/* ------------------------------------------------------------------ */
export async function getBobgoConfig(): Promise<BobgoConfig | null> {
  const row = await getIntegrationRow("bobgo");
  if (!row?.enabled) return null;
  const c = (row.config ?? {}) as Partial<BobgoConfig>;
  if (!isConfigured("bobgo", c)) return null;
  const col = c.collection ?? ({} as BobgoConfig["collection"]);
  return {
    apiKey: str(c.apiKey),
    sandbox: c.sandbox === true,
    collection: {
      company: str(col.company),
      streetAddress: str(col.streetAddress),
      localArea: str(col.localArea),
      city: str(col.city),
      zone: str(col.zone),
      country: str(col.country, "ZA"),
      code: str(col.code),
    },
  };
}

export async function getYetopayConfig(): Promise<YetopayConfig | null> {
  const row = await getIntegrationRow("yetopay");
  if (!row?.enabled) return null;
  const c = (row.config ?? {}) as Partial<YetopayConfig>;
  if (!isConfigured("yetopay", c)) return null;
  return {
    // Accept the site root (e.g. https://www.yetopay.co.za); tolerate a pasted
    // trailing slash or "/api[/payment-links]" so we never double the path.
    baseUrl: str(c.baseUrl)
      .trim()
      .replace(/\/+$/, "")
      .replace(/\/api(\/payment-links)?$/i, "")
      .replace(/\/+$/, ""),
    apiKey: str(c.apiKey),
    apiSecret: str(c.apiSecret),
    merchantId: str(c.merchantId),
    webhookSecret: str(c.webhookSecret),
    paymentMethod: c.paymentMethod === "card" ? "card" : "eft_direct",
    displayMode: c.displayMode === "iframe" ? "iframe" : "redirect",
  };
}

export async function getYocoConfig(): Promise<YocoConfig | null> {
  const row = await getIntegrationRow("yoco");
  if (!row?.enabled) return null;
  const c = (row.config ?? {}) as Partial<YocoConfig>;
  if (!isConfigured("yoco", c)) return null;
  return {
    secretKey: str(c.secretKey),
    webhookSecret: str(c.webhookSecret),
  };
}

export async function getResendConfig(): Promise<ResendConfig | null> {
  const row = await getIntegrationRow("resend");
  if (!row?.enabled) return null;
  const c = (row.config ?? {}) as Partial<ResendConfig>;
  if (!isConfigured("resend", c)) return null;
  return {
    apiKey: str(c.apiKey),
    fromEmail: str(c.fromEmail),
    fromName: str(c.fromName, "Umthombo Creations"),
  };
}

/* ------------------------------------------------------------------ */
/*  Admin views (secrets stripped)                                     */
/* ------------------------------------------------------------------ */
export interface AdminIntegrationListItem {
  key: IntegrationKey;
  name: string;
  category: IntegrationCategory;
  enabled: boolean;
  configured: boolean;
}

export async function getAdminIntegrations(): Promise<AdminIntegrationListItem[]> {
  const rows = await db.select().from(integrations);
  const byKey = new Map(rows.map((r) => [r.key as IntegrationKey, r]));
  // Drive off INTEGRATION_META so a newly added integration shows up even
  // before its DB row exists (created on first save).
  return (Object.keys(INTEGRATION_META) as IntegrationKey[])
    .map((key) => {
      const r = byKey.get(key);
      const meta = INTEGRATION_META[key];
      return {
        key,
        name: meta.name,
        category: meta.category,
        enabled: r?.enabled ?? false,
        configured: isConfigured(key, (r?.config ?? {}) as Cfg),
      };
    })
    .sort(
      (a, b) =>
        a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
    );
}

export interface AdminIntegrationDetail {
  key: IntegrationKey;
  name: string;
  category: IntegrationCategory;
  enabled: boolean;
  /** Non-secret config values, safe to send to the client. */
  config: Cfg;
  /** Which secret fields currently have a value (so the form can show "saved"). */
  secretsSet: Record<string, boolean>;
}

export async function getAdminIntegration(
  key: IntegrationKey
): Promise<AdminIntegrationDetail | null> {
  if (!(key in INTEGRATION_META)) return null;
  const row = await getIntegrationRow(key);
  // No row yet (e.g. a newly added integration) → a blank, editable default.
  if (!row) {
    const meta = INTEGRATION_META[key];
    return {
      key,
      name: meta.name,
      category: meta.category,
      enabled: false,
      config: {},
      secretsSet: {},
    };
  }
  const full = (row.config ?? {}) as Cfg;
  const secrets = SECRET_FIELDS[key];
  const safe: Cfg = {};
  const secretsSet: Record<string, boolean> = {};
  for (const [k, v] of Object.entries(full)) {
    if (secrets.includes(k)) {
      secretsSet[k] = typeof v === "string" ? v.length > 0 : !!v;
    } else {
      safe[k] = v;
    }
  }
  return {
    key,
    name: row.name,
    category: row.category as IntegrationCategory,
    enabled: row.enabled,
    config: safe,
    secretsSet,
  };
}

export { INTEGRATION_META };
