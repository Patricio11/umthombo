"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import type { PostCard as PostCardData } from "@/server/db/journal";
import { FadeImage } from "@/components/journal/FadeImage";
import { formatDate } from "@/lib/format";

export function PostCard({
  post,
  index = 0,
}: {
  post: PostCardData;
  index?: number;
}) {
  const reduce = useReducedMotion();
  const eyebrow = post.tags[0] ?? "Journal";

  return (
    <motion.article
      initial={reduce ? false : { opacity: 0, y: 22 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
        delay: (index % 3) * 0.08,
      }}
      className="group"
    >
      <Link href={`/journal/${post.slug}`} className="block">
        <div className="relative aspect-[3/2] overflow-hidden rounded-2xl bg-cream-2 shadow-[0_2px_12px_-8px_rgba(42,36,32,0.35)] transition-shadow duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:shadow-[0_26px_50px_-28px_rgba(42,36,32,0.5)]">
          {post.coverImage && (
            <FadeImage
              src={post.coverImage}
              alt={post.coverAlt || post.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-[1.04]"
            />
          )}
          <span className="absolute right-3 top-3 rounded-full bg-cream/85 px-2.5 py-1 text-[11px] font-medium text-ink backdrop-blur-sm">
            {post.readingMinutes} min
          </span>
        </div>

        <div className="mt-4 px-0.5">
          <p className="eyebrow text-olive">{eyebrow}</p>
          <h3 className="mt-1.5 font-display text-2xl leading-tight">
            <span
              className="bg-[length:0%_1px] bg-bottom bg-no-repeat transition-[background-size] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:bg-[length:100%_1px]"
              style={{
                backgroundImage: "linear-gradient(currentColor,currentColor)",
              }}
            >
              {post.title}
            </span>
          </h3>
          {post.excerpt && (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-soft">
              {post.excerpt}
            </p>
          )}
          <p className="mt-3 text-xs uppercase tracking-wide text-taupe">
            {formatDate(post.publishedAt)}
          </p>
        </div>
      </Link>
    </motion.article>
  );
}
