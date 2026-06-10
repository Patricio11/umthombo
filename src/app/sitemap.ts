import type { MetadataRoute } from "next";
import { site } from "@/data/site";
import {
  getProductsForSitemap,
  getCategoriesForSitemap,
} from "@/server/db/queries";
import { getPostsForSitemap, getAllTags } from "@/server/db/journal";

export const revalidate = 3600;

const abs = (path: string) => `${site.url}${path}`;
const absImg = (img: string | null) =>
  !img ? undefined : img.startsWith("http") ? img : `${site.url}${img}`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories, posts, tags] = await Promise.all([
    getProductsForSitemap(),
    getCategoriesForSitemap(),
    getPostsForSitemap(),
    getAllTags(),
  ]);

  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: abs(""), changeFrequency: "weekly", priority: 1, lastModified: now },
    { url: abs("/shop"), changeFrequency: "weekly", priority: 0.9, lastModified: now },
    { url: abs("/hampers"), changeFrequency: "monthly", priority: 0.8, lastModified: now },
    { url: abs("/custom"), changeFrequency: "monthly", priority: 0.7, lastModified: now },
    { url: abs("/journal"), changeFrequency: "weekly", priority: 0.7, lastModified: now },
    { url: abs("/faq"), changeFrequency: "monthly", priority: 0.6, lastModified: now },
    { url: abs("/about"), changeFrequency: "yearly", priority: 0.5, lastModified: now },
    { url: abs("/contact"), changeFrequency: "yearly", priority: 0.5, lastModified: now },
  ];

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url: abs(`/shop/${c.slug}`),
    changeFrequency: "weekly",
    priority: 0.8,
    lastModified: c.updatedAt ?? now,
  }));

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => {
    const img = absImg(p.image);
    return {
      url: abs(`/product/${p.slug}`),
      changeFrequency: "weekly",
      priority: 0.7,
      lastModified: p.updatedAt ?? now,
      ...(img ? { images: [img] } : {}),
    };
  });

  const postRoutes: MetadataRoute.Sitemap = posts.map((p) => {
    const img = absImg(p.coverImage);
    return {
      url: abs(`/journal/${p.slug}`),
      changeFrequency: "monthly",
      priority: 0.6,
      lastModified: p.updatedAt ?? now,
      ...(img ? { images: [img] } : {}),
    };
  });

  const topicRoutes: MetadataRoute.Sitemap = tags.map((t) => ({
    url: abs(`/journal/topic/${t.slug}`),
    changeFrequency: "monthly",
    priority: 0.4,
    lastModified: now,
  }));

  return [
    ...staticRoutes,
    ...categoryRoutes,
    ...productRoutes,
    ...postRoutes,
    ...topicRoutes,
  ];
}
