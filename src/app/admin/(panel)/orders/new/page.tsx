import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getOrderableProducts } from "@/server/db/admin-queries";
import { AdminPageHeader } from "@/components/admin/primitives";
import { OrderForm } from "@/components/admin/orders/OrderForm";
import { getSiteSettings } from "@/server/db/settings";

export const dynamic = "force-dynamic";
export const metadata = { title: "New order" };

export default async function NewOrderPage() {
  const [products, settings] = await Promise.all([
    getOrderableProducts(),
    getSiteSettings(),
  ]);
  return (
    <>
      <Link
        href="/admin/orders"
        className="link-underline mb-3 inline-flex items-center gap-2 text-sm text-ink-soft"
      >
        <ArrowLeft size={16} /> Orders
      </Link>
      <AdminPageHeader title="New order" subtitle="Record a phone or walk-in order." />
      <OrderForm products={products} rule={settings.containerDiscount} />
    </>
  );
}
