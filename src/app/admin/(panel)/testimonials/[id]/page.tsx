import { notFound } from "next/navigation";
import { getAdminTestimonial } from "@/server/db/admin-queries";
import { AdminPageHeader } from "@/components/admin/primitives";
import { TestimonialForm } from "@/components/admin/testimonials/TestimonialForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit testimonial" };

export default async function EditTestimonialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const testimonial = await getAdminTestimonial(id);
  if (!testimonial) notFound();
  return (
    <>
      <AdminPageHeader title={`Edit ${testimonial.name}`} subtitle="Update this testimonial." />
      <TestimonialForm testimonial={testimonial} />
    </>
  );
}
