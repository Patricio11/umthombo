import { Reveal } from "@/components/motion/Reveal";

export function PageHeader({
  eyebrow,
  title,
  blurb,
  accentClass = "text-clay",
}: {
  eyebrow: string;
  title: string;
  blurb?: string;
  accentClass?: string;
}) {
  return (
    <header className="px-5 pb-8 pt-32 sm:px-8 sm:pt-40 lg:pb-12">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <p className={`eyebrow ${accentClass}`}>{eyebrow}</p>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="mt-4 max-w-3xl font-display text-5xl font-light leading-[0.98] tracking-tight lg:text-7xl">
            {title}
          </h1>
        </Reveal>
        {blurb && (
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-soft">
              {blurb}
            </p>
          </Reveal>
        )}
      </div>
    </header>
  );
}
