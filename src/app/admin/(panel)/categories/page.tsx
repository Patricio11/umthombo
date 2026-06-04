import Link from "next/link";
import { Plus } from "lucide-react";
import { getAdminCategories } from "@/server/db/admin-queries";
import { AdminPageHeader } from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import { CategoriesTable } from "@/components/admin/categories/CategoriesTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const categories = await getAdminCategories();

  return (
    <>
      <AdminPageHeader
        title="Categories"
        subtitle="The taxonomy your shop is organised by."
        action={
          <Link href="/admin/categories/new">
            <Button size="sm">
              <Plus size={16} /> New category
            </Button>
          </Link>
        }
      />
      <CategoriesTable categories={categories} />
    </>
  );
}
