"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, BadgeCheck, Truck } from "lucide-react";
import { useToast } from "@/components/admin/Toast";
import { markOrderPaid, createShipment } from "@/server/actions/orders";

export function OrderFulfilmentActions({
  id,
  paymentStatus,
  method,
  hasShipment,
}: {
  id: string;
  paymentStatus: string;
  method: "delivery" | "collection";
  hasShipment: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    okMsg: string
  ) =>
    startTransition(async () => {
      setError(null);
      const res = await fn();
      if (res.ok) {
        toast.success(okMsg);
      } else {
        toast.error("Couldn’t create the shipment — see the details below.");
        setError(res.error ?? "Something went wrong.");
      }
      router.refresh();
    });

  const showMarkPaid = paymentStatus !== "paid";
  const showShipment =
    method === "delivery" && paymentStatus === "paid" && !hasShipment;

  if (!showMarkPaid && !showShipment) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-cream-2 pt-4">
      {showMarkPaid && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => markOrderPaid(id), "Marked as paid.")}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-olive px-4 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-olive-soft disabled:opacity-60"
        >
          {pending ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <BadgeCheck size={15} />
          )}
          Mark as paid
        </button>
      )}
      {showShipment && (
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => createShipment(id), "Shipment created.")}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-ink/20 px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-olive hover:text-olive disabled:opacity-60"
        >
          {pending ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Truck size={15} />
          )}
          Create BobGo shipment
        </button>
      )}
      {error && (
        <div className="rounded-xl bg-clay/10 px-4 py-3 text-xs text-clay">
          <p className="mb-1 font-medium">BobGo couldn’t create the shipment</p>
          <p className="break-words font-mono leading-relaxed">{error}</p>
        </div>
      )}
    </div>
  );
}
