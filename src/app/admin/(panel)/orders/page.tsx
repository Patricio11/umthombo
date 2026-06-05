import { getAdminOrders } from "@/server/db/admin-queries";
import { AdminPageHeader } from "@/components/admin/primitives";
import { OrdersTable } from "@/components/admin/orders/OrdersTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  const orders = await getAdminOrders();
  return (
    <>
      <AdminPageHeader title="Orders" subtitle="Everything customers have ordered." />
      <OrdersTable orders={orders} />
    </>
  );
}
