import Link from "next/link";
import { Package } from "lucide-react";
import { requireUser } from "@/server/auth/guard";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "My orders",
  robots: { index: false, follow: false },
};

export default async function AccountOrdersPage() {
  await requireUser("/account/orders");
  return (
    <>
      <h1 className="font-display text-3xl sm:text-4xl">Your orders</h1>
      <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed border-cream-3 bg-cream px-6 py-16 text-center">
        <Package size={28} className="text-taupe" />
        <p className="mt-4 font-medium text-ink">Order history is coming</p>
        <p className="mt-1 max-w-xs text-sm text-ink-soft">
          Soon you’ll see every order here with tracking and one-tap reorder.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex items-center justify-center rounded-full border border-ink/20 px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-olive hover:text-olive"
        >
          Browse the shop
        </Link>
      </div>
    </>
  );
}
