# Umthombo Creations

A bespoke, editorial storefront **and admin system** for **Umthombo Creations**  a Cape Town handcrafted-candle & skincare business (est. 2020). Built around the idea of *Umthombo*  a spring, a source of renewal and flow.

The public site is DB-backed and the whole catalogue, testimonials and orders are managed through a polished, fully-responsive admin.

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS v4** (CSS-first `@theme` tokens) · **Motion** (reduced-motion-gated) · **Lenis** smooth scroll
- **PostgreSQL on Neon** + **Drizzle ORM** (migrations via drizzle-kit)
- **Better Auth** (email/password, admin-only, sessions in Postgres)
- **Supabase Storage** for product images
- **Zustand** (cart) · **React Hook Form + Zod** · **Embla** (testimonials) · **Radix Dialog**
- **next/font**  Bricolage Grotesque (display) + Hanken Grotesk (body)

## Getting started

```bash
npm install
cp .env.example .env.local      # then fill it in (see below)
npm run db:migrate              # apply schema to your Neon DB
npm run db:seed                 # seed catalogue + admin user
npm run dev                     # http://localhost:3000  (admin at /admin)
```

### Environment (`.env.local`)

```bash
DATABASE_URL=postgresql://…          # Neon (pooled, ?sslmode=require)
BETTER_AUTH_SECRET=                  # openssl rand -base64 32
BETTER_AUTH_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=           # Supabase → Settings → API → service_role
SUPABASE_STORAGE_BUCKET=product-images
ADMIN_EMAIL=admin@umthombocreations.co.za
ADMIN_PASSWORD=change-me             # used once by the seed
NEXT_PUBLIC_APP_URL=http://localhost:3000   # public origin; used for payment return + webhook URLs
```

