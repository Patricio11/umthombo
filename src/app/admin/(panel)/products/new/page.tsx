import { AdminPageHeader } from "@/components/admin/primitives";
import { ProductForm } from "@/components/admin/products/ProductForm";
import { getCategories } from "@/server/db/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const categories = await getCategories();
  return (
    <>
      <AdminPageHeader title="New product" subtitle="Add something to the shop." />
      <ProductForm categories={categories} />
    </>
  );
}
