"use client";

import { useState } from "react";
import { Recycle, Ticket } from "lucide-react";
import type { DiscountProductRow } from "@/server/db/discounts";
import type { AdminPromotionRow } from "@/server/db/promotions";
import type { DiscountRule } from "@/lib/discount";
import { DiscountManager } from "@/components/admin/discounts/DiscountManager";
import { PromotionsManager } from "@/components/admin/discounts/PromotionsManager";
import { cn } from "@/lib/utils";

type Tab = "container" | "promotions";

export function DiscountsTabs({
  rule,
  products,
  promotions,
}: {
  rule: DiscountRule;
  products: DiscountProductRow[];
  promotions: AdminPromotionRow[];
}) {
  const [tab, setTab] = useState<Tab>("container");

  const tabs: { key: Tab; label: string; icon: typeof Recycle; count?: number }[] =
    [
      { key: "container", label: "Bring-back", icon: Recycle },
      {
        key: "promotions",
        label: "Coupons & offers",
        icon: Ticket,
        count: promotions.length,
      },
    ];

  return (
    <div className="space-y-6">
      <div className="flex w-fit gap-1 rounded-full bg-cream-2 p-1">
        {tabs.map((t) => {
          const active = tab === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-cream text-ink shadow-sm"
                  : "text-ink-soft hover:text-ink"
              )}
            >
              <Icon size={15} />
              {t.label}
              {t.count != null && t.count > 0 && (
                <span
                  className={cn(
                    "rounded-full px-1.5 text-[11px]",
                    active ? "bg-cream-2 text-ink-soft" : "bg-cream text-taupe"
                  )}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === "container" ? (
        <DiscountManager rule={rule} products={products} />
      ) : (
        <PromotionsManager promotions={promotions} />
      )}
    </div>
  );
}
