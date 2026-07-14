import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { products, categories } from "@/server/db/schema";

export interface DiscountProductRow {
  id: string;
  name: string;
  image: string;
  categoryLabel: string;
  size: string | null;
  priceZAR: number;
  status: "draft" | "active";
  containerEligible: boolean;
}

/** Every product (drafts included) for the eligibility picker. */
export async function getDiscountProducts(): Promise<DiscountProductRow[]> {
  const rows = await db
    .select({
      id: products.id,
      name: products.name,
      image: products.image,
      categoryLabel: categories.label,
      size: products.size,
      priceZAR: products.priceZAR,
      status: products.status,
      containerEligible: products.containerEligible,
    })
    .from(products)
    .leftJoin(categories, eq(categories.id, products.categoryId))
    .orderBy(asc(categories.label), asc(products.name));
  return rows.map((r) => ({ ...r, categoryLabel: r.categoryLabel ?? "" }));
}
