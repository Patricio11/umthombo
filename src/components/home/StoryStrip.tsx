import Link from "next/link";
import { Reveal } from "@/components/motion/Reveal";
import { site } from "@/data/site";

export function StoryStrip() {
  return (
    <section className="px-5 py-20 sm:px-8 lg:py-28">
      <div className="mx-auto max-w-4xl text-center">
        <Reveal>
          <p className="eyebrow text-olive">The source</p>
        </Reveal>
        <Reveal delay={0.05}>
          <p className="mt-6 font-display text-3xl font-light leading-[1.25] tracking-tight sm:text-4xl lg:text-[2.7rem]">
            {site.story}
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <Link
            href="/about"
            className="link-underline mt-8 inline-block text-base text-olive"
          >
            Read our story
          </Link>
        </Reveal>
      </div>
    </section>
  );
}
