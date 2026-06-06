"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Copy, Check } from "lucide-react";
import type { AdminIntegrationDetail } from "@/server/db/integrations";
import { ZA_PROVINCES } from "@/lib/integrations";
import {
  Card,
  Field,
  Input,
  Select,
  Switch,
} from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/admin/Toast";
import { updateIntegration } from "@/server/actions/integrations";

export function IntegrationForm({
  detail,
  appUrl,
}: {
  detail: AdminIntegrationDetail;
  appUrl: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const c = detail.config as Record<string, any>;

  const [enabled, setEnabled] = useState(detail.enabled);
  const [sandbox, setSandbox] = useState(c.sandbox === true);
  const [paymentMethod, setPaymentMethod] = useState<"eft_direct" | "card">(
    c.paymentMethod === "card" ? "card" : "eft_direct"
  );
  const [f, setF] = useState({
    baseUrl: c.baseUrl ?? "",
    merchantId: c.merchantId ?? "",
    fromEmail: c.fromEmail ?? "",
    fromName: c.fromName ?? "",
    company: c.collection?.company ?? "",
    streetAddress: c.collection?.streetAddress ?? "",
    localArea: c.collection?.localArea ?? "",
    city: c.collection?.city ?? "",
    zone: c.collection?.zone ?? "WC",
    code: c.collection?.code ?? "",
  });
  const [secrets, setSecrets] = useState({
    apiKey: "",
    apiSecret: "",
    webhookSecret: "",
  });
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let config: Record<string, unknown> = {};
    if (detail.key === "bobgo") {
      config = {
        apiKey: secrets.apiKey,
        sandbox,
        collection: {
          company: f.company,
          streetAddress: f.streetAddress,
          localArea: f.localArea,
          city: f.city,
          zone: f.zone,
          country: "ZA",
          code: f.code,
        },
      };
    } else if (detail.key === "yetopay") {
      config = {
        baseUrl: f.baseUrl,
        merchantId: f.merchantId,
        apiKey: secrets.apiKey,
        apiSecret: secrets.apiSecret,
        webhookSecret: secrets.webhookSecret,
        paymentMethod,
      };
    } else if (detail.key === "resend") {
      config = {
        apiKey: secrets.apiKey,
        fromEmail: f.fromEmail,
        fromName: f.fromName,
      };
    }
    startTransition(async () => {
      const res = await updateIntegration(detail.key, { enabled, config });
      if (res.ok) {
        toast.success("Integration saved.");
        router.push("/admin/integrations");
        router.refresh();
      } else {
        toast.error(res.error ?? "Something went wrong.");
      }
    });
  };

  const secretPlaceholder = (field: string) =>
    detail.secretsSet[field] ? "•••••••• (saved — leave blank to keep)" : "";

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      <Link
        href="/admin/integrations"
        className="link-underline inline-flex items-center gap-2 text-sm text-ink-soft"
      >
        <ArrowLeft size={16} /> Integrations
      </Link>

      <Card>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">
            Enabled
            <span className="mt-0.5 block text-xs font-normal text-ink-soft">
              Turn on once the details below are filled in
            </span>
          </span>
          <Switch checked={enabled} onChange={setEnabled} label="Enabled" />
        </label>
      </Card>

      {/* BobGo */}
      {detail.key === "bobgo" && (
        <>
          <Card className="space-y-5">
            <h2 className="font-display text-lg">Credentials</h2>
            <Field label="API key" hint="From your BobGo account">
              <Input
                type="password"
                value={secrets.apiKey}
                onChange={(e) =>
                  setSecrets((s) => ({ ...s, apiKey: e.target.value }))
                }
                placeholder={secretPlaceholder("apiKey")}
                autoComplete="off"
              />
            </Field>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">
                Sandbox mode
                <span className="mt-0.5 block text-xs font-normal text-ink-soft">
                  Use BobGo&rsquo;s test environment
                </span>
              </span>
              <Switch checked={sandbox} onChange={setSandbox} label="Sandbox" />
            </label>
          </Card>

          <Card className="space-y-5">
            <h2 className="font-display text-lg">Collection address</h2>
            <p className="text-xs text-ink-soft">
              Where couriers collect parcels — used as the origin for rates.
            </p>
            <Field label="Company">
              <Input value={f.company} onChange={(e) => set("company", e.target.value)} />
            </Field>
            <Field label="Street address">
              <Input value={f.streetAddress} onChange={(e) => set("streetAddress", e.target.value)} />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Suburb / area">
                <Input value={f.localArea} onChange={(e) => set("localArea", e.target.value)} />
              </Field>
              <Field label="City">
                <Input value={f.city} onChange={(e) => set("city", e.target.value)} />
              </Field>
              <Field label="Province">
                <Select value={f.zone} onChange={(e) => set("zone", e.target.value)}>
                  {ZA_PROVINCES.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Postal code">
                <Input value={f.code} onChange={(e) => set("code", e.target.value)} />
              </Field>
            </div>
          </Card>

          <WebhookCard
            label="Fulfilment webhook"
            hint="In your BobGo dashboard, subscribe to fulfilment updates and paste this URL. Tracking flows back automatically."
            url={`${appUrl}/api/webhooks/bobgo`}
          />
        </>
      )}

      {/* YetoEFT */}
      {detail.key === "yetopay" && (
        <>
          <Card className="space-y-5">
            <h2 className="font-display text-lg">Credentials</h2>
            <Field label="API base URL" hint="From your YetoPay dashboard">
              <Input value={f.baseUrl} onChange={(e) => set("baseUrl", e.target.value)} placeholder="https://api.yetopay.co.za" />
            </Field>
            <Field label="Merchant ID">
              <Input value={f.merchantId} onChange={(e) => set("merchantId", e.target.value)} />
            </Field>
            <Field label="API key">
              <Input
                type="password"
                value={secrets.apiKey}
                onChange={(e) => setSecrets((s) => ({ ...s, apiKey: e.target.value }))}
                placeholder={secretPlaceholder("apiKey")}
                autoComplete="off"
              />
            </Field>
            <Field label="API secret">
              <Input
                type="password"
                value={secrets.apiSecret}
                onChange={(e) => setSecrets((s) => ({ ...s, apiSecret: e.target.value }))}
                placeholder={secretPlaceholder("apiSecret")}
                autoComplete="off"
              />
            </Field>
            <Field label="Webhook secret" hint="From Settings → Webhooks in YetoPay">
              <Input
                type="password"
                value={secrets.webhookSecret}
                onChange={(e) => setSecrets((s) => ({ ...s, webhookSecret: e.target.value }))}
                placeholder={secretPlaceholder("webhookSecret")}
                autoComplete="off"
              />
            </Field>
            <Field label="Default payment method">
              <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as "eft_direct" | "card")}>
                <option value="eft_direct">Instant EFT</option>
                <option value="card">Card</option>
              </Select>
            </Field>
          </Card>

          <WebhookCard
            label="Payment webhook"
            hint="Add this URL in YetoPay → Settings → Webhooks (subscribe to all events)."
            url={`${appUrl}/api/webhooks/yetopay`}
          />
        </>
      )}

      {/* Resend */}
      {detail.key === "resend" && (
        <Card className="space-y-5">
          <h2 className="font-display text-lg">Email sender</h2>
          <Field label="Resend API key">
            <Input
              type="password"
              value={secrets.apiKey}
              onChange={(e) => setSecrets((s) => ({ ...s, apiKey: e.target.value }))}
              placeholder={secretPlaceholder("apiKey")}
              autoComplete="off"
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="From email" hint="Must be a verified domain in Resend">
              <Input value={f.fromEmail} onChange={(e) => set("fromEmail", e.target.value)} placeholder="hello@umthombocreations.co.za" />
            </Field>
            <Field label="From name">
              <Input value={f.fromName} onChange={(e) => set("fromName", e.target.value)} placeholder="Umthombo Creations" />
            </Field>
          </div>
        </Card>
      )}

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 size={16} className="animate-spin" />}
        Save integration
      </Button>
    </form>
  );
}

function WebhookCard({ label, hint, url }: { label: string; hint: string; url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card className="space-y-3">
      <h2 className="font-display text-lg">{label}</h2>
      <p className="text-xs text-ink-soft">{hint}</p>
      <div className="flex items-center gap-2 rounded-xl border border-cream-3 bg-cream-2/50 px-3 py-2.5">
        <code className="min-w-0 flex-1 truncate text-xs text-ink">{url}</code>
        <button
          type="button"
          aria-label="Copy URL"
          onClick={() => {
            navigator.clipboard?.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="shrink-0 rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-cream-2 hover:text-ink"
        >
          {copied ? <Check size={15} className="text-olive" /> : <Copy size={15} />}
        </button>
      </div>
    </Card>
  );
}
