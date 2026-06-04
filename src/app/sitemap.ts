import type { MetadataRoute } from "next";
import { site } from "@/data/site";
import { getCategories, getActiveProductSlugs } from "@/server/db/queries";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, slugs] = await Promise.all([
    getCategories(),
    getActiveProductSlugs(),
  ]);

  const staticRoutes = ["", "/shop", "/hampers", "/about", "/contact", "/custom"].map(
    (path) => ({
      url: `${site.url}${path}`,
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1 : 0.7,
    })
  );

  const categoryRoutes = categories.map((c) => ({
    url: `${site.url}/shop/${c.slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const productRoutes = slugs.map((slug) => ({
    url: `${site.url}/product/${slug}`,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...categoryRoutes, ...productRoutes];
}
