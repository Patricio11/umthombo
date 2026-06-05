import Link from "next/link";
import { Plus } from "lucide-react";
import { getAdminTestimonials } from "@/server/db/admin-queries";
import { AdminPageHeader } from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import { TestimonialsTable } from "@/components/admin/testimonials/TestimonialsTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "Testimonials" };

export default async function TestimonialsPage() {
  const testimonials = await getAdminTestimonials();
  return (
    <>
      <AdminPageHeader
        title="Testimonials"
        subtitle="Kind words shown on the home page."
        action={
          <Link href="/admin/testimonials/new">
            <Button size="sm">
              <Plus size={16} /> New testimonial
            </Button>
          </Link>
        }
      />
      <TestimonialsTable testimonials={testimonials} />
    </>
  );
}
