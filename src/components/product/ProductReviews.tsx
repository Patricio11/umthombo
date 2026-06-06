import { Stars } from "@/components/product/Stars";
import { ReviewForm } from "@/components/product/ReviewForm";
import type { PublicReview, ReviewStats } from "@/server/db/reviews";

const fmtDate = (d: Date | string) =>
  new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(d));

export function ProductReviews({
  productId,
  stats,
  reviews,
}: {
  productId: string;
  stats: ReviewStats;
  reviews: PublicReview[];
}) {
  return (
    <section id="reviews" className="mt-24 border-t border-cream-2 pt-16">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="font-display text-3xl font-light tracking-tight lg:text-4xl">
          Reviews
        </h2>
        {stats.count > 0 && (
          <div className="flex items-center gap-2.5">
            <Stars value={stats.avg} size={20} />
            <span className="text-sm text-ink-soft">
              {stats.avg.toFixed(1)} · {stats.count} review
              {stats.count === 1 ? "" : "s"}
            </span>
          </div>
        )}
      </div>

      {stats.count === 0 ? (
        <p className="mt-6 text-ink-soft">No reviews yet.</p>
      ) : (
        <ul className="mt-8 space-y-7">
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-cream-2 pb-7 last:border-0">
              <Stars value={r.rating} />
              {r.title && (
                <p className="mt-2 font-medium text-ink">{r.title}</p>
              )}
              <p className="mt-1.5 leading-relaxed text-ink-soft">{r.body}</p>
              <p className="mt-2 text-xs text-ink-soft">
                - {r.authorName}, {fmtDate(r.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}

      <ReviewForm productId={productId} />
    </section>
  );
}
