"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Copy, Check, Plug, RotateCcw } from "lucide-react";
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
import { useConfirm } from "@/components/admin/ConfirmDialog";
import {
  updateIntegration,
  testIntegration,
  resetIntegration,
  registerYocoWebhookAction,
} from "@/server/actions/integrations";

export function IntegrationForm({
  detail,
  appUrl,
}: {
  detail: AdminIntegrationDetail;
  appUrl: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [testing, startTest] = useTransition();
  const [resetting, startReset] = useTransition();
  const [registering, startRegister] = useTransition();
  const c = detail.config as Record<string, any>;

  const onRegisterWebhook = () =>
    startRegister(async () => {
      const res = await registerYocoWebhookAction();
      if (res.ok) {
        toast.success(res.message);
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });

  const onTest = () =>
    startTest(async () => {
      const res = await testIntegration(detail.key);
      if (res.ok) toast.success(res.message);
      else toast.error(res.message);
    });

  const onReset = async () => {
    const ok = await confirm({
      title: `Reset ${detail.name}?`,
      description:
        "This clears all saved credentials and turns it off. You can re-enter them anytime.",
      confirmLabel: "Reset",
      danger: true,
    });
    if (!ok) return;
    startReset(async () => {
      const res = await resetIntegration(detail.key);
      if (res.ok) {
        toast.success("Credentials cleared.");
        router.push("/admin/integrations");
        router.refresh();
      } else {
        toast.error(res.error ?? "Could not reset.");
      }
    });
  };

  const [enabled, setEnabled] = useState(detail.enabled);
  const [sandbox, setSandbox] = useState(c.sandbox === true);
  const [paymentMethod, setPaymentMethod] = useState<"eft_direct" | "card">(
    c.paymentMethod === "card" ? "card" : "eft_direct"
  );
  const [displayMode, setDisplayMode] = useState<"redirect" | "iframe">(
    c.displayMode === "iframe" ? "iframe" : "redirect"
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
    secretKey: "",
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
        displayMode,
      };
    } else if (detail.key === "yoco") {
      config = {
        secretKey: secrets.secretKey,
        webhookSecret: secrets.webhookSecret,
      };
    } else if (detail.key === "bobpay") {
      config = {
        apiKey: secrets.apiKey,
        sandbox,
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
    detail.secretsSet[field] ? "•••••••• (saved  leave blank to keep)" : "";

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
              Where couriers collect parcels  used as the origin for rates.
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
                <Select
                  value={f.zone}
                  onChange={(v) => set("zone", v)}
                  options={ZA_PROVINCES.map((p) => ({ value: p.code, label: p.name }))}
                />
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
            <Field
              label="Base URL"
              hint="Your YetoPay site URL  no path. The API path is added automatically."
            >
              <Input
                value={f.baseUrl}
                onChange={(e) => set("baseUrl", e.target.value)}
                placeholder="https://www.yetopay.co.za"
              />
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
              <Select
                value={paymentMethod}
                onChange={(v) => setPaymentMethod(v as "eft_direct" | "card")}
                options={[
                  { value: "eft_direct", label: "Instant EFT" },
                  { value: "card", label: "Card" },
                ]}
              />
            </Field>
            <Field
              label="Checkout display"
              hint="How the payment page is shown to customers"
            >
              <Select
                value={displayMode}
                onChange={(v) => setDisplayMode(v as "redirect" | "iframe")}
                options={[
                  { value: "redirect", label: "Full-page redirect" },
                  { value: "iframe", label: "Embedded iFrame (stay on site)" },
                ]}
              />
            </Field>
          </Card>

          <WebhookCard
            label="Payment webhook"
            hint="Add this URL in YetoPay → Settings → Webhooks (subscribe to all events)."
            url={`${appUrl}/api/webhooks/yetopay`}
          />
        </>
      )}

      {/* Yoco */}
      {detail.key === "yoco" && (
        <>
          <Card className="space-y-5">
            <h2 className="font-display text-lg">Credentials</h2>
            <Field
              label="Secret key"
              hint="Yoco dashboard → Sell online → Payment gateway → API keys (starts with sk_)"
            >
              <Input
                type="password"
                value={secrets.secretKey}
                onChange={(e) =>
                  setSecrets((s) => ({ ...s, secretKey: e.target.value }))
                }
                placeholder={secretPlaceholder("secretKey")}
                autoComplete="off"
              />
            </Field>
            <Field
              label="Webhook signing secret"
              hint="Set automatically by “Register webhook” below - or paste a whsec_… value."
            >
              <Input
                type="password"
                value={secrets.webhookSecret}
                onChange={(e) =>
                  setSecrets((s) => ({ ...s, webhookSecret: e.target.value }))
                }
                placeholder={secretPlaceholder("webhookSecret")}
                autoComplete="off"
              />
            </Field>
          </Card>

          <Card className="space-y-3">
            <h2 className="font-display text-lg">Payment webhook</h2>
            <p className="text-xs text-ink-soft">
              Save your secret key first, then register this URL with Yoco - the
              signing secret is fetched and stored automatically. Click once.
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-cream-3 bg-cream-2/50 px-3 py-2.5">
              <code className="min-w-0 flex-1 truncate text-xs text-ink">
                {`${appUrl}/api/webhooks/yoco`}
              </code>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onRegisterWebhook}
              disabled={registering}
            >
              {registering ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plug size={16} />
              )}
              Register webhook
            </Button>
          </Card>
        </>
      )}

      {/* Bob Pay */}
      {detail.key === "bobpay" && (
        <>
          <Card className="space-y-5">
            <h2 className="font-display text-lg">Credentials</h2>
            <Field
              label="API key"
              hint="Bob Pay dashboard → Developer / API. Used as a Bearer token."
            >
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
                  Use Bob Pay&rsquo;s test environment
                </span>
              </span>
              <Switch checked={sandbox} onChange={setSandbox} label="Sandbox" />
            </label>
          </Card>

          <Card className="space-y-2">
            <h2 className="font-display text-lg">Payment webhook</h2>
            <p className="text-xs text-ink-soft">
              No dashboard step needed — Bob Pay is told this URL with every
              payment, and we verify each callback straight back with Bob Pay.
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-cream-3 bg-cream-2/50 px-3 py-2.5">
              <code className="min-w-0 flex-1 truncate text-xs text-ink">
                {`${appUrl}/api/webhooks/bobpay`}
              </code>
            </div>
          </Card>
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

      <div className="flex flex-wrap items-center gap-3 border-t border-cream-2 pt-5">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 size={16} className="animate-spin" />}
          Save integration
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onTest}
          disabled={testing}
        >
          {testing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Plug size={16} />
          )}
          Test connection
        </Button>
        <button
          type="button"
          onClick={onReset}
          disabled={resetting}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-clay transition-colors hover:bg-clay/10 disabled:opacity-60"
        >
          {resetting ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <RotateCcw size={15} />
          )}
          Reset
        </button>
      </div>
      <p className="-mt-2 text-xs text-ink-soft">
        Test uses your <strong>saved</strong> settings - save changes first.
        Changing a secret? Type the new value (leaving it blank keeps the old
        one).
      </p>
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
