import type { Metadata } from "next";
import { MapPin, Truck, Clock } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Reveal } from "@/components/motion/Reveal";
import { ContactForm } from "@/components/contact/ContactForm";
import {
  InstagramIcon,
  FacebookIcon,
  WhatsAppIcon,
} from "@/components/brand/SocialIcons";
import { getSiteSettings } from "@/server/db/settings";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Talk to Umthombo Creations - WhatsApp, Instagram, Facebook, and collection in Observatory, Cape Town. Nationwide delivery available.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact · Umthombo Creations",
    description:
      "WhatsApp us, find us on social, or collect in Observatory, Cape Town. Nationwide delivery available.",
    url: "/contact",
  },
};

export default async function ContactPage() {
  const site = await getSiteSettings();
  return (
    <>
      <PageHeader
        eyebrow="Talk to us"
        title="We'd love to hear from you."
        blurb="The fastest way to reach us is a WhatsApp  but a note here works just as well. We read everything."
      />

      <section className="px-5 py-12 sm:px-8 lg:py-16">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Channels */}
          <Reveal className="space-y-8">
            <a
              href={site.whatsapp.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between rounded-3xl bg-olive px-6 py-6 text-cream transition-transform duration-300 hover:scale-[1.02]"
            >
              <div className="flex items-center gap-4">
                <WhatsAppIcon size={28} />
                <div>
                  <p className="font-display text-2xl">WhatsApp</p>
                  <p className="text-cream/80">{site.whatsapp.display}</p>
                </div>
              </div>
              <span className="text-cream/70 transition-transform group-hover:translate-x-1">
                →
              </span>
            </a>

            {(site.instagram.enabled || site.facebook.enabled) && (
              <div className="grid grid-cols-2 gap-4">
                {site.instagram.enabled && (
                  <a
                    href={site.instagram.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col gap-2 rounded-3xl bg-cream-2 px-5 py-5 transition-colors hover:bg-cream-3"
                  >
                    <InstagramIcon size={24} className="text-olive" />
                    <span className="font-medium">Instagram</span>
                    <span className="text-sm text-ink-soft">
                      {site.instagram.handle}
                    </span>
                  </a>
                )}
                {site.facebook.enabled && (
                  <a
                    href={site.facebook.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col gap-2 rounded-3xl bg-cream-2 px-5 py-5 transition-colors hover:bg-cream-3"
                  >
                    <FacebookIcon size={24} className="text-olive" />
                    <span className="font-medium">Facebook</span>
                    <span className="text-sm text-ink-soft">
                      {site.facebook.handle}
                    </span>
                  </a>
                )}
              </div>
            )}

            <ul className="space-y-4 rounded-3xl border border-cream-3 px-6 py-6 text-sm">
              <li className="flex items-start gap-3">
                <MapPin size={20} className="mt-0.5 shrink-0 text-olive" />
                <span>
                  <span className="font-medium">Collection</span>
                  <br />
                  <span className="text-ink-soft">{site.collection}</span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Truck size={20} className="mt-0.5 shrink-0 text-olive" />
                <span>
                  <span className="font-medium">Delivery</span>
                  <br />
                  <span className="text-ink-soft">
                    Nationwide, anywhere in South Africa
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Clock size={20} className="mt-0.5 shrink-0 text-olive" />
                <span>
                  <span className="font-medium">Made to order</span>
                  <br />
                  <span className="text-ink-soft">
                    Small batches  we&rsquo;ll confirm timing when you order
                  </span>
                </span>
              </li>
            </ul>
          </Reveal>

          {/* Form */}
          <Reveal delay={0.08}>
            <div className="rounded-3xl bg-cream-2 p-7 sm:p-9">
              <h2 className="font-display text-3xl">Send a note</h2>
              <p className="mt-2 text-sm text-ink-soft">
                It&rsquo;ll open WhatsApp with your message ready to send.
              </p>
              <div className="mt-6">
                <ContactForm />
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
