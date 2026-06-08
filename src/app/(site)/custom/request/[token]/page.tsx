import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getCustomRequestByToken } from "@/server/db/queries";
import { getCurrentUser } from "@/server/auth/guard";
import { StatusPill } from "@/components/admin/custom-requests/StatusPill";
import { PayButton } from "@/components/custom/PayButton";
import { formatZAR } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Your custom request",
  robots: { index: false, follow: false },
};

const fmtDate = (d: Date | string | null) =>
  d ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(d)) : null;

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className="text-right text-ink">{value}</span>
    </div>
  );
}

export default async function CustomRequestStatusPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string; failed?: string }>;
}) {
  const { token } = await params;
  const { paid, failed } = await searchParams;
  const [r, user] = await Promise.all([
    getCustomRequestByToken(token),
    getCurrentUser(),
  ]);
  if (!r) notFound();

  const balance =
    r.quotedPriceZAR != null && r.depositZAR != null
      ? Math.max(0, r.quotedPriceZAR - r.depositZAR)
      : null;

  const canPayDeposit =
    r.status === "quoted" && r.depositRequired && !r.depositPaidAt;
  const canPayBalance = r.status === "ready" && !r.balancePaidAt;

  return (
    <section className="px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-xl">
        <p className="eyebrow text-olive">Your custom request</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-3xl sm:text-4xl">{r.title}</h1>
          <StatusPill status={r.status} />
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          {r.requestNumber}
          {r.categoryLabel ? ` · ${r.categoryLabel}` : ""}
        </p>

        {paid && (
          <p className="mt-6 rounded-xl bg-olive/12 px-4 py-3 text-sm text-olive">
            Payment received — thank you! We’re confirming it now; this page
            updates in a moment.
          </p>
        )}
        {failed && (
          <p className="mt-6 rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay">
            That payment wasn’t completed. You can try again below.
          </p>
        )}

        {/* Quote */}
        {r.quotedPriceZAR != null && (
          <div className="mt-8 rounded-2xl border border-cream-3 bg-cream p-6">
            <h2 className="font-display text-xl">Your quote</h2>
            <div className="mt-3">
              <Row label="Total" value={formatZAR(r.quotedPriceZAR)} />
              {r.depositRequired && r.depositZAR != null && (
                <>
                  <Row
                    label="Deposit to begin"
                    value={`${formatZAR(r.depositZAR)}${r.depositPaidAt ? " · paid ✓" : ""}`}
                  />
                  {balance != null && (
                    <Row
                      label="Balance later"
                      value={`${formatZAR(balance)}${r.balancePaidAt ? " · paid ✓" : ""}`}
                    />
                  )}
                </>
              )}
              <Row label="Estimated time" value={r.etaText || fmtDate(r.etaDate)} />
            </div>
            {canPayDeposit && r.depositZAR != null && (
              <PayButton
                token={token}
                kind="deposit"
                label={`Pay deposit · ${formatZAR(r.depositZAR)}`}
              />
            )}
            {canPayBalance && balance != null && (
              <PayButton
                token={token}
                kind="balance"
                label={`Pay balance · ${formatZAR(balance)}`}
              />
            )}
            {r.balancePaidAt && (
              <p className="mt-4 rounded-xl bg-olive/12 px-4 py-3 text-sm text-olive">
                Paid in full — thank you. ✓
              </p>
            )}
          </div>
        )}

        {r.status === "declined" && r.declineReason && (
          <div className="mt-8 rounded-2xl border border-cream-3 bg-cream p-6">
            <p className="text-sm text-ink-soft">
              Unfortunately we couldn’t take this one on.
            </p>
            <p className="mt-1 text-sm text-ink">{r.declineReason}</p>
          </div>
        )}

        {/* The brief */}
        <div className="mt-8 rounded-2xl border border-cream-3 bg-cream p-6">
          <h2 className="font-display text-xl">Your brief</h2>
          <div className="mt-3">
            <Row label="Scent" value={r.scent} />
            <Row label="Colour" value={r.colour} />
            <Row label="Size / vessel" value={r.size} />
            <Row label="Occasion" value={r.occasion} />
            <Row label="Quantity" value={String(r.quantity)} />
            <Row label="Submitted" value={fmtDate(r.createdAt)} />
          </div>
          {r.notes && (
            <p className="mt-3 whitespace-pre-wrap border-t border-cream-2 pt-3 text-sm leading-relaxed text-ink-soft">
              {r.notes}
            </p>
          )}
        </div>

        {user ? (
          <div className="mt-10 rounded-2xl border border-cream-3 bg-cream p-6 text-center">
            <p className="text-sm text-ink-soft">
              Manage this and all your requests in one place.
            </p>
            <Link
              href="/account/requests"
              className="mt-4 inline-flex items-center justify-center rounded-full bg-olive px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-olive-soft"
            >
              Go to your requests
            </Link>
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-cream-3 bg-cream p-6 text-center">
            <p className="font-medium text-ink">
              This request is saved to your account
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
              Log in to track all your requests, see quotes and pay deposits in
              one place.
            </p>
            <Link
              href="/login?next=/account/requests"
              className="mt-4 inline-flex items-center justify-center rounded-full bg-olive px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-olive-soft"
            >
              Log in
            </Link>
            <p className="mt-3 text-xs text-ink-soft">
              First time? Check your email for a link to set your password.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
