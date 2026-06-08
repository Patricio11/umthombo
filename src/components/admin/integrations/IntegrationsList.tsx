"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Truck, CreditCard, Mail, MessageCircle, ArrowRight } from "lucide-react";
import type { AdminIntegrationListItem } from "@/server/db/integrations";
import {
  INTEGRATION_META,
  CATEGORY_LABEL,
  type IntegrationCategory,
  type PaymentProvider,
} from "@/lib/integrations";
import { Card, Switch } from "@/components/admin/primitives";
import { useToast } from "@/components/admin/Toast";
import {
  toggleIntegration,
  setPaymentProvider,
} from "@/server/actions/integrations";
import { cn } from "@/lib/utils";

const ICON: Record<IntegrationCategory, typeof Truck> = {
  shipping: Truck,
  payment: CreditCard,
  email: Mail,
  channel: MessageCircle,
};

export function IntegrationsList({
  integrations,
  activeProvider,
}: {
  integrations: AdminIntegrationListItem[];
  activeProvider: PaymentProvider | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const payment = integrations.filter((i) => i.category === "payment");

  const onToggle = (item: AdminIntegrationListItem, enabled: boolean) => {
    if (enabled && !item.configured && item.key !== "whatsapp") {
      toast.error(`Configure ${item.name} before turning it on.`);
      return;
    }
    startTransition(async () => {
      const res = await toggleIntegration(item.key, enabled);
      if (res.ok)
        toast.success(`${item.name} ${enabled ? "enabled" : "disabled"}.`);
      else toast.error(res.error ?? "Could not update.");
      router.refresh();
    });
  };

  // The live gateway: explicit choice, else first ready payment provider.
  const resolvedActive =
    (activeProvider && payment.find((p) => p.key === activeProvider)
      ? activeProvider
      : payment.find((p) => p.enabled && p.configured)?.key) ?? null;

  const onPick = (key: PaymentProvider) =>
    startTransition(async () => {
      const res = await setPaymentProvider(key);
      if (res.ok) {
        toast.success(`${INTEGRATION_META[key].name} is now your live gateway.`);
        router.refresh();
      } else {
        toast.error(res.error ?? "Could not update.");
      }
    });

  return (
    <div className="space-y-6">
      {payment.length > 0 && (
        <Card className="space-y-3">
          <div>
            <p className="font-display text-lg leading-tight">
              Active payment gateway
            </p>
            <p className="text-xs text-ink-soft">
              Both can be set up; the one you pick takes payments. Switch
              anytime — if it’s ever down, just point this at the other.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {payment.map((p) => {
              const isActive = resolvedActive === (p.key as PaymentProvider);
              const ready = p.enabled && p.configured;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => onPick(p.key as PaymentProvider)}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left transition-all",
                    isActive
                      ? "border-olive bg-olive/5"
                      : "border-cream-3 hover:border-olive/40"
                  )}
                >
                  <span className="flex items-center justify-between">
                    <span className="font-medium">
                      {INTEGRATION_META[p.key].name}
                    </span>
                    {isActive && (
                      <span className="rounded-full bg-olive px-2 py-0.5 text-[11px] font-semibold text-cream">
                        Live
                      </span>
                    )}
                  </span>
                  <span
                    className={cn(
                      "mt-1 block text-xs",
                      ready ? "text-olive" : "text-taupe"
                    )}
                  >
                    {ready
                      ? "Ready"
                      : p.configured
                        ? "Configured · turn on to use"
                        : "Needs setup"}
                  </span>
                </button>
              );
            })}
          </div>
          {resolvedActive &&
            !payment.find((p) => p.key === resolvedActive)?.enabled && (
              <p className="rounded-xl bg-clay/10 px-4 py-2.5 text-xs text-clay">
                Your live gateway is turned off — payments will fall back to the
                other gateway if it’s ready, otherwise WhatsApp/manual.
              </p>
            )}
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {integrations.map((item) => {
        const Icon = ICON[item.category];
        const meta = INTEGRATION_META[item.key];
        return (
          <Card key={item.key} className="flex flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cream-2 text-olive">
                  <Icon size={20} />
                </span>
                <div>
                  <p className="font-display text-lg leading-tight">{item.name}</p>
                  <p className="text-xs uppercase tracking-wide text-ink-soft">
                    {CATEGORY_LABEL[item.category]}
                  </p>
                </div>
              </div>
              <Switch
                checked={item.enabled}
                onChange={(v) => onToggle(item, v)}
                label={`Toggle ${item.name}`}
              />
            </div>

            <p className="mt-3 flex-1 text-sm text-ink-soft">{meta.blurb}</p>

            <div className="mt-4 flex items-center justify-between">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                  item.configured
                    ? "bg-olive/15 text-olive"
                    : "bg-taupe/20 text-taupe"
                }`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {item.configured ? "Configured" : "Needs setup"}
              </span>
              {item.key !== "whatsapp" && (
                <Link
                  href={`/admin/integrations/${item.key}`}
                  className="link-underline inline-flex items-center gap-1 text-sm text-olive"
                >
                  Configure <ArrowRight size={14} />
                </Link>
              )}
            </div>
          </Card>
        );
        })}
      </div>
      {pending && <span className="sr-only">Saving…</span>}
    </div>
  );
}
