import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Truck, MapPin } from "lucide-react";
import { requireUser } from "@/server/auth/guard";
import { getUserOrder } from "@/server/db/account-orders";
import { StatusBadge, PaymentBadge } from "@/components/admin/primitives";
import { ReorderButton } from "@/components/account/ReorderButton";
import { formatZAR } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Order",
  robots: { index: false, follow: false },
};

const fmtDate = (d: Date | string) =>
  new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(d));

export default async function AccountOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser(`/account/orders/${id}`);
  const order = await getUserOrder(id, user.id);
  if (!order) notFound();

  const discount =
    order.subtotalZAR - (order.totalZAR - order.deliveryFeeZAR);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/account/orders"
          className="link-underline inline-flex items-center gap-2 text-sm text-ink-soft"
        >
          <ArrowLeft size={16} /> Your orders
        </Link>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl tracking-tight">
              {order.orderNumber}
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              {fmtDate(order.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <PaymentBadge status={order.paymentStatus} />
            <StatusBadge status={order.status} />
          </div>
        </div>
      </div>

      <ReorderButton orderId={order.id} />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Items + totals */}
        <div className="rounded-2xl border border-cream-3 bg-cream p-6 lg:col-span-2">
          <h2 className="font-display text-xl">Items</h2>
          <ul className="mt-4 divide-y divide-cream-2">
            {order.items.map((it, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium">{it.name}</p>
                  <p className="text-xs text-ink-soft">
                    {it.variant ? `${it.variant} · ` : ""}
                    {it.qty} × {formatZAR(it.unitPriceZAR)}
                  </p>
                </div>
                <span className="shrink-0 tabular-nums">
                  {formatZAR(it.lineTotalZAR)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1.5 border-t border-cream-2 pt-4 text-sm">
            <Row label="Subtotal" value={formatZAR(order.subtotalZAR)} muted />
            {order.ownContainer && discount > 0 && (
              <Row label="Own container · 10% off" value={`−${formatZAR(discount)}`} accent />
            )}
            {order.method === "delivery" && (
              <Row
                label={order.shippingService || "Delivery"}
                value={formatZAR(order.deliveryFeeZAR)}
                muted
              />
            )}
            {order.method === "collection" && (
              <Row label="Collection" value="Free" muted />
            )}
            <div className="flex justify-between pt-1 font-display text-xl">
              <span>Total</span>
              <span className="tabular-nums">{formatZAR(order.totalZAR)}</span>
            </div>
          </div>
        </div>

        {/* Delivery / tracking */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-cream-3 bg-cream p-6">
            <h2 className="font-display text-xl">
              {order.method === "delivery" ? "Delivery" : "Collection"}
            </h2>
            {order.method === "delivery" ? (
              <div className="mt-3 space-y-2 text-sm">
                {order.shippingAddress && (
                  <p className="flex items-start gap-2 text-ink-soft">
                    <MapPin size={16} className="mt-0.5 shrink-0 text-taupe" />
                    <span className="whitespace-pre-line text-ink">
                      {order.shippingAddress}
                    </span>
                  </p>
                )}
                {order.shipmentStatus && (
                  <p className="text-ink-soft">
                    Status: <span className="text-ink">{order.shipmentStatus}</span>
                  </p>
                )}
                {order.trackingUrl ? (
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-olive px-4 py-2 text-sm font-medium text-cream transition-colors hover:bg-olive-soft"
                  >
                    <Truck size={15} /> Track parcel
                  </a>
                ) : (
                  <p className="text-ink-soft">
                    We’ll add tracking here once your parcel ships.
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-sm text-ink-soft">
                We’ll confirm a collection time with you.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
  accent,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex justify-between ${
        accent ? "text-olive" : muted ? "text-ink-soft" : "text-ink"
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
