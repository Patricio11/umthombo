import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
} from "drizzle-orm/pg-core";

// Better Auth tables (user, session, account, verification)
export * from "./auth-schema";

/* ------------------------------------------------------------------ */
/*  Enums                                                             */
/* ------------------------------------------------------------------ */
export const productStatusEnum = pgEnum("product_status", ["draft", "active"]);
export const orderStatusEnum = pgEnum("order_status", [
  "new",
  "confirmed",
  "preparing",
  "completed",
  "cancelled",
]);
export const orderMethodEnum = pgEnum("order_method", [
  "delivery",
  "collection",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

/* ------------------------------------------------------------------ */
/*  Categories                                                        */
/* ------------------------------------------------------------------ */
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  label: text("label").notNull(),
  eyebrow: text("eyebrow").notNull().default(""),
  accent: text("accent").notNull().default("olive"), // olive | clay | mist | taupe
  blurb: text("blurb").notNull().default(""),
  image: text("image").notNull().default(""),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

/* ------------------------------------------------------------------ */
/*  Products                                                          */
/* ------------------------------------------------------------------ */
export const products = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "restrict" }),
  tagline: text("tagline").notNull().default(""),
  description: text("description").notNull().default(""),
  notes: text("notes"),
  size: text("size"),
  weight: text("weight"),
  priceZAR: integer("price_zar").notNull().default(0),
  priceMaxZAR: integer("price_max_zar"),
  packPriceZAR: integer("pack_price_zar"),
  customisable: boolean("customisable").notNull().default(false),
  featured: boolean("featured").notNull().default(false),
  deliveryFeeZAR: integer("delivery_fee_zar"), // per-product override (null = use global)
  status: productStatusEnum("status").notNull().default("active"),
  image: text("image").notNull().default(""),
  gallery: jsonb("gallery").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  variants: jsonb("variants")
    .$type<string[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  sortOrder: integer("sort_order").notNull().default(0),
  ...timestamps,
});

/* ------------------------------------------------------------------ */
/*  Orders                                                            */
/* ------------------------------------------------------------------ */
export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderNumber: text("order_number").notNull().unique(),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  method: orderMethodEnum("method").notNull().default("delivery"),
  shippingAddress: text("shipping_address"),
  note: text("note"),
  ownContainer: boolean("own_container").notNull().default(false),
  subtotalZAR: integer("subtotal_zar").notNull().default(0),
  deliveryFeeZAR: integer("delivery_fee_zar").notNull().default(0),
  totalZAR: integer("total_zar").notNull().default(0),
  status: orderStatusEnum("status").notNull().default("new"),
  ...timestamps,
});

export const orderItems = pgTable("order_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").references(() => products.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(), // snapshot
  variant: text("variant"),
  qty: integer("qty").notNull().default(1),
  unitPriceZAR: integer("unit_price_zar").notNull(),
  lineTotalZAR: integer("line_total_zar").notNull(),
});

/* ------------------------------------------------------------------ */
/*  Testimonials                                                      */
/* ------------------------------------------------------------------ */
export const testimonials = pgTable("testimonials", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  quote: text("quote").notNull(),
  location: text("location"),
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(true),
  ...timestamps,
});

/* ------------------------------------------------------------------ */
/*  Site settings (singleton, id = "site"; null fields fall back to    */
/*  the data/site.ts defaults)                                         */
/* ------------------------------------------------------------------ */
export const settings = pgTable("settings", {
  id: text("id").primaryKey().default("site"),
  tagline: text("tagline"),
  story: text("story"),
  collection: text("collection"),
  whatsappNumber: text("whatsapp_number"),
  whatsappDisplay: text("whatsapp_display"),
  instagramHandle: text("instagram_handle"),
  instagramUrl: text("instagram_url"),
  facebookHandle: text("facebook_handle"),
  facebookUrl: text("facebook_url"),
  email: text("email"),
  deliveryEnabled: boolean("delivery_enabled"), // offer delivery at all
  deliveryChargeEnabled: boolean("delivery_charge_enabled"), // charge a fee (off = free)
  deliveryFeeType: text("delivery_fee_type"), // "flat" | "percent"
  deliveryFeeZAR: integer("delivery_fee_zar"), // flat amount
  deliveryPercent: integer("delivery_percent"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/* ------------------------------------------------------------------ */
/*  Integrations (BobGo, YetoEFT, Resend, WhatsApp) — admin-managed    */
/*  credential bags, toggled on/off. `config` is a per-key jsonb bag.   */
/* ------------------------------------------------------------------ */
export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(), // bobgo | yetopay | resend | whatsapp
  name: text("name").notNull(),
  category: text("category").notNull(), // shipping | payment | email | channel
  enabled: boolean("enabled").notNull().default(false),
  config: jsonb("config")
    .$type<Record<string, unknown>>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  ...timestamps,
});

export type Integration = typeof integrations.$inferSelect;

/* ------------------------------------------------------------------ */
/*  Relations                                                         */
/* ------------------------------------------------------------------ */
export const categoriesRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  orderItems: many(orderItems),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

/* ------------------------------------------------------------------ */
/*  Inferred types                                                    */
/* ------------------------------------------------------------------ */
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Product = typeof products.$inferSelect;
export type NewProduct = typeof products.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type Testimonial = typeof testimonials.$inferSelect;
export type NewTestimonial = typeof testimonials.$inferInsert;
export type Settings = typeof settings.$inferSelect;
export type NewSettings = typeof settings.$inferInsert;
