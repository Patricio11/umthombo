import { getAdminReviews } from "@/server/db/reviews";
import { AdminPageHeader } from "@/components/admin/primitives";
import { ReviewsModeration } from "@/components/admin/reviews/ReviewsModeration";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reviews" };

export default async function AdminReviewsPage() {
  const reviews = await getAdminReviews();
  return (
    <>
      <AdminPageHeader
        title="Reviews"
        subtitle="Approve customer reviews before they appear on the shop."
      />
      <ReviewsModeration reviews={reviews} />
    </>
  );
}
