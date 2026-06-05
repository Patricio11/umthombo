"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/components/admin/Toast";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { deleteOrder } from "@/server/actions/orders";

export function OrderActions({
  id,
  orderNumber,
}: {
  id: string;
  orderNumber: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();

  const onDelete = async () => {
    const ok = await confirm({
      title: `Delete ${orderNumber}?`,
      description: "This permanently removes the order and its items. This can't be undone.",
      confirmLabel: "Delete order",
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteOrder(id);
      if (res.ok) {
        toast.success("Order deleted.");
        router.push("/admin/orders");
        router.refresh();
      } else {
        toast.error(res.error ?? "Could not delete.");
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/admin/orders/${id}/edit`}
        className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-olive hover:text-olive"
      >
        <Pencil size={15} /> Edit
      </Link>
      <button
        type="button"
        onClick={onDelete}
        disabled={pending}
        aria-label="Delete order"
        className="inline-flex items-center justify-center rounded-full border border-ink/20 p-2.5 text-ink-soft transition-colors hover:border-clay hover:text-clay disabled:opacity-60"
      >
        <Trash2 size={15} />
      </button>
    </div>
  );
}
