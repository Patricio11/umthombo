"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";
import { WhatsAppIcon } from "@/components/brand/SocialIcons";

/** Lightweight share row: WhatsApp, X, and copy-link. */
export function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const enc = encodeURIComponent;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — ignore */
    }
  };

  const linkClass =
    "inline-flex h-9 w-9 items-center justify-center rounded-full border border-cream-3 text-ink-soft transition-colors hover:border-olive hover:text-olive";

  return (
    <div className="flex items-center gap-2">
      <span className="mr-1 text-xs uppercase tracking-wide text-taupe">Share</span>
      <a
        className={linkClass}
        href={`https://wa.me/?text=${enc(`${title} ${url}`)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on WhatsApp"
      >
        <WhatsAppIcon className="h-4 w-4" />
      </a>
      <a
        className={linkClass}
        href={`https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X"
      >
        <span className="text-sm font-semibold">𝕏</span>
      </a>
      <button
        type="button"
        onClick={copy}
        className={linkClass}
        aria-label={copied ? "Link copied" : "Copy link"}
      >
        {copied ? <Check size={16} /> : <Link2 size={16} />}
      </button>
    </div>
  );
}
