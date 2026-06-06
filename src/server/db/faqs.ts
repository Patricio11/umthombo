import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { faqs } from "@/server/db/schema";
import type { Faq } from "@/server/db/schema";

/** Published FAQs for the public page (ordered). */
export async function getPublishedFaqs(): Promise<Faq[]> {
  return db
    .select()
    .from(faqs)
    .where(eq(faqs.published, true))
    .orderBy(asc(faqs.sortOrder));
}

/** All FAQs for the admin. */
export async function getAdminFaqs(): Promise<Faq[]> {
  return db.select().from(faqs).orderBy(asc(faqs.sortOrder));
}
