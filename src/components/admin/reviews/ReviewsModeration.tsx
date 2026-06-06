"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, X, Trash2, Star, MessageSquare } from "lucide-react";
import type { AdminReview } from "@/server/db/reviews";
import { EmptyState } from "@/components/admin/primitives";
import { useToast } from "@/components/admin/Toast";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { setReviewStatus, deleteReview } from "@/server/actions/reviews";
import { cn } from "@/lib/utils";

type Filter = "pending" | "published" | "rejected" | "all";
const FILTERS: Filter[] = ["pending", "published", "rejected", "all"];

const statusStyle: Record<string, string> = {
  pending: "bg-taupe/20 text-taupe",
  published: "bg-olive/15 text-olive",
  rejected: "bg-clay/12 text-clay",
};

function MiniStars({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={13}
          className={i <= n ? "fill-clay text-clay" : "fill-none text-cream-3"}
        />
      ))}
    </span>
  );
}

export function ReviewsModeration({ reviews }: { reviews: AdminReview[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<Filter>("pending");
  const [pending, start] = useTransition();

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: reviews.length, pending: 0, published: 0, rejected: 0 };
    for (const r of reviews) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [reviews]);

  const rows = useMemo(
    () => (filter === "all" ? reviews : reviews.filter((r) => r.status === filter)),
    [reviews, filter]
  );

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    start(async () => {
      const res = await fn();
      if (res.ok) toast.success(ok);
      else toast.error(res.error ?? "Something went wrong.");
      router.refresh();
    });

  const onDelete = async (r: AdminReview) => {
    const yes = await confirm({
      title: "Delete this review?",
      description: "This permanently removes it. This can’t be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (yes) run(() => deleteReview(r.id), "Review deleted.");
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition-colors",
              filter === f ? "bg-olive text-cream" : "bg-cream-2 text-ink-soft hover:text-ink"
            )}
          >
            {f} <span className="tabular-nums opacity-70">{counts[f] ?? 0}</span>
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<MessageSquare size={26} />}
          title="Nothing here"
          description={filter === "pending" ? "No reviews awaiting moderation." : "No reviews in this view."}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="rounded-2xl border border-cream-3 bg-cream p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <MiniStars n={r.rating} />
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                        statusStyle[r.status]
                      )}
                    >
                      {r.status}
                    </span>
                  </div>
                  {r.title && <p className="mt-1.5 font-medium text-ink">{r.title}</p>}
                  <p className="mt-1 text-sm text-ink-soft">{r.body}</p>
                  <p className="mt-2 text-xs text-ink-soft">
                    {r.authorName} ·{" "}
                    {r.productSlug ? (
                      <Link
                        href={`/product/${r.productSlug}`}
                        className="link-underline"
                        target="_blank"
                      >
                        {r.productName}
                      </Link>
                    ) : (
                      r.productName
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-cream-2 pt-3">
                {r.status !== "published" && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => setReviewStatus(r.id, "published"), "Published.")}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-olive transition-colors hover:bg-olive/10"
                  >
                    <Check size={13} /> Publish
                  </button>
                )}
                {r.status !== "rejected" && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => run(() => setReviewStatus(r.id, "rejected"), "Rejected.")}
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-cream-2"
                  >
                    <X size={13} /> Reject
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDelete(r)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-clay/10 hover:text-clay"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
