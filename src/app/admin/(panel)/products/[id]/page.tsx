import { notFound } from "next/navigation";
import { getAdminProduct } from "@/server/db/admin-queries";
import { getCategories } from "@/server/db/queries";
import { AdminPageHeader } from "@/components/admin/primitives";
import { ProductForm } from "@/components/admin/products/ProductForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    getAdminProduct(id),
    getCategories(),
  ]);
  if (!product) notFound();

  return (
    <>
      <AdminPageHeader title={`Edit ${product.name}`} subtitle="Update this product." />
      <ProductForm product={product} categories={categories} />
    </>
  );
}
