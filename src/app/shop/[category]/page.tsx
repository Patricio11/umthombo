import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { ShopExplorer } from "@/components/shop/ShopExplorer";
import { categoryMeta, type Category } from "@/data/products";
import { accentClasses } from "@/lib/accents";

const valid: Category[] = ["candles", "skin", "home", "hampers"];

const titles: Record<Category, string> = {
  candles: "Candles, hand-poured and slow to burn.",
  skin: "Care your skin already recognises.",
  home: "A scent that settles in softly.",
  hampers: "Soft, beautiful things, assembled with love.",
};

const accentByCat: Record<Category, keyof typeof accentClasses> = {
  candles: "olive",
  skin: "clay",
  home: "olive",
  hampers: "mist",
};

export function generateStaticParams() {
  return valid.map((category) => ({ category }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}): Promise<Metadata> {
  const { category } = await params;
  if (!valid.includes(category as Category)) return {};
  const meta = categoryMeta[category as Category];
  return {
    title: meta.label,
    description: meta.blurb,
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  if (!valid.includes(category as Category)) notFound();
  const cat = category as Category;
  const meta = categoryMeta[cat];
  const accent = accentClasses[accentByCat[cat]];

  return (
    <>
      <PageHeader
        eyebrow={meta.eyebrow}
        title={titles[cat]}
        blurb={meta.blurb}
        accentClass={accent.text}
      />
      <ShopExplorer initial={cat} />
    </>
  );
}
