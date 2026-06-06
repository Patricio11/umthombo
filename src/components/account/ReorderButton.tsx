"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";
import { useCart } from "@/store/cart";
import { reorder } from "@/server/actions/reorder";

export function ReorderButton({ orderId }: { orderId: string }) {
  const addItem = useCart((s) => s.addItem);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const onClick = () =>
    start(async () => {
      setMsg(null);
      const res = await reorder(orderId);
      if (!res.ok) {
        setMsg(res.error ?? "Couldn’t reorder right now.");
        return;
      }
      if (res.items.length === 0) {
        setMsg("Those products aren’t available anymore.");
        return;
      }
      res.items.forEach((it) =>
        addItem(
          {
            slug: it.slug,
            name: it.name,
            variant: it.variant ?? undefined,
            unitPriceZAR: it.unitPriceZAR,
            image: it.image,
          },
          it.qty,
          { open: false }
        )
      );
      router.push("/checkout");
    });

  return (
    <div>
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-olive px-5 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-olive-soft disabled:opacity-60"
      >
        {pending ? (
          <Loader2 size={15} className="animate-spin" />
        ) : (
          <RefreshCw size={15} />
        )}
        Buy again
      </button>
      {msg && <p className="mt-2 text-xs text-clay">{msg}</p>}
    </div>
  );
}
