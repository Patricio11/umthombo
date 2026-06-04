import Link from "next/link";
import { Plus } from "lucide-react";
import { getAdminProducts } from "@/server/db/admin-queries";
import { AdminPageHeader } from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import { ProductsTable } from "@/components/admin/products/ProductsTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Products" };

export default async function ProductsPage() {
  const products = await getAdminProducts();
  return (
    <>
      <AdminPageHeader
        title="Products"
        subtitle="Everything in your shop."
        action={
          <Link href="/admin/products/new">
            <Button size="sm">
              <Plus size={16} /> New product
            </Button>
          </Link>
        }
      />
      <ProductsTable products={products} />
    </>
  );
}
