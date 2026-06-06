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
} from "@/lib/integrations";
import { Card, Switch } from "@/components/admin/primitives";
import { useToast } from "@/components/admin/Toast";
import { toggleIntegration } from "@/server/actions/integrations";

const ICON: Record<IntegrationCategory, typeof Truck> = {
  shipping: Truck,
  payment: CreditCard,
  email: Mail,
  channel: MessageCircle,
};

export function IntegrationsList({
  integrations,
}: {
  integrations: AdminIntegrationListItem[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

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

  return (
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
      {pending && <span className="sr-only">Saving…</span>}
    </div>
  );
}
