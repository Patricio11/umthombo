"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

/**
 * next/image that fades in once it has decoded — turns the abrupt "pop" into a
 * soft develop over the cream placeholder. Combines opacity + transform in one
 * transition so callers can still add a `group-hover:scale-*` zoom. Under
 * `prefers-reduced-motion` the global rule collapses the duration, so it just
 * appears.
 */
export function FadeImage({ className, ...props }: ImageProps) {
  const [loaded, setLoaded] = useState(false);
  return (
    // alt is always supplied by callers via {...props} (enforced by ImageProps).
    // eslint-disable-next-line jsx-a11y/alt-text
    <Image
      {...props}
      onLoad={() => setLoaded(true)}
      className={cn(
        "transition-[opacity,transform] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
        loaded ? "opacity-100" : "opacity-0",
        className
      )}
    />
  );
}
