import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, MapPin, Truck } from "lucide-react";
import { getAdminOrder } from "@/server/db/admin-queries";
import { Card, StatusBadge } from "@/components/admin/primitives";
import { OrderStatusControl } from "@/components/admin/orders/OrderStatusControl";
import { WhatsAppIcon } from "@/components/brand/SocialIcons";
import { formatZAR } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Order" };

function waLink(phone: string): string {
  let digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  else if (digits.startsWith("0")) digits = "27" + digits.slice(1);
  return `https://wa.me/${digits}`;
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getAdminOrder(id);
  if (!order) notFound();

  const placed = new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "full",
    timeStyle: "short",
  }).format(new Date(order.createdAt));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/orders"
          className="link-underline inline-flex items-center gap-2 text-sm text-ink-soft"
        >
          <ArrowLeft size={16} /> Orders
        </Link>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-3xl tracking-tight">
              {order.orderNumber}
            </h1>
            <p className="mt-1 text-sm text-ink-soft">{placed}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Items + totals */}
        <Card className="lg:col-span-2">
          <h2 className="font-display text-xl">Items</h2>
          <ul className="mt-4 divide-y divide-cream-2">
            {order.items.map((it) => (
              <li key={it.id} className="flex items-center justify-between gap-3 py-3">
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
            <div className="flex justify-between text-ink-soft">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatZAR(order.subtotalZAR)}</span>
            </div>
            {order.ownContainer && (
              <div className="flex justify-between text-olive">
                <span>Own container · 10% off</span>
                <span className="tabular-nums">
                  −{formatZAR(order.subtotalZAR - order.totalZAR)}
                </span>
              </div>
            )}
            <div className="flex justify-between pt-1 font-display text-xl">
              <span>Total</span>
              <span className="tabular-nums">{formatZAR(order.totalZAR)}</span>
            </div>
          </div>
        </Card>

        {/* Customer + actions */}
        <div className="space-y-6">
          <Card className="space-y-4">
            <h2 className="font-display text-xl">{order.customerName}</h2>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2.5">
                <Mail size={16} className="text-taupe" />
                <a href={`mailto:${order.customerEmail}`} className="link-underline">
                  {order.customerEmail}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone size={16} className="text-taupe" />
                {order.customerPhone}
              </li>
              <li className="flex items-center gap-2.5 capitalize text-ink-soft">
                {order.method === "collection" ? (
                  <MapPin size={16} className="text-taupe" />
                ) : (
                  <Truck size={16} className="text-taupe" />
                )}
                {order.method}
              </li>
            </ul>
            {order.note && (
              <p className="rounded-xl bg-cream-2 px-3.5 py-3 text-sm text-ink-soft">
                “{order.note}”
              </p>
            )}
            <a
              href={waLink(order.customerPhone)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-olive px-5 py-2.5 text-sm font-medium text-cream transition-colors hover:bg-olive-soft"
            >
              <WhatsAppIcon size={17} /> Reply on WhatsApp
            </a>
          </Card>

          <Card>
            <OrderStatusControl id={order.id} current={order.status} />
          </Card>
        </div>
      </div>
    </div>
  );
}
