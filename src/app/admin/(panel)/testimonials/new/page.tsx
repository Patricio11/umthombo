import { AdminPageHeader } from "@/components/admin/primitives";
import { TestimonialForm } from "@/components/admin/testimonials/TestimonialForm";

export const metadata = { title: "New testimonial" };

export default function NewTestimonialPage() {
  return (
    <>
      <AdminPageHeader title="New testimonial" subtitle="Add a kind word." />
      <TestimonialForm />
    </>
  );
}
