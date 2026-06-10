import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { site } from "@/data/site";
import { canonical, articleLd, breadcrumbLd, absUrl } from "@/lib/seo";
import { Markdown } from "@/components/journal/Markdown";
import { PostCard } from "@/components/journal/PostCard";
import { ShareButtons } from "@/components/journal/ShareButtons";
import { ReadingProgress } from "@/components/journal/ReadingProgress";
import { FadeImage } from "@/components/journal/FadeImage";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/motion/Reveal";
import { formatDate } from "@/lib/format";
import { tagSlug } from "@/lib/journal";
import { getPostBySlug, getRelatedPosts } from "@/server/db/journal";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  const title = post.seoTitle ?? post.title;
  const description = post.seoDescription ?? post.excerpt;
  return {
    title,
    description,
    ...canonical(`/journal/${post.slug}`),
    openGraph: {
      type: "article",
      title: `${post.title} · ${site.name}`,
      description,
      url: `${site.url}/journal/${post.slug}`,
      ...(post.coverImage
        ? { images: [{ url: post.coverImage, alt: post.coverAlt || post.title }] }
        : {}),
      publishedTime: (post.publishedAt ?? post.createdAt).toISOString(),
      modifiedTime: post.updatedAt.toISOString(),
    },
    twitter: {
      card: "summary_large_image",
      title: `${post.title} · ${site.name}`,
      description,
      ...(post.coverImage ? { images: [post.coverImage] } : {}),
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const related = await getRelatedPosts(post.slug, post.tags, 3);
  const url = absUrl(`/journal/${post.slug}`);

  const jsonLd = articleLd(post);
  const breadcrumb = breadcrumbLd([
    { name: "Home", path: "/" },
    { name: "Journal", path: "/journal" },
    { name: post.title, path: `/journal/${post.slug}` },
  ]);

  return (
    <article className="px-5 pb-24 pt-28 sm:px-8 sm:pt-36">
      <ReadingProgress />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <div className="mx-auto max-w-3xl">
        <Link
          href="/journal"
          className="group inline-flex items-center gap-2 text-sm text-ink-soft transition-colors hover:text-ink"
        >
          <ArrowLeft
            size={16}
            className="transition-transform duration-300 group-hover:-translate-x-0.5"
          />
          The journal
        </Link>

        <Reveal>
          <header className="mt-8">
            {post.tags[0] && (
              <Link
                href={`/journal/topic/${tagSlug(post.tags[0])}`}
                className="eyebrow inline-block rounded-full bg-olive/10 px-3 py-1 text-olive transition-colors hover:bg-olive/15"
              >
                {post.tags[0]}
              </Link>
            )}
            <h1 className="mt-5 font-display text-4xl font-light leading-[1.02] tracking-tight lg:text-6xl">
              {post.title}
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-taupe">
              <span>{post.authorName}</span>
              <span className="text-cream-3">•</span>
              <time>{formatDate(post.publishedAt)}</time>
              <span className="text-cream-3">•</span>
              <span>{post.readingMinutes} min read</span>
            </div>
          </header>
        </Reveal>

        {post.coverImage && (
          <Reveal delay={0.05}>
            <div className="relative mt-10 aspect-[3/2] overflow-hidden rounded-3xl bg-cream-2 shadow-[0_30px_70px_-35px_rgba(42,36,32,0.45)]">
              <FadeImage
                src={post.coverImage}
                alt={post.coverAlt || post.title}
                fill
                sizes="(max-width: 768px) 100vw, 768px"
                priority
                className="object-cover"
              />
            </div>
          </Reveal>
        )}

        <Reveal delay={0.05} className="mt-12">
          <Markdown>{post.body}</Markdown>
        </Reveal>

        {/* Tags + share */}
        <div className="mt-14 flex flex-col gap-5 border-t border-cream-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((t) => (
                <Link
                  key={t}
                  href={`/journal/topic/${tagSlug(t)}`}
                  className="rounded-full bg-cream-2 px-3 py-1 text-sm text-ink-soft transition-colors hover:bg-olive/10 hover:text-olive"
                >
                  {t}
                </Link>
              ))}
            </div>
          )}
          <ShareButtons url={url} title={post.title} />
        </div>

        {/* End-of-article invitation */}
        <Reveal className="mt-16">
          <aside className="overflow-hidden rounded-3xl border border-cream-3 bg-cream-2/50 px-8 py-10 text-center sm:px-12">
            <p className="eyebrow text-olive">Made by hand, for you</p>
            <h2 className="mx-auto mt-3 max-w-md font-display text-3xl font-light leading-tight">
              Bring your own idea to life.
            </h2>
            <p className="mx-auto mt-3 max-w-sm leading-relaxed text-ink-soft">
              Choose your scent, colour and vessel — we’ll make it to order in
              Cape Town and deliver across South Africa.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              <Link href="/custom">
                <Button>Start a custom piece</Button>
              </Link>
              <Link
                href="/shop"
                className="group inline-flex items-center gap-2 text-sm font-medium text-ink transition-colors hover:text-olive"
              >
                Explore the shop
                <ArrowRight
                  size={16}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
            </div>
          </aside>
        </Reveal>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="mx-auto mt-24 max-w-7xl">
          <div className="mb-10 flex items-center gap-4">
            <h2 className="font-display text-2xl">More from the journal</h2>
            <span className="h-px flex-1 bg-cream-3" />
            <Link
              href="/journal"
              className="shrink-0 text-sm text-ink-soft transition-colors hover:text-olive"
            >
              All posts
            </Link>
          </div>
          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p, i) => (
              <PostCard key={p.id} post={p} index={i} />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}
