import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { getOrderConfirmation } from "@/server/db/order-public";
import { ClearCartOnMount } from "@/components/checkout/ClearCartOnMount";
import { formatZAR } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Order confirmed",
  robots: { index: false, follow: false },
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderNumber } = await searchParams;
  if (!orderNumber) notFound();

  const order = await getOrderConfirmation(orderNumber);
  if (!order) notFound();

  const paid = order.paymentStatus === "paid";

  return (
    <section className="px-5 py-16 sm:px-8 lg:py-24">
      <ClearCartOnMount />
      <div className="mx-auto max-w-xl text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-olive text-cream">
          <Check size={30} />
        </span>
        <p className="eyebrow mt-6 text-olive">
          {paid ? "Payment received" : "Order placed"}
        </p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">Thank you!</h1>
        <p className="mt-3 text-ink-soft">
          {paid
            ? "Your payment is in and we’re getting your order ready."
            : "We’ve received your order. We’ll be in touch to confirm everything."}
        </p>
        <p className="mt-4 inline-block rounded-full bg-cream-2 px-4 py-1.5 text-sm">
          Order <span className="font-medium">{order.orderNumber}</span>
        </p>

        <div className="mt-10 rounded-3xl border border-cream-3 bg-cream-2/40 p-6 text-left sm:p-8">
          <h2 className="font-display text-2xl">Summary</h2>
          <ul className="mt-5 space-y-3 border-b border-cream-3 pb-5">
            {order.items.map((i, idx) => (
              <li key={idx} className="flex justify-between gap-3 text-sm">
                <span className="text-ink">
                  {i.qty} × {i.name}
                  {i.variant ? (
                    <span className="text-ink-soft"> · {i.variant}</span>
                  ) : null}
                </span>
                <span className="shrink-0 tabular-nums text-ink-soft">
                  {formatZAR(i.lineTotalZAR)}
                </span>
              </li>
            ))}
          </ul>
          <div className="space-y-2 py-5 text-sm">
            <div className="flex justify-between text-ink-soft">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatZAR(order.subtotalZAR)}</span>
            </div>
            <div className="flex justify-between text-ink-soft">
              <span>
                {order.method === "delivery"
                  ? order.shippingService || "Delivery"
                  : "Collection"}
              </span>
              <span className="tabular-nums">
                {order.method === "delivery"
                  ? formatZAR(order.deliveryFeeZAR)
                  : "Free"}
              </span>
            </div>
          </div>
          <div className="flex items-baseline justify-between border-t border-cream-3 pt-4">
            <span className="font-medium text-ink">Total</span>
            <span className="font-display text-3xl">
              {formatZAR(order.totalZAR)}
            </span>
          </div>
        </div>

        <Link
          href="/shop"
          className="mt-10 inline-flex items-center justify-center rounded-full border border-ink/25 px-7 py-3.5 text-sm font-medium text-ink transition-colors hover:border-olive hover:text-olive"
        >
          Continue shopping
        </Link>
      </div>
    </section>
  );
}
