"use client";

import { motion, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { RisingBubbles } from "@/components/motion/RisingBubbles";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import { formatZAR } from "@/lib/format";

export interface OrderReceipt {
  orderNumber: string;
  name: string;
  method: "delivery" | "collection";
  address?: string;
  items: {
    name: string;
    variant?: string | null;
    qty: number;
    unitPriceZAR: number;
  }[];
  subtotal: number;
  discount: number;
  deliveryFee: number;
  total: number;
}

export function OrderSuccess({
  receipt,
  onDone,
}: {
  receipt: OrderReceipt;
  onDone: () => void;
}) {
  const reduce = useReducedMotion();
  const site = useSiteSettings();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
      data-lenis-prevent
      className="relative max-h-[92dvh] overflow-y-auto"
    >
      {/* Celebration header */}
      <div className="relative overflow-hidden bg-olive/8 px-7 pb-7 pt-9 text-center">
        <RisingBubbles count={8} color="var(--color-olive)" />
        <div className="relative mx-auto mb-4 h-14 w-14">
          <motion.div
            aria-hidden
            className="absolute inset-0 -z-10 rounded-full bg-olive/25 blur-xl"
            animate={
              reduce ? undefined : { opacity: [0.4, 0.7, 0.4], scale: [1, 1.12, 1] }
            }
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          <svg viewBox="0 0 56 56" fill="none" className="h-14 w-14" aria-hidden>
            <circle cx="28" cy="28" r="26" className="stroke-olive/30" strokeWidth="1.5" />
            <motion.path
              d="M17 29l7 7 15-16"
              className="stroke-olive"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
            />
          </svg>
        </div>
        <h3 className="font-display text-2xl">Order placed</h3>
        <p className="mt-1 text-sm text-ink-soft">
          We&rsquo;ve opened WhatsApp with your order — just hit send and
          we&rsquo;ll be in touch. 🌱
        </p>
      </div>

      {/* Receipt */}
      <div className="px-7 py-6">
        <div className="flex items-center justify-between border-b border-dashed border-cream-3 pb-3">
          <span className="eyebrow text-ink-soft">Receipt</span>
          <span className="font-mono text-sm">{receipt.orderNumber}</span>
        </div>

        <ul className="divide-y divide-cream-2">
          {receipt.items.map((it, i) => (
            <li key={i} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">{it.name}</p>
                <p className="text-xs text-ink-soft">
                  {it.variant ? `${it.variant} · ` : ""}
                  {it.qty} × {formatZAR(it.unitPriceZAR)}
                </p>
              </div>
              <span className="shrink-0 text-sm tabular-nums">
                {formatZAR(it.unitPriceZAR * it.qty)}
              </span>
            </li>
          ))}
        </ul>

        <div className="space-y-1.5 border-t border-cream-2 pt-3 text-sm">
          <div className="flex justify-between text-ink-soft">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatZAR(receipt.subtotal)}</span>
          </div>
          {receipt.discount > 0 && (
            <div className="flex justify-between text-olive">
              <span>Own container · 10% off</span>
              <span className="tabular-nums">−{formatZAR(receipt.discount)}</span>
            </div>
          )}
          {receipt.method === "delivery" && (
            <div className="flex justify-between text-ink-soft">
              <span>Delivery</span>
              <span className={receipt.deliveryFee > 0 ? "tabular-nums" : "text-xs"}>
                {receipt.deliveryFee > 0
                  ? formatZAR(receipt.deliveryFee)
                  : "To be confirmed"}
              </span>
            </div>
          )}
          <div className="flex items-baseline justify-between border-t border-cream-2 pt-2 font-display text-xl">
            <span>Total</span>
            <span className="tabular-nums">{formatZAR(receipt.total)}</span>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-cream-2 px-4 py-3 text-sm">
          <p className="font-medium">{receipt.name}</p>
          {receipt.method === "delivery" ? (
            <p className="mt-0.5 text-ink-soft">
              Delivery
              {receipt.address ? ` · ${receipt.address}` : ""}
            </p>
          ) : (
            <p className="mt-0.5 text-ink-soft">
              Collection · {site.collection}
            </p>
          )}
        </div>

        <Button size="lg" className="mt-6 w-full" onClick={onDone}>
          Lovely — done
        </Button>
        <p className="mt-3 text-center text-xs text-ink-soft">
          Didn&rsquo;t open? Message us on{" "}
          <span className="text-olive">{site.whatsapp.display}</span>.
        </p>
      </div>
    </motion.div>
  );
}
