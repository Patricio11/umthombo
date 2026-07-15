"use client";

import { useState, useTransition } from "react";
import { Loader2, Tag, X, Check } from "lucide-react";
import { previewCoupon, type CouponPreview } from "@/server/actions/promotions";
import { formatZAR } from "@/lib/format";
import { inputClass } from "@/components/admin/primitives";
import { cn } from "@/lib/utils";

export interface AppliedCoupon extends CouponPreview {
  code: string;
}

/**
 * "Have a code?" — a quiet link that opens a single field. The preview is just
 * that: the server re-checks the code at `placeOrder`, so nothing here can move
 * the price on its own.
 */
export function CouponField({
  method,
  deliveryFeeZAR,
  items,
  applied,
  onApplied,
}: {
  method: "delivery" | "collection";
  deliveryFeeZAR: number;
  items: { slug: string; qty: number; containersReturned?: number }[];
  applied: AppliedCoupon | null;
  onApplied: (c: AppliedCoupon | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const apply = () => {
    const c = code.trim();
    if (!c) return;
    setError(null);
    start(async () => {
      const res = await previewCoupon({ code: c, method, deliveryFeeZAR, items });
      if (res.ok) {
        onApplied({ ...res, code: c.toUpperCase() });
        setCode("");
        setOpen(false);
      } else {
        setError(res.error ?? "That code doesn’t apply.");
      }
    });
  };

  if (applied?.ok) {
    return (
      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl bg-olive/10 px-4 py-3">
        <span className="flex min-w-0 items-center gap-2 text-sm">
          <Check size={15} className="shrink-0 text-olive" />
          <span className="min-w-0">
            <span className="font-medium text-olive">{applied.code}</span>
            <span className="ml-1.5 text-ink-soft">
              {applied.freeShipping
                ? "· free delivery"
                : `· −${formatZAR(applied.valueZAR ?? 0)}`}
            </span>
          </span>
        </span>
        <button
          type="button"
          onClick={() => onApplied(null)}
          aria-label="Remove code"
          className="shrink-0 rounded-full p-1 text-ink-soft transition-colors hover:text-clay"
        >
          <X size={15} />
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-olive"
      >
        <Tag size={14} /> Have a code?
      </button>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex gap-2">
        <input
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              apply();
            }
          }}
          placeholder="Enter code"
          aria-label="Discount code"
          className={cn(inputClass, "font-mono uppercase")}
        />
        <button
          type="button"
          onClick={apply}
          disabled={pending || !code.trim()}
          className="shrink-0 rounded-full bg-ink px-4 text-sm font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {pending ? <Loader2 size={15} className="animate-spin" /> : "Apply"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-clay">{error}</p>}
    </div>
  );
}
