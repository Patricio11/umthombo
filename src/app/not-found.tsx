import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

export default function NotFound() {
  return (
    <section className="flex min-h-[70dvh] flex-col items-center justify-center px-6 py-32 text-center">
      <div className="text-clay">
        <Logo animate />
      </div>
      <p className="eyebrow mt-8 text-clay">Page 404</p>
      <h1 className="mt-4 font-display text-5xl font-light tracking-tight lg:text-7xl">
        This spring ran dry.
      </h1>
      <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-soft">
        The page you&rsquo;re after isn&rsquo;t here — but there&rsquo;s plenty
        more to wander toward.
      </p>
      <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full bg-clay px-8 py-4 text-base font-medium text-cream transition-transform duration-300 hover:scale-[1.03] active:scale-[0.98]"
        >
          Back home
        </Link>
        <Link href="/shop" className="link-underline text-base text-ink">
          Browse the shop
        </Link>
      </div>
    </section>
  );
}
