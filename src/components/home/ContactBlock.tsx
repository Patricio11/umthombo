import Link from "next/link";
import { MapPin, Truck } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import { RisingBubbles } from "@/components/motion/RisingBubbles";
import {
  InstagramIcon,
  FacebookIcon,
  WhatsAppIcon,
} from "@/components/brand/SocialIcons";
import { getSiteSettings } from "@/server/db/settings";

export async function ContactBlock() {
  const site = await getSiteSettings();
  return (
    <section className="px-5 py-20 sm:px-8 lg:py-28">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-olive px-6 py-16 text-cream sm:px-12 lg:py-24">
        <RisingBubbles count={8} color="var(--color-cream)" />

        <div className="relative mx-auto max-w-2xl text-center">
          <Reveal>
            <p className="eyebrow text-cream/70">Talk to us</p>
            <h2 className="mt-4 font-display text-4xl font-light leading-tight tracking-tight lg:text-6xl">
              Let&rsquo;s make something
              <br />
              <span className="editorial-italic">just for you.</span>
            </h2>
            <p className="mx-auto mt-6 max-w-md text-cream/80">
              The fastest way to reach us is a WhatsApp. Tell us what you love 
              a scent, a colour, a moment to mark  and we&rsquo;ll take it from
              there.
            </p>
          </Reveal>

          <Reveal delay={0.08} className="mt-9">
            <a
              href={site.whatsapp.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 rounded-full bg-cream px-8 py-4 text-base font-medium text-olive transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:scale-[1.03] active:scale-[0.98]"
            >
              <WhatsAppIcon size={20} />
              Chat on WhatsApp
            </a>
            <p className="mt-3 text-sm text-cream/70">{site.whatsapp.display}</p>
          </Reveal>

          <Reveal
            delay={0.12}
            className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm"
          >
            <a
              href={site.instagram.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-cream/80 transition-colors hover:text-cream"
            >
              <InstagramIcon size={18} /> {site.instagram.handle}
            </a>
            <a
              href={site.facebook.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-cream/80 transition-colors hover:text-cream"
            >
              <FacebookIcon size={18} /> {site.facebook.handle}
            </a>
          </Reveal>

          <Reveal
            delay={0.16}
            className="mt-10 flex flex-col items-center justify-center gap-3 border-t border-cream/15 pt-8 text-sm text-cream/75 sm:flex-row sm:gap-10"
          >
            <span className="inline-flex items-center gap-2">
              <Truck size={18} className="text-cream/60" /> Nationwide delivery
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin size={18} className="text-cream/60" /> {site.collection}
            </span>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
