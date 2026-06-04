import { AdminPageHeader } from "@/components/admin/primitives";
import { CategoryForm } from "@/components/admin/categories/CategoryForm";

export const metadata = { title: "New category" };

export default function NewCategoryPage() {
  return (
    <>
      <AdminPageHeader title="New category" subtitle="Add a way to group products." />
      <CategoryForm />
    </>
  );
}
