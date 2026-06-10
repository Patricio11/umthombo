import Link from "next/link";
import { Package, ChevronRight, Truck } from "lucide-react";
import { requireUser } from "@/server/auth/guard";
import { getUserOrders, linkGuestOrdersByEmail } from "@/server/db/account-orders";
import { StatusBadge, PaymentBadge } from "@/components/admin/primitives";
import { formatZAR } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "My orders",
  robots: { index: false, follow: false },
};

const fmtDate = (d: Date | string) =>
  new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(d));

export default async function AccountOrdersPage() {
  const user = await requireUser("/account/orders");
  // Claim any guest orders placed with this verified email.
  await linkGuestOrdersByEmail(user.id, user.email);
  const orders = await getUserOrders(user.id);

  return (
    <>
      <h1 className="font-display text-3xl sm:text-4xl">Your orders</h1>
      <p className="mt-2 text-ink-soft">Track, view and reorder.</p>

      {orders.length === 0 ? (
        <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-cream-3 bg-cream px-6 py-16 text-center">
          <Package size={28} className="text-taupe" />
          <p className="mt-4 font-medium text-ink">No orders yet</p>
          <p className="mt-1 max-w-xs text-sm text-ink-soft">
            When you place an order it’ll appear here.
          </p>
          <Link
            href="/shop"
            className="mt-6 inline-flex items-center justify-center rounded-full border border-ink/20 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-olive hover:text-olive"
          >
            Browse the shop
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/account/orders/${o.id}`}
                className="group flex items-center justify-between gap-4 rounded-2xl border border-cream-3 bg-cream p-5 transition-colors hover:border-olive/40"
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-cream-2">
                    {o.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={o.image} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                  <p className="font-medium text-ink">{o.orderNumber}</p>
                  <p className="text-xs text-ink-soft">
                    {fmtDate(o.createdAt)} · {o.itemCount} item
                    {o.itemCount === 1 ? "" : "s"}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <PaymentBadge status={o.paymentStatus} />
                    <StatusBadge status={o.status} />
                    {o.trackingUrl && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-mist/20 px-2.5 py-1 text-xs font-medium text-[#3f5a73]">
                        <Truck size={11} />{" "}
                        {o.shipmentStatus || "On its way"}
                      </span>
                    )}
                  </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="font-display text-lg tabular-nums">
                    {formatZAR(o.totalZAR)}
                  </span>
                  <ChevronRight
                    size={18}
                    className="text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:text-olive"
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
