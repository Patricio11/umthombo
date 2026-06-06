import Link from "next/link";
import { XCircle } from "lucide-react";
import { getOrderConfirmation } from "@/server/db/order-public";
import { formatZAR } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Payment not completed" };

export default async function CheckoutCancelledPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderNumber } = await searchParams;
  const order = orderNumber ? await getOrderConfirmation(orderNumber) : null;

  return (
    <section className="px-5 py-16 sm:px-8 lg:py-24">
      <div className="mx-auto max-w-xl text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-clay/15 text-clay">
          <XCircle size={30} />
        </span>
        <p className="eyebrow mt-6 text-clay">Payment not completed</p>
        <h1 className="mt-2 font-display text-4xl sm:text-5xl">No worries.</h1>
        <p className="mt-3 text-ink-soft">
          Your payment wasn’t completed and you haven’t been charged. Your
          selection is still saved — you can try again whenever you’re ready.
        </p>
        {order && (
          <p className="mt-4 inline-block rounded-full bg-cream-2 px-4 py-1.5 text-sm">
            Order <span className="font-medium">{order.orderNumber}</span> ·{" "}
            {formatZAR(order.totalZAR)}
          </p>
        )}

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/checkout"
            className="inline-flex items-center justify-center rounded-full bg-olive px-7 py-3.5 text-sm font-medium text-cream transition-colors hover:bg-olive-soft"
          >
            Try again
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center rounded-full border border-ink/25 px-7 py-3.5 text-sm font-medium text-ink transition-colors hover:border-olive hover:text-olive"
          >
            Back to the shop
          </Link>
        </div>
      </div>
    </section>
  );
}
