import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { site } from "@/data/site";
import { canonical } from "@/lib/seo";
import { PageHeader } from "@/components/layout/PageHeader";
import { PostCard } from "@/components/journal/PostCard";
import { tagLabel } from "@/lib/journal";
import { getPostsByTagSlug } from "@/server/db/journal";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { label } = await getPostsByTagSlug(slug);
  const name = label || tagLabel(slug);
  return {
    title: `${name} · Journal`,
    description: `Journal entries on ${name.toLowerCase()} from ${site.name} — handmade candles & skincare, Cape Town.`,
    ...canonical(`/journal/topic/${slug}`),
  };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { label, posts } = await getPostsByTagSlug(slug);
  const name = label || tagLabel(slug);

  return (
    <>
      <PageHeader
        eyebrow="The journal"
        title={name}
        blurb={`Everything we’ve written on ${name.toLowerCase()}.`}
      />
      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/journal"
            className="link-underline mb-10 inline-flex items-center gap-2 text-sm text-ink-soft"
          >
            <ArrowLeft size={16} /> All posts
          </Link>

          {posts.length > 0 ? (
            <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((p, i) => (
                <PostCard key={p.id} post={p} index={i} />
              ))}
            </div>
          ) : (
            <p className="text-ink-soft">No posts on this topic yet.</p>
          )}
        </div>
      </section>
    </>
  );
}
