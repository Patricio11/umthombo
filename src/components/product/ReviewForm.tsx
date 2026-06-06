"use client";

import { useEffect, useState } from "react";
import { Star, Loader2, Check } from "lucide-react";
import {
  getReviewEligibility,
  submitReview,
  type ReviewEligibility,
} from "@/server/actions/reviews";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-xl border border-cream-3 bg-cream px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 transition-colors focus:border-olive focus:outline-none";

const STATUS_LABEL: Record<string, string> = {
  pending: "Your review is awaiting approval.",
  published: "Your review is published — thank you!",
  rejected: "Your review wasn’t approved.",
};

export function ReviewForm({ productId }: { productId: string }) {
  const [state, setState] = useState<ReviewEligibility | null>(null);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    getReviewEligibility(productId)
      .then((s) => {
        if (!active) return;
        setState(s);
        if (s.myReview) {
          setRating(s.myReview.rating);
          setTitle(s.myReview.title ?? "");
          setBody(s.myReview.body);
        }
      })
      .catch(() => active && setState({ eligible: false, myReview: null }));
    return () => {
      active = false;
    };
  }, [productId]);

  if (!state) return null; // loading
  if (!state.eligible && !state.myReview) return null; // not a verified buyer

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (rating < 1) return setError("Pick a star rating.");
    if (body.trim().length < 3) return setError("Please write a little more.");
    setSaving(true);
    const res = await submitReview({
      productId,
      rating,
      title: title.trim() || undefined,
      body: body.trim(),
    });
    setSaving(false);
    if (res.ok) {
      setDone(true);
      setOpen(false);
    } else {
      setError(res.error ?? "Couldn’t submit your review.");
    }
  };

  return (
    <div className="mt-8 rounded-2xl border border-cream-3 bg-cream p-6">
      {done ? (
        <p className="flex items-center gap-2 text-sm text-olive">
          <Check size={16} /> Thanks! Your review is awaiting approval.
        </p>
      ) : state.myReview && !open ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-soft">
            {STATUS_LABEL[state.myReview.status]}
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="link-underline text-sm text-olive"
          >
            Edit your review
          </button>
        </div>
      ) : !open ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-soft">
            You bought this — share what you think.
          </p>
          <Button type="button" onClick={() => setOpen(true)}>
            Write a review
          </Button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink">
              Your rating
            </span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setRating(i)}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(0)}
                  aria-label={`${i} star${i === 1 ? "" : "s"}`}
                  className="p-0.5"
                >
                  <Star
                    size={26}
                    className={cn(
                      "transition-colors",
                      i <= (hover || rating)
                        ? "fill-clay text-clay"
                        : "fill-none text-cream-3"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className={inputCls}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What did you love? How does it smell, burn, feel?"
            rows={4}
            className={cn(inputCls, "resize-none")}
          />
          {error && (
            <p className="rounded-xl bg-clay/10 px-4 py-2.5 text-sm text-clay">
              {error}
            </p>
          )}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 size={16} className="animate-spin" />}
              Submit review
            </Button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sm text-ink-soft transition-colors hover:text-ink"
            >
              Cancel
            </button>
          </div>
          <p className="text-xs text-ink-soft">
            Reviews are checked before they appear.
          </p>
        </form>
      )}
    </div>
  );
}
