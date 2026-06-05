import Link from "next/link";
import { Plus } from "lucide-react";
import { getAdminOrders } from "@/server/db/admin-queries";
import { AdminPageHeader } from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import { OrdersTable } from "@/components/admin/orders/OrdersTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Orders" };

export default async function OrdersPage() {
  const orders = await getAdminOrders();
  return (
    <>
      <AdminPageHeader
        title="Orders"
        subtitle="Everything customers have ordered."
        action={
          <Link href="/admin/orders/new">
            <Button size="sm">
              <Plus size={16} /> New order
            </Button>
          </Link>
        }
      />
      <OrdersTable orders={orders} />
    </>
  );
}
