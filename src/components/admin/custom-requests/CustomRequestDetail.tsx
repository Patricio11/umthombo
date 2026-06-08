"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  MessageCircle,
  Check,
  X,
} from "lucide-react";
import type { AdminCustomRequestDetail } from "@/server/db/admin-queries";
import {
  Card,
  Field,
  Input,
  Textarea,
  Switch,
} from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/admin/Toast";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { StatusPill } from "@/components/admin/custom-requests/StatusPill";
import {
  declineCustomRequest,
  quoteCustomRequest,
  setCustomRequestStatus,
} from "@/server/actions/custom-requests";
import { formatZAR } from "@/lib/format";

const fmtDate = (d: Date | string | null) =>
  d ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(d)) : "—";

/** Best-effort wa.me link (normalise a SA number to international). */
function waLink(phone: string, text: string): string {
  let digits = phone.replace(/[^\d]/g, "");
  if (digits.startsWith("0")) digits = "27" + digits.slice(1);
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className="text-right text-ink">{value}</span>
    </div>
  );
}

export function CustomRequestDetail({
  detail,
}: {
  detail: AdminCustomRequestDetail;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();

  const isTerminal =
    detail.status === "completed" ||
    detail.status === "declined" ||
    detail.status === "cancelled";
  const canQuote = detail.status === "pending" || detail.status === "quoted";

  // Quote form
  const [price, setPrice] = useState(
    detail.quotedPriceZAR ? String(detail.quotedPriceZAR) : ""
  );
  const [etaText, setEtaText] = useState(detail.etaText ?? "");
  const [etaDate, setEtaDate] = useState(
    detail.etaDate ? new Date(detail.etaDate).toISOString().slice(0, 10) : ""
  );
  const [depositRequired, setDepositRequired] = useState(detail.depositRequired);
  const [deposit, setDeposit] = useState(
    detail.depositZAR ? String(detail.depositZAR) : ""
  );
  const [adminNote, setAdminNote] = useState(detail.adminNote ?? "");

  // Decline form
  const [reason, setReason] = useState(detail.declineReason ?? "");

  const refresh = () => router.refresh();

  const onQuote = () =>
    start(async () => {
      const res = await quoteCustomRequest(detail.id, {
        priceZAR: parseInt(price) || 0,
        etaText: etaText || undefined,
        etaDate: etaDate || undefined,
        depositRequired,
        depositZAR: depositRequired ? parseInt(deposit) || 0 : undefined,
        adminNote: adminNote || undefined,
      });
      if (res.ok) {
        toast.success("Quote sent to the customer.");
        refresh();
      } else toast.error(res.error ?? "Couldn’t send the quote.");
    });

  const onDecline = () =>
    start(async () => {
      const res = await declineCustomRequest(detail.id, reason);
      if (res.ok) {
        toast.success("Request declined — the customer was notified.");
        refresh();
      } else toast.error(res.error ?? "Couldn’t decline.");
    });

  const onStatus = (status: Parameters<typeof setCustomRequestStatus>[1], label: string) =>
    start(async () => {
      const res = await setCustomRequestStatus(detail.id, status);
      if (res.ok) {
        toast.success(label);
        refresh();
      } else toast.error(res.error ?? "Couldn’t update.");
    });

  const onCancel = async () => {
    const ok = await confirm({
      title: "Cancel this request?",
      description: "The customer will be notified that it was cancelled.",
      confirmLabel: "Cancel request",
      danger: true,
    });
    if (ok) onStatus("cancelled", "Request cancelled.");
  };

  const waChat = waLink(
    detail.phone,
    `Hi ${detail.name.split(" ")[0]}, about your custom request ${detail.requestNumber} —`
  );

  return (
    <div className="space-y-6">
      <Link
        href="/admin/custom-requests"
        className="link-underline inline-flex items-center gap-2 text-sm text-ink-soft"
      >
        <ArrowLeft size={16} /> Custom requests
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">{detail.title}</h1>
          <p className="text-sm text-ink-soft">
            {detail.requestNumber}
            {detail.categoryLabel ? ` · ${detail.categoryLabel}` : ""}
          </p>
        </div>
        <StatusPill status={detail.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left: the request */}
        <div className="space-y-6">
          <Card className="space-y-1">
            <h2 className="mb-2 font-display text-lg">The brief</h2>
            <Row label="Category" value={detail.categoryLabel} />
            <Row label="Scent" value={detail.scent} />
            <Row label="Colour" value={detail.colour} />
            <Row label="Size / vessel" value={detail.size} />
            <Row label="Occasion" value={detail.occasion} />
            <Row label="Quantity" value={String(detail.quantity)} />
            {detail.notes && (
              <div className="border-t border-cream-2 pt-3">
                <p className="text-sm text-ink-soft">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink">
                  {detail.notes}
                </p>
              </div>
            )}
          </Card>

          {detail.referenceImages && detail.referenceImages.length > 0 && (
            <Card className="space-y-3">
              <h2 className="font-display text-lg">Reference images</h2>
              <div className="flex flex-wrap gap-3">
                {detail.referenceImages.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-24 w-24 overflow-hidden rounded-xl border border-cream-3"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </a>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right: contact + actions */}
        <div className="space-y-6">
          <Card className="space-y-3">
            <h2 className="font-display text-lg">Customer</h2>
            <Row label="Name" value={detail.name} />
            <Row label="Email" value={<a href={`mailto:${detail.email}`} className="text-olive">{detail.email}</a>} />
            <Row label="Phone" value={detail.phone} />
            <Row label="Received" value={fmtDate(detail.createdAt)} />
            <a
              href={waChat}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              <MessageCircle size={16} /> Message on WhatsApp
            </a>
          </Card>

          {/* Quote summary once quoted */}
          {detail.quotedPriceZAR != null && (
            <Card className="space-y-1">
              <h2 className="mb-2 font-display text-lg">Quote</h2>
              <Row label="Total" value={formatZAR(detail.quotedPriceZAR)} />
              {detail.depositRequired && detail.depositZAR != null && (
                <>
                  <Row
                    label="Deposit"
                    value={`${formatZAR(detail.depositZAR)}${detail.depositPaidAt ? " · paid" : " · unpaid"}`}
                  />
                  <Row
                    label="Balance"
                    value={`${formatZAR(Math.max(0, detail.quotedPriceZAR - detail.depositZAR))}${detail.balancePaidAt ? " · paid" : ""}`}
                  />
                </>
              )}
              <Row label="ETA" value={detail.etaText || fmtDate(detail.etaDate)} />
            </Card>
          )}
        </div>
      </div>

      {/* Response */}
      {!isTerminal && (
        <Card className="space-y-5">
          <h2 className="font-display text-lg">Respond</h2>

          {/* Status transitions */}
          <div className="flex flex-wrap gap-2">
            {detail.status === "quoted" && (
              <Button type="button" variant="outline" disabled={pending} onClick={() => onStatus("in_progress", "Marked in progress.")}>
                Mark in progress
              </Button>
            )}
            {detail.status === "in_progress" && (
              <Button type="button" variant="outline" disabled={pending} onClick={() => onStatus("ready", "Marked ready.")}>
                Mark ready
              </Button>
            )}
            {(detail.status === "in_progress" || detail.status === "ready") && (
              <Button type="button" variant="outline" disabled={pending} onClick={() => onStatus("completed", "Marked completed.")}>
                Mark completed
              </Button>
            )}
          </div>

          {/* Quote / re-quote */}
          {canQuote && (
            <div className="space-y-4 border-t border-cream-2 pt-5">
              <h3 className="text-sm font-medium">
                {detail.status === "quoted" ? "Update quote" : "Send a quote"}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Total price (ZAR)">
                  <Input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
                </Field>
                <Field label="ETA (text)" hint="e.g. 2–3 weeks">
                  <Input value={etaText} onChange={(e) => setEtaText(e.target.value)} placeholder="2–3 weeks" />
                </Field>
                <Field label="ETA date" hint="Optional">
                  <Input type="date" value={etaDate} onChange={(e) => setEtaDate(e.target.value)} />
                </Field>
                <div className="flex items-end">
                  <label className="flex w-full items-center justify-between gap-3 rounded-xl bg-cream-2 px-4 py-2.5">
                    <span className="text-sm font-medium">Require a deposit</span>
                    <Switch checked={depositRequired} onChange={setDepositRequired} label="Require deposit" />
                  </label>
                </div>
                {depositRequired && (
                  <Field label="Deposit (ZAR)" hint="Deducted from the total">
                    <Input inputMode="numeric" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="0" />
                  </Field>
                )}
              </div>
              <Field label="Note to customer" hint="Optional — shown in the quote email">
                <Textarea rows={2} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} />
              </Field>
              <Button type="button" disabled={pending} onClick={onQuote}>
                {pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {detail.status === "quoted" ? "Update & resend" : "Accept & send quote"}
              </Button>
            </div>
          )}

          {/* Decline (only before quoting) */}
          {detail.status === "pending" && (
            <div className="space-y-3 border-t border-cream-2 pt-5">
              <h3 className="text-sm font-medium">Decline</h3>
              <Textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="A short reason (shared with the customer)"
              />
              <Button type="button" variant="danger" disabled={pending} onClick={onDecline}>
                <X size={16} /> Decline request
              </Button>
            </div>
          )}

          <div className="border-t border-cream-2 pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="inline-flex items-center gap-1.5 text-sm text-ink-soft transition-colors hover:text-clay"
            >
              Cancel this request
            </button>
          </div>
        </Card>
      )}

      {detail.status === "declined" && detail.declineReason && (
        <Card>
          <p className="text-sm text-ink-soft">
            Declined — <span className="text-ink">{detail.declineReason}</span>
          </p>
        </Card>
      )}
    </div>
  );
}
