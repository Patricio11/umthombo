import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getAdminOrder,
  getOrderableProducts,
} from "@/server/db/admin-queries";
import { getSiteSettings } from "@/server/db/settings";
import { AdminPageHeader } from "@/components/admin/primitives";
import { OrderForm } from "@/components/admin/orders/OrderForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit order" };

export default async function EditOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [order, products, settings] = await Promise.all([
    getAdminOrder(id),
    getOrderableProducts(),
    getSiteSettings(),
  ]);
  if (!order) notFound();

  return (
    <>
      <Link
        href={`/admin/orders/${order.id}`}
        className="link-underline mb-3 inline-flex items-center gap-2 text-sm text-ink-soft"
      >
        <ArrowLeft size={16} /> {order.orderNumber}
      </Link>
      <AdminPageHeader title="Edit order" subtitle="Update items, customer or status." />
      <OrderForm
        order={order}
        products={products}
        deliveryConfig={settings.delivery}
      />
    </>
  );
}
