/**
 * Seeds the database with the existing catalogue + an admin user.
 * Idempotent: categories/products upsert by slug; testimonials & admin
 * are only created if absent. Run with: npm run db:seed
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../src/server/db";
import {
  categories,
  products,
  testimonials,
  integrations,
  faqs,
  user as userTable,
  account as accountTable,
} from "../src/server/db/schema";
import { categoryMeta, products as seedProducts } from "../src/data/products";
import { testimonials as seedTestimonials } from "../src/data/testimonials";
import { faqSeed } from "../src/data/faq";
import { INTEGRATION_META, type IntegrationKey } from "../src/lib/integrations";
import { auth } from "../src/server/auth/auth";

const categoryImages: Record<string, string> = {
  candles: "/products/crimson-petal.jpg",
  skin: "/products/buttertastic-mega.jpg",
  home: "/products/citrus-burst.jpg",
  hampers: "/products/collective-box.jpg",
};

async function seedCategories() {
  const slugToId = new Map<string, string>();
  const entries = Object.entries(categoryMeta);
  for (let i = 0; i < entries.length; i++) {
    const [slug, meta] = entries[i];
    const image = categoryImages[slug] ?? "";
    const [row] = await db
      .insert(categories)
      .values({
        slug,
        label: meta.label,
        eyebrow: meta.eyebrow,
        accent: meta.accent,
        blurb: meta.blurb,
        image,
        sortOrder: i,
      })
      .onConflictDoUpdate({
        target: categories.slug,
        set: {
          label: meta.label,
          eyebrow: meta.eyebrow,
          accent: meta.accent,
          blurb: meta.blurb,
          image,
          sortOrder: i,
        },
      })
      .returning({ id: categories.id, slug: categories.slug });
    slugToId.set(row.slug, row.id);
  }
  console.log(`  categories: ${slugToId.size}`);
  return slugToId;
}

async function seedProductRows(slugToId: Map<string, string>) {
  let count = 0;
  for (let i = 0; i < seedProducts.length; i++) {
    const p = seedProducts[i];
    const categoryId = slugToId.get(p.category);
    if (!categoryId) {
      console.warn(`  ! skipping ${p.slug}: unknown category ${p.category}`);
      continue;
    }
    const values = {
      slug: p.slug,
      name: p.name,
      categoryId,
      tagline: p.tagline ?? "",
      description: p.description ?? "",
      notes: p.notes ?? null,
      size: p.size ?? null,
      weight: p.weight ?? null,
      priceZAR: p.priceZAR,
      priceMaxZAR: p.priceMaxZAR ?? null,
      packPriceZAR: p.packPriceZAR ?? null,
      customisable: p.customisable ?? false,
      featured: p.featured ?? false,
      status: "active" as const,
      image: p.image,
      gallery: p.gallery ?? [],
      variants: p.variants ?? [],
      sortOrder: i,
    };
    await db
      .insert(products)
      .values(values)
      .onConflictDoUpdate({ target: products.slug, set: values });
    count++;
  }
  console.log(`  products: ${count}`);
}

async function seedTestimonialRows() {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(testimonials);
  if (n > 0) {
    console.log(`  testimonials: ${n} (already present, skipped)`);
    return;
  }
  await db.insert(testimonials).values(
    seedTestimonials.map((t, i) => ({
      name: t.name,
      quote: t.quote,
      location: t.location ?? null,
      sortOrder: i,
      published: true,
    }))
  );
  console.log(`  testimonials: ${seedTestimonials.length}`);
}

async function seedFaqs() {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(faqs);
  if (n > 0) {
    console.log(`  faqs: ${n} (already present, skipped)`);
    return;
  }
  await db.insert(faqs).values(
    faqSeed.map((f, i) => ({
      question: f.question,
      answer: f.answer,
      category: f.category ?? null,
      sortOrder: i,
      published: true,
    }))
  );
  console.log(`  faqs: ${faqSeed.length}`);
}

async function seedIntegrations() {
  const keys = Object.keys(INTEGRATION_META) as IntegrationKey[];
  let created = 0;
  for (const key of keys) {
    const meta = INTEGRATION_META[key];
    await db
      .insert(integrations)
      .values({
        key,
        name: meta.name,
        category: meta.category,
        enabled: false,
        config: {},
      })
      .onConflictDoNothing({ target: integrations.key });
    created++;
  }
  console.log(`  integrations: ${created} ensured`);
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn("  ! ADMIN_EMAIL/ADMIN_PASSWORD not set  skipping admin");
    return;
  }
  const existing = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, email));
  if (existing.length) {
    console.log(`  admin: ${email} (already exists, skipped)`);
    return;
  }

  // Hash with Better Auth's own hasher so login verifies correctly.
  const ctx = await auth.$context;
  const hashed = await ctx.password.hash(password);

  const userId = randomUUID();
  await db.insert(userTable).values({
    id: userId,
    name: "Admin",
    email,
    emailVerified: true,
    role: "admin",
  });
  await db.insert(accountTable).values({
    id: randomUUID(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: hashed,
  });
  console.log(`  admin: ${email} (created)`);
}

async function main() {
  console.log("Seeding…");
  const slugToId = await seedCategories();
  await seedProductRows(slugToId);
  await seedTestimonialRows();
  await seedFaqs();
  await seedIntegrations();
  await seedAdmin();
  console.log("Done ✓");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
