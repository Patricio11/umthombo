import Link from "next/link";
import { MapPin } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import {
  InstagramIcon,
  FacebookIcon,
  WhatsAppIcon,
} from "@/components/brand/SocialIcons";
import { site, nav } from "@/data/site";

export function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden bg-ink text-cream">
      {/* organic top edge */}
      <div
        aria-hidden
        className="absolute -top-px left-0 h-12 w-full bg-cream"
        style={{ clipPath: "ellipse(75% 100% at 50% 0%)" }}
      />

      <div className="mx-auto grid max-w-7xl gap-12 px-5 pb-12 pt-28 sm:px-8 md:grid-cols-12">
        {/* Brand + stay in flow */}
        <div className="md:col-span-5">
          <Link href="/" className="text-cream" aria-label="Umthombo Creations">
            <Logo showWord animate={false} />
          </Link>
          <p className="editorial-italic mt-5 max-w-sm text-lg text-cream/70">
            {site.meaning}
          </p>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-cream/55">
            Stay in flow  follow along on Instagram for new pours, small batches
            and the occasional behind-the-scenes.
          </p>
        </div>

        {/* Explore */}
        <nav className="md:col-span-3">
          <h3 className="eyebrow text-cream/45">Explore</h3>
          <ul className="mt-5 space-y-3">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="link-underline text-cream/80 transition-colors hover:text-cream"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Contact */}
        <div className="md:col-span-4">
          <h3 className="eyebrow text-cream/45">Talk to us</h3>
          <ul className="mt-5 space-y-4 text-sm">
            <li>
              <a
                href={site.whatsapp.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 text-cream/80 transition-colors hover:text-cream"
              >
                <WhatsAppIcon size={18} className="text-olive" />
                WhatsApp {site.whatsapp.display}
              </a>
            </li>
            <li>
              <a
                href={site.instagram.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 text-cream/80 transition-colors hover:text-cream"
              >
                <InstagramIcon size={18} className="text-olive" />
                {site.instagram.handle}
              </a>
            </li>
            <li>
              <a
                href={site.facebook.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 text-cream/80 transition-colors hover:text-cream"
              >
                <FacebookIcon size={18} className="text-olive" />
                {site.facebook.handle}
              </a>
            </li>
            <li className="inline-flex items-start gap-3 text-cream/60">
              <MapPin size={18} className="mt-0.5 shrink-0 text-olive" />
              {site.collection}
            </li>
          </ul>
        </div>
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 pb-10 pt-6 text-xs text-cream/40 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p>
          © {site.since}–{new Date().getFullYear()} {site.name}. Handcrafted in{" "}
          {site.location}.
        </p>
        <p>Eco-conscious essentials, made with love and inspired by nature.</p>
      </div>
    </footer>
  );
}
