import type { Metadata } from "next";
import { ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { getPublishedFaqs } from "@/server/db/faqs";
import { getSiteSettings } from "@/server/db/settings";
import { fillDiscountCopy } from "@/lib/discount";
import { faqLd, canonical } from "@/lib/seo";
import type { Faq } from "@/server/db/schema";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Answers about ordering, delivery, collection, payment, custom orders and caring for your Umthombo Creations candles and skincare.",
  ...canonical("/faq"),
  openGraph: {
    title: "FAQ · Umthombo Creations",
    description:
      "Ordering, delivery, collection, payment, custom orders and product care - answered.",
    url: "/faq",
  },
};

export default async function FaqPage() {
  const [raw, settings] = await Promise.all([
    getPublishedFaqs(),
    getSiteSettings(),
  ]);
  // Answers may use a `{discount}` token so the copy follows the admin's rule.
  const items = raw.map((f) => ({
    ...f,
    answer: fillDiscountCopy(f.answer, settings.containerDiscount),
  }));

  // Group by category, preserving order; uncategorised items go in "".
  const groups: { category: string; items: Faq[] }[] = [];
  for (const f of items) {
    const cat = f.category ?? "";
    let g = groups.find((x) => x.category === cat);
    if (!g) {
      g = { category: cat, items: [] };
      groups.push(g);
    }
    g.items.push(f);
  }

  const jsonLd = faqLd(items.map((f) => ({ question: f.question, answer: f.answer })));

  return (
    <>
      {items.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <PageHeader
        eyebrow="Good to know"
        title="Questions & answers"
        blurb="Everything about ordering, delivery, collection, custom work and caring for your pieces. Still stuck? Message us - we’re quick to reply."
      />

      <section className="px-5 pb-24 sm:px-8">
        <div className="mx-auto max-w-3xl space-y-10">
          {items.length === 0 ? (
            <p className="text-center text-ink-soft">
              We’re putting our FAQ together - in the meantime, just message us.
            </p>
          ) : (
            groups.map((g) => (
              <div key={g.category || "general"}>
                {g.category && (
                  <h2 className="mb-4 font-display text-2xl">{g.category}</h2>
                )}
                <div className="divide-y divide-cream-2 overflow-hidden rounded-3xl border border-cream-3 bg-cream">
                  {g.items.map((f) => (
                    <details key={f.id} className="group px-6 py-5">
                      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink [&::-webkit-details-marker]:hidden">
                        {f.question}
                        <ChevronDown
                          size={18}
                          className="shrink-0 text-ink-soft transition-transform group-open:rotate-180"
                        />
                      </summary>
                      <p className="mt-3 whitespace-pre-line leading-relaxed text-ink-soft">
                        {f.answer}
                      </p>
                    </details>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </>
  );
}
