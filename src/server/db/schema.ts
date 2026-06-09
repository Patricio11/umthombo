import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  real,
  boolean,
  jsonb,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Better Auth tables (user, session, account, verification)
export * from "./auth-schema";
import { user } from "./auth-schema";

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
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "cancelled",
]);
export const reviewStatusEnum = pgEnum("review_status", [
  "pending",
  "published",
  "rejected",
]);
export const customRequestStatusEnum = pgEnum("custom_request_status", [
  "pending", // submitted, awaiting admin
  "quoted", // accepted: price + ETA (+ optional deposit); awaiting deposit/start
  "in_progress", // work underway (deposit paid, or no deposit needed)
  "ready", // finished; balance link sent
  "completed", // balance settled
  "declined", // admin declined (with reason)
  "cancelled",
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
  // Shipping dimensions for live BobGo rates (null = not yet captured)
  weightKg: real("weight_kg"),
  lengthCm: real("length_cm"),
  widthCm: real("width_cm"),
  heightCm: real("height_cm"),
  // When a "new product" announcement was last emailed to customers.
  notifiedAt: timestamp("notified_at", { withTimezone: true }),
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
  // Linked to a customer account when known (logged-in checkout, or backfilled
  // by verified email). Null for guest orders.
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  method: orderMethodEnum("method").notNull().default("delivery"),
  shippingAddress: text("shipping_address"), // flattened, human-readable
  // Structured delivery address (DeliveryAddress) for BobGo fulfilment
  shippingAddressJson: jsonb("shipping_address_json").$type<
    Record<string, unknown>
  >(),
  note: text("note"),
  ownContainer: boolean("own_container").notNull().default(false),
  subtotalZAR: integer("subtotal_zar").notNull().default(0),
  deliveryFeeZAR: integer("delivery_fee_zar").notNull().default(0),
  totalZAR: integer("total_zar").notNull().default(0),
  status: orderStatusEnum("status").notNull().default("new"),
  // Shipping (BobGo)  selected at checkout, tracking filled by the webhook
  shippingService: text("shipping_service"),
  shippingServiceCode: text("shipping_service_code"),
  bobgoOrderId: text("bobgo_order_id"),
  trackingReference: text("tracking_reference"),
  trackingUrl: text("tracking_url"),
  shipmentStatus: text("shipment_status"), // BobGo method_status
  // Payment (YetoEFT)  webhook is authoritative
  paymentProvider: text("payment_provider"), // yetopay | whatsapp | manual
  paymentReference: text("payment_reference"), // YetoPay transactionId
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
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
/*  Payment / fulfilment webhook events (idempotency + audit)          */
/* ------------------------------------------------------------------ */
export const paymentEvents = pgTable("payment_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull(), // yetopay | bobgo
  eventId: text("event_id").notNull().unique(), // webhook delivery id
  orderId: uuid("order_id").references(() => orders.id, {
    onDelete: "set null",
  }),
  type: text("type"),
  status: text("status"),
  raw: jsonb("raw").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type PaymentEvent = typeof paymentEvents.$inferSelect;

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
  instagramEnabled: boolean("instagram_enabled"), // null = on (default)
  facebookHandle: text("facebook_handle"),
  facebookUrl: text("facebook_url"),
  facebookEnabled: boolean("facebook_enabled"), // null = on (default)
  email: text("email"),
  paymentProvider: text("payment_provider"), // active/default gateway: yetopay | yoco | null (auto)
  offerBothGateways: boolean("offer_both_gateways"), // let customers pick a gateway at checkout
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

/* ------------------------------------------------------------------ */
/*  Integrations (BobGo, YetoEFT, Resend, WhatsApp)  admin-managed    */
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
/*  Customer saved addresses                                          */
/* ------------------------------------------------------------------ */
export const addresses = pgTable("addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  label: text("label"), // e.g. "Home", "Work"
  recipientName: text("recipient_name").notNull(),
  phone: text("phone"),
  company: text("company"),
  streetAddress: text("street_address").notNull(),
  localArea: text("local_area"),
  city: text("city").notNull(),
  zone: text("zone").notNull(), // ZA province code
  code: text("code").notNull(), // postal code
  country: text("country").notNull().default("ZA"),
  isPrimary: boolean("is_primary").notNull().default(false),
  ...timestamps,
});

export type Address = typeof addresses.$inferSelect;

/* ------------------------------------------------------------------ */
/*  Product reviews (purchase-gated, admin-moderated)                  */
/* ------------------------------------------------------------------ */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    orderId: uuid("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    authorName: text("author_name").notNull(), // snapshot
    rating: integer("rating").notNull(), // 1–5
    title: text("title"),
    body: text("body").notNull(),
    status: reviewStatusEnum("status").notNull().default("pending"),
    ...timestamps,
  },
  (t) => [uniqueIndex("reviews_user_product_uniq").on(t.userId, t.productId)]
);

export type Review = typeof reviews.$inferSelect;

/* ------------------------------------------------------------------ */
/*  FAQ (admin-managed)                                               */
/* ------------------------------------------------------------------ */
export const faqs = pgTable("faqs", {
  id: uuid("id").primaryKey().defaultRandom(),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  category: text("category"), // optional grouping, e.g. "Shipping"
  sortOrder: integer("sort_order").notNull().default(0),
  published: boolean("published").notNull().default(true),
  ...timestamps,
});

export type Faq = typeof faqs.$inferSelect;

/* ------------------------------------------------------------------ */
/*  Custom order requests (bespoke commission pipeline)                */
/* ------------------------------------------------------------------ */
export const customRequests = pgTable("custom_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  requestNumber: text("request_number").notNull().unique(), // CR-260608-7F3A
  statusToken: text("status_token").notNull().unique(), // guest status link
  userId: text("user_id").references(() => user.id, { onDelete: "set null" }),

  // Contact
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),

  // What they'd like - friendly type (preset or free-typed "Other")
  requestType: text("request_type"),
  // Legacy: kept nullable for old rows; no longer used (see requestType).
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  title: text("title").notNull(),
  scent: text("scent"),
  colour: text("colour"),
  size: text("size"),
  occasion: text("occasion"),
  quantity: integer("quantity").notNull().default(1),
  notes: text("notes"),
  referenceImages: jsonb("reference_images").$type<string[]>(),

  // Lifecycle + admin response
  status: customRequestStatusEnum("status").notNull().default("pending"),
  declineReason: text("decline_reason"),
  adminNote: text("admin_note"),
  quotedPriceZAR: integer("quoted_price_zar"),
  etaText: text("eta_text"),
  etaDate: timestamp("eta_date", { withTimezone: true }),
  depositRequired: boolean("deposit_required").notNull().default(false),
  depositZAR: integer("deposit_zar"),
  depositPaidAt: timestamp("deposit_paid_at", { withTimezone: true }),
  balancePaidAt: timestamp("balance_paid_at", { withTimezone: true }),

  respondedAt: timestamp("responded_at", { withTimezone: true }),
  ...timestamps,
});

export type CustomRequest = typeof customRequests.$inferSelect;

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
