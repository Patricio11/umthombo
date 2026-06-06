"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { Card } from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/admin/Toast";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { notifyAboutProduct } from "@/server/actions/notify";
import { cn } from "@/lib/utils";

const fmt = (d: string) =>
  new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(d));

export function NotifyCustomers({
  productId,
  categoryLabel,
  notifiedAt,
}: {
  productId: string;
  categoryLabel: string;
  notifiedAt: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [audience, setAudience] = useState<"category" | "all">("category");
  const [pending, start] = useTransition();

  const onSend = async () => {
    const ok = await confirm({
      title: "Email customers about this product?",
      description: notifiedAt
        ? `You already notified customers on ${fmt(notifiedAt)}. Send again?`
        : "This emails opted-in customers. Only do this once the product is ready to share.",
      confirmLabel: "Send",
    });
    if (!ok) return;
    start(async () => {
      const res = await notifyAboutProduct(productId, audience);
      if (res.ok) {
        toast.success(
          res.sent
            ? `Sent to ${res.sent} customer${res.sent === 1 ? "" : "s"}.`
            : "No opted-in customers matched."
        );
        router.refresh();
      } else {
        toast.error(res.error ?? "Couldn’t send.");
      }
    });
  };

  return (
    <Card className="space-y-4">
      <div>
        <h2 className="font-display text-lg">Notify customers</h2>
        <p className="text-sm text-ink-soft">
          Email opted-in customers about this product.
        </p>
        {notifiedAt && (
          <p className="mt-1 text-xs text-ink-soft">Last sent {fmt(notifiedAt)}.</p>
        )}
      </div>

      <div className="space-y-2">
        <Radio
          checked={audience === "category"}
          onChange={() => setAudience("category")}
          label={`Past buyers in ${categoryLabel || "this category"}`}
          hint="Customers who bought something similar"
        />
        <Radio
          checked={audience === "all"}
          onChange={() => setAudience("all")}
          label="All opted-in customers"
          hint="Everyone who opted in to product updates"
        />
      </div>

      <Button onClick={onSend} disabled={pending}>
        {pending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        Send notification
      </Button>
      <p className="text-xs text-ink-soft">
        Only opted-in, email-verified customers are emailed. Requires Resend
        enabled.
      </p>
    </Card>
  );
}

function Radio({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
        checked ? "border-olive bg-olive/5" : "border-cream-3 hover:border-olive/40"
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
          checked ? "border-olive" : "border-cream-3"
        )}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-olive" />}
      </span>
      <span>
        <span className="block text-sm font-medium text-ink">{label}</span>
        <span className="block text-xs text-ink-soft">{hint}</span>
      </span>
    </button>
  );
}