> Shipping, payments and email credentials are **not** environment variables  they're
> configured in the admin at **/admin/integrations** (stored in the DB, secrets masked).
> See [Integrations & webhooks](#integrations--webhooks).

**Supabase:** create a **public** bucket named `product-images` (Storage → New bucket → public). `next.config.ts` already allows `*.supabase.co` images.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev / production build / serve |
| `npm run db:generate` | Generate a migration from `schema.ts` |
| `npm run db:migrate` | Apply migrations to the DB |
| `npm run db:push` | Push schema directly (dev) |
| `npm run db:studio` | Drizzle Studio (browse/edit data) |
| `npm run db:seed` | Seed categories/products/testimonials + admin user |
| `npm run icons` | Regenerate favicon/app-icon/social images from the brand mark |

## How it fits together

```
src/
  app/
    (site)/            public storefront (home, shop, product, hampers, about, contact, custom)
    (site)/checkout/   checkout flow + success / cancelled pages
    admin/
      login/           Better Auth sign-in (outside the shell)
      (panel)/         protected admin: dashboard, analytics, orders, products, categories, testimonials, integrations
    api/auth/[...all]/ Better Auth handler
    api/webhooks/      yetopay (payment) + bobgo (fulfilment) handlers
  proxy.ts             optimistic /admin gate (cookie check)
  server/
    db/                drizzle client, schema, public + admin queries, integrations
    auth/              Better Auth instance + requireAdmin() guard
    storage/           Supabase upload/delete
    shipping/          BobGo client (rates + order create)
    payments/          YetoPay client (signed link + webhook verify)
    email/             Resend sender + branded templates
    orders/            post-payment fulfilment (emails + shipment + tracking)
    actions/           server actions (…, shipping, checkout, integrations)
  components/
    admin/             AdminShell, DataTable, Toast, ConfirmDialog, primitives, forms, integrations
    checkout/          CheckoutClient + helpers
    …                  storefront components (unchanged look & feel)
  data/                seed source only (no longer imported by pages)
scripts/seed.ts        idempotent seed (catalogue, admin, integration rows)
drizzle/               generated migrations
docs/                  build plans (.md)
```

## Checkout, payments & shipping

"Add to Order" fills the slide-over **selection**; **Checkout** opens `/checkout`:

1. **Contact → method → address.** Delivery is offered only when **BobGo** is enabled. The customer enters a structured address and taps **Get delivery options** → live courier rates from BobGo (name, ETA, price) → selects one.
2. **Place order.** `placeOrder` **re-prices every line from the DB** and **re-verifies the chosen courier rate against BobGo** (the client can't set prices or fees), then writes the order + items in one transaction as `paymentStatus: pending`.
3. **Pay.** Routing is graceful:
   - **YetoEFT** configured → a signed payment link is created and the customer either is **redirected** to YetoPay or pays in an **embedded iFrame** on-site (admin toggle; iFrame uses YetoPay's `postMessage` to advance). Either way the **webhook** (`/api/webhooks/yetopay`, HMAC-verified, idempotent) is authoritative: it flips the order to **paid**.
   - else **WhatsApp** on → a pre-filled message opens (the owner confirms + arranges payment).
   - else → the order is recorded as **manual** for the owner to follow up.
4. **On first paid:** the customer + admin are emailed (Resend), and for a delivery order the **BobGo courier order** is created (`channel_order_number = order number`).
5. **Fulfilment:** when the owner fulfils on BobGo, its **webhook** (`/api/webhooks/bobgo`) updates `trackingReference` / `trackingUrl` / `shipmentStatus` on every fire and emails the customer their tracking link once.

The 10% reusable-container discount is applied server-side. Every integration degrades gracefully when off (collection-only, WhatsApp fallback, notifications skipped).

## Integrations & webhooks

Configure everything in **/admin/integrations**  each provider is a card you toggle on/off with a masked-secrets config form. Nothing here is an env var.

| Integration | What it does | Key config |
|---|---|---|
| **BobGo** | Live courier rates, shipment creation, tracking | API key, sandbox toggle, collection address |
| **YetoEFT** (YetoPay) | Online payment | Base URL, merchant ID, API key/secret, webhook secret, default method, **checkout display: full-page redirect or embedded iFrame** |
| **Resend** | Transactional email | API key, from-email, from-name |
| **WhatsApp** | Secondary "order over WhatsApp" fallback | on/off (number from Settings) |

**Products** carry shipping dimensions (weight kg, L×W×H cm) under the product editor's *Shipping* card  these feed BobGo's rate calculation.

**Webhook URLs to register in the providers' dashboards** (replace the host with your `NEXT_PUBLIC_APP_URL`):

- **YetoPay** → `https://<your-domain>/api/webhooks/yetopay`  authenticated per-delivery by the `X-Webhook-Signature` HMAC (raw-body, constant-time compare); replays are idempotent via the `payment_events` table.
- **BobGo** → `https://<your-domain>/api/webhooks/bobgo`  a plain, trusted URL (BobGo sends no token/HMAC). Subscribe to the **fulfilment-update** event. It only ever updates an existing order matched by `channel_order_number` and only writes shipping/tracking fields.

> **Sandbox / gaps:** BobGo has a sandbox toggle in its config (uses `api.sandbox.bobgo.co.za`). For YetoPay, confirm the production base URL, a sandbox/test key, and (optionally) a verify-transaction endpoint with the provider  the build is **webhook-authoritative**, so it works without the latter.

## Admin

`/admin` (sign in with the seeded credentials). Fully responsive (sidebar on desktop, drawer on mobile), brand-consistent, with toasts, confirm dialogs and reduced-motion-safe motion.

- **Dashboard**  counts + recent orders
- **Analytics**  revenue (defaults to **paid** orders), best sellers, status/method split, custom range, CSV export
- **Orders**  list/filter (status + **paid/unpaid**), detail with **payment & shipping** card (provider, tracking, shipment status) and manual **Mark as paid** / **Create BobGo shipment**, status switcher, reply-on-WhatsApp
- **Products**  search/filter, full editor (variants, gallery, **shipping dimensions**, featured/draft) with **drag-and-drop Supabase uploads**
- **Categories**  CRUD + reorder (delete blocked while products reference it)
- **Testimonials**  CRUD + publish toggle + reorder
- **Integrations**  toggle + configure BobGo / YetoEFT / Resend / WhatsApp (masked secrets)

Security: public sign-up disabled; every admin mutation is guarded by `requireAdmin()` + Zod; sign-in is rate-limited; the `service_role` key never reaches the browser. Integration secrets are stored in the DB, **masked** in the UI (never sent to the client), and webhooks are verified (YetoPay HMAC) or trusted-by-construction (BobGo, order-scoped writes only).

## Notes

- Public pages use ISR (`revalidate`); admin writes call `revalidatePath` so the storefront reflects changes.
- Seed images live in `public/products/*`; new uploads go to Supabase. Swapping a product image in the admin replaces it with a Supabase URL.
- See `docs/SYSTEM_BUILD_PLAN.md` and `docs/SHIPPING_PAYMENT_PLAN.md` for the phased build logs.
