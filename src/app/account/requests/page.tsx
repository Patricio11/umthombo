import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { requireUser } from "@/server/auth/guard";
import { getUserCustomRequests } from "@/server/db/queries";
import { StatusPill } from "@/components/admin/custom-requests/StatusPill";
import { PayButton } from "@/components/custom/PayButton";
import { formatZAR } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "My custom requests",
  robots: { index: false, follow: false },
};

const fmtDate = (d: Date | string) =>
  new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(d));

export default async function AccountRequestsPage() {
  const user = await requireUser("/account/requests");
  const requests = await getUserCustomRequests(user.id);

  return (
    <>
      <h1 className="font-display text-3xl sm:text-4xl">Your custom requests</h1>
      <p className="mt-2 text-ink-soft">
        Track your bespoke commissions, view quotes and settle deposits.
      </p>

      {requests.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-cream-3 bg-cream px-6 py-16 text-center">
          <Sparkles size={28} className="text-taupe" />
          <p className="mt-4 font-medium text-ink">No requests yet</p>
          <p className="mt-1 max-w-xs text-sm text-ink-soft">
            Dreaming up something bespoke? Tell us and we’ll quote it.
          </p>
          <Link
            href="/custom/request"
            className="mt-6 inline-flex items-center justify-center rounded-full border border-ink/20 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-olive hover:text-olive"
          >
            Request a custom piece
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {requests.map((r) => {
            const balance =
              r.quotedPriceZAR != null && r.depositZAR != null
                ? Math.max(0, r.quotedPriceZAR - r.depositZAR)
                : r.quotedPriceZAR;
            const canPayDeposit =
              r.status === "quoted" && r.depositRequired && !r.depositPaidAt;
            const canPayBalance = r.status === "ready" && !r.balancePaidAt;

            return (
              <li
                key={r.id}
                className="rounded-2xl border border-cream-3 bg-cream p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{r.title}</p>
                    <p className="truncate text-xs text-ink-soft">
                      {r.requestNumber}
                      {r.requestType ? ` · ${r.requestType}` : ""} ·{" "}
                      {fmtDate(r.createdAt)}
                    </p>
                  </div>
                  <StatusPill status={r.status} />
                </div>

                {r.quotedPriceZAR != null && (
                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 border-t border-cream-2 pt-3 text-sm">
                    <span className="text-ink-soft">
                      Total{" "}
                      <span className="text-ink">
                        {formatZAR(r.quotedPriceZAR)}
                      </span>
                    </span>
                    {r.depositRequired && r.depositZAR != null && (
                      <span className="text-ink-soft">
                        Deposit{" "}
                        <span className="text-ink">
                          {formatZAR(r.depositZAR)}
                          {r.depositPaidAt ? " ✓" : ""}
                        </span>
                      </span>
                    )}
                    {r.etaText && (
                      <span className="text-ink-soft">
                        ETA <span className="text-ink">{r.etaText}</span>
                      </span>
                    )}
                  </div>
                )}

                {canPayDeposit && r.depositZAR != null && (
                  <PayButton
                    token={r.statusToken}
                    kind="deposit"
                    label={`Pay deposit · ${formatZAR(r.depositZAR)}`}
                  />
                )}
                {canPayBalance && balance != null && (
                  <PayButton
                    token={r.statusToken}
                    kind="balance"
                    label={`Pay balance · ${formatZAR(balance)}`}
                  />
                )}

                <div className="mt-3">
                  <Link
                    href={`/custom/request/${r.statusToken}`}
                    className="inline-flex items-center gap-1 text-sm text-olive hover:text-olive-soft"
                  >
                    View details <ArrowRight size={14} />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
