import Link from "next/link";
import { BookOpen } from "lucide-react";

/** Shown when the journal has no published posts yet. */
export function EmptyJournal() {
  return (
    <section className="px-5 pb-32 sm:px-8">
      <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-cream-3 bg-cream py-16 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-cream-2 text-olive">
          <BookOpen size={26} />
        </span>
        <h2 className="mt-5 font-display text-2xl">Stories on the way.</h2>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-soft">
          We’re writing our first journal entries — candle care, gift guides and
          the making of our pieces. Check back soon.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-olive transition-colors hover:text-olive-soft"
        >
          Explore the shop
        </Link>
      </div>
    </section>
  );
}
