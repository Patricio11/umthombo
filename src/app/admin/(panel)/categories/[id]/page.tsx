import { notFound } from "next/navigation";
import { getAdminCategory } from "@/server/db/admin-queries";
import { AdminPageHeader } from "@/components/admin/primitives";
import { CategoryForm } from "@/components/admin/categories/CategoryForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit category" };

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = await getAdminCategory(id);
  if (!category) notFound();

  return (
    <>
      <AdminPageHeader
        title={`Edit ${category.label}`}
        subtitle="Update how this category appears."
      />
      <CategoryForm category={category} />
    </>
  );
}
