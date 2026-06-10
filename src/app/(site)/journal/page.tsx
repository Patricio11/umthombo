import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { blogLd } from "@/lib/seo";
import { PageHeader } from "@/components/layout/PageHeader";
import { PostCard } from "@/components/journal/PostCard";
import { FadeImage } from "@/components/journal/FadeImage";
import { EmptyJournal } from "@/components/journal/EmptyJournal";
import { Reveal } from "@/components/motion/Reveal";
import { formatDate } from "@/lib/format";
import {
  getFeaturedPost,
  getPublishedPosts,
  countPublishedPosts,
  getAllTags,
} from "@/server/db/journal";

export const revalidate = 300;
const PAGE_SIZE = 9;

export const metadata: Metadata = {
  title: "Journal",
  description:
    "Notes on slow craft, scent and home from Umthombo Creations — candle care, gift guides and the stories behind our handmade pieces. Cape Town, delivered across South Africa.",
  alternates: {
    canonical: "/journal",
    types: { "application/rss+xml": "/journal/rss.xml" },
  },
  openGraph: {
    title: "Journal · Umthombo Creations",
    description:
      "Notes on slow craft, scent and home — candle care, gift guides and the stories behind our handmade pieces.",
    url: "/journal",
  },
};

export default async function JournalPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [featured, total, tags] = await Promise.all([
    page === 1 ? getFeaturedPost() : Promise.resolve(null),
    countPublishedPosts(),
    getAllTags(),
  ]);

  // The featured post owns the hero on page 1, so keep it out of the grid there.
  const posts = await getPublishedPosts({
    limit: PAGE_SIZE,
    offset,
    includeFeatured: !featured,
  });

  const hasGrid = posts.length > 0 || !!featured;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        eyebrow="The journal"
        title="Notes on slow craft."
        blurb="Candle care, gift guides and the stories behind our handmade pieces — written from our Cape Town studio."
      />

      {!hasGrid ? (
        <EmptyJournal />
      ) : (
        <section className="px-5 pb-24 sm:px-8">
          <div className="mx-auto max-w-7xl">
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify(blogLd(posts)),
              }}
            />

            {/* Tag chips */}
            {tags.length > 0 && (
              <div className="mb-10 flex flex-wrap gap-2">
                {tags.slice(0, 12).map((t) => (
                  <Link
                    key={t.slug}
                    href={`/journal/topic/${t.slug}`}
                    className="rounded-full border border-cream-3 px-3.5 py-1.5 text-sm text-ink-soft transition-colors hover:border-olive hover:text-olive"
                  >
                    {t.tag}
                  </Link>
                ))}
              </div>
            )}

            {/* Featured hero (page 1) */}
            {featured && (
              <Reveal>
                <Link
                  href={`/journal/${featured.slug}`}
                  className="group mb-16 grid items-center gap-8 md:grid-cols-2 md:gap-12"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-cream-2 shadow-[0_30px_70px_-35px_rgba(42,36,32,0.45)]">
                    {featured.coverImage && (
                      <FadeImage
                        src={featured.coverImage}
                        alt={featured.coverAlt || featured.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 50vw"
                        priority
                        className="object-cover group-hover:scale-[1.04]"
                      />
                    )}
                    <span className="absolute left-4 top-4 rounded-full bg-clay px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-cream">
                      Featured
                    </span>
                  </div>
                  <div className="flex flex-col justify-center md:pr-4">
                    <p className="eyebrow text-clay">
                      {featured.tags[0] ?? "Featured"}
                    </p>
                    <h2 className="mt-3 font-display text-4xl font-light leading-[1.0] tracking-tight lg:text-5xl">
                      <span
                        className="bg-[length:0%_1px] bg-bottom bg-no-repeat transition-[background-size] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:bg-[length:100%_1px]"
                        style={{
                          backgroundImage:
                            "linear-gradient(currentColor,currentColor)",
                        }}
                      >
                        {featured.title}
                      </span>
                    </h2>
                    {featured.excerpt && (
                      <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-soft">
                        {featured.excerpt}
                      </p>
                    )}
                    <div className="mt-5 flex flex-wrap items-center gap-x-2 text-xs uppercase tracking-wide text-taupe">
                      <time>{formatDate(featured.publishedAt)}</time>
                      <span className="text-cream-3">•</span>
                      <span>{featured.readingMinutes} min read</span>
                    </div>
                    <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-olive">
                      Read the story
                      <ArrowRight
                        size={16}
                        className="transition-transform duration-300 group-hover:translate-x-1"
                      />
                    </span>
                  </div>
                </Link>
              </Reveal>
            )}

            {/* Grid */}
            {posts.length > 0 && (
              <>
                {featured && (
                  <div className="mb-10 flex items-center gap-4">
                    <h2 className="eyebrow text-ink-soft">Latest</h2>
                    <span className="h-px flex-1 bg-cream-3" />
                  </div>
                )}
                <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                  {posts.map((p, i) => (
                    <PostCard key={p.id} post={p} index={i} />
                  ))}
                </div>
              </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <nav className="mt-16 flex items-center justify-between border-t border-cream-3 pt-6 text-sm">
                {page > 1 ? (
                  <Link
                    href={page === 2 ? "/journal" : `/journal?page=${page - 1}`}
                    className="inline-flex items-center gap-2 text-ink-soft transition-colors hover:text-ink"
                  >
                    <ArrowLeft size={16} /> Newer
                  </Link>
                ) : (
                  <span />
                )}
                <span className="text-taupe">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages ? (
                  <Link
                    href={`/journal?page=${page + 1}`}
                    className="inline-flex items-center gap-2 text-ink-soft transition-colors hover:text-ink"
                  >
                    Older <ArrowRight size={16} />
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </div>
        </section>
      )}
    </>
  );
}
