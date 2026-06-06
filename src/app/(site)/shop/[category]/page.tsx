import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ShopExplorer } from "@/components/shop/ShopExplorer";
import { accentClasses } from "@/lib/accents";
import { canonical, breadcrumbLd } from "@/lib/seo";
import {
  getCategories,
  getCategoryBySlug,
  getProducts,
} from "@/server/db/queries";

export const revalidate = 60;

// Curated headline per known category; unknown categories fall back to blurb.
const titles: Record<string, string> = {
  candles: "Candles, hand-poured and slow to burn.",
  skin: "Care your skin already recognises.",
  home: "A scent that settles in softly.",
  hampers: "Soft, beautiful things, assembled with love.",
};

export async function generateStaticParams() {
  const cats = await getCategories();
  return cats.map((c) => ({ category: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  const cat = await getCategoryBySlug(category);
  if (!cat) return {};
  return {
    title: cat.label,
    description: cat.blurb,
    ...canonical(`/shop/${cat.slug}`),
    openGraph: {
      type: "website",
      title: `${cat.label} · Umthombo Creations`,
      description: cat.blurb,
      url: `/shop/${cat.slug}`,
    },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const cat = await getCategoryBySlug(category);
  if (!cat) notFound();

  const [products, categories] = await Promise.all([
    getProducts(),
    getCategories(),
  ]);
  const accent = accentClasses[cat.accent];

  const breadcrumb = breadcrumbLd([
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    { name: cat.label, path: `/shop/${cat.slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <PageHeader
        eyebrow={cat.eyebrow}
        title={titles[cat.slug] ?? cat.blurb}
        blurb={cat.blurb}
        accentClass={accent.text}
      />
      <ShopExplorer
        products={products}
        categories={categories}
        initial={cat.slug}
      />
    </>
  );
}
