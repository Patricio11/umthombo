"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-schema";
import { updateOrderStatus } from "@/server/actions/orders";
import { useToast } from "@/components/admin/Toast";
import { cn } from "@/lib/utils";

export function OrderStatusControl({
  id,
  current,
}: {
  id: string;
  current: OrderStatus;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const set = (status: OrderStatus) => {
    if (status === current) return;
    startTransition(async () => {
      const res = await updateOrderStatus(id, status);
      if (res.ok) toast.success(`Marked as ${status}.`);
      else toast.error(res.error ?? "Could not update.");
      router.refresh();
    });
  };

  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-sm font-medium">
        Status
        {pending && <Loader2 size={14} className="animate-spin text-olive" />}
      </div>
      <div className="flex flex-wrap gap-2">
        {ORDER_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending}
            onClick={() => set(s)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm capitalize transition-all disabled:opacity-60",
              s === current
                ? "border-olive bg-olive text-cream"
                : "border-cream-3 text-ink-soft hover:border-ink/25 hover:text-ink"
            )}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
