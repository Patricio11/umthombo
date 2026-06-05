# Umthombo Creations

A bespoke, editorial storefront **and admin system** for **Umthombo Creations** — a Cape Town handcrafted-candle & skincare business (est. 2020). Built around the idea of *Umthombo* — a spring, a source of renewal and flow.

The public site is DB-backed and the whole catalogue, testimonials and orders are managed through a polished, fully-responsive admin.

## Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS v4** (CSS-first `@theme` tokens) · **Motion** (reduced-motion-gated) · **Lenis** smooth scroll
- **PostgreSQL on Neon** + **Drizzle ORM** (migrations via drizzle-kit)
- **Better Auth** (email/password, admin-only, sessions in Postgres)
- **Supabase Storage** for product images
- **Zustand** (cart) · **React Hook Form + Zod** · **Embla** (testimonials) · **Radix Dialog**
- **next/font** — Bricolage Grotesque (display) + Hanken Grotesk (body)

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
```

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
    admin/
      login/           Better Auth sign-in (outside the shell)
      (panel)/         protected admin: dashboard, orders, products, categories, testimonials
    api/auth/[...all]/ Better Auth handler
  proxy.ts             optimistic /admin gate (cookie check)
  server/
    db/                drizzle client, schema, public + admin queries
    auth/              Better Auth instance + requireAdmin() guard
    storage/           Supabase upload/delete
    actions/           server actions (categories, products, orders, testimonials)
  components/
    admin/             AdminShell, DataTable, Toast, ConfirmDialog, primitives, forms
    …                  storefront components (unchanged look & feel)
  data/                seed source only (no longer imported by pages)
scripts/seed.ts        idempotent seed
drizzle/               generated migrations
```

## Orders (no payments)

There's no checkout. "Add to Order" fills the slide-over **selection**, then **Place your order**:

1. The order is **persisted server-side** — every line is **re-priced from the DB** (the client can't set prices), then order + items are written in **one transaction**.
2. A pre-filled **WhatsApp** message to **+27 63 705 3286** opens for the customer to send.
3. The order appears in **/admin/orders**, where the admin reads it and moves it through `new → confirmed → preparing → completed / cancelled`.

The 10% reusable-container discount is applied server-side.

## Admin

`/admin` (sign in with the seeded credentials). Fully responsive (sidebar on desktop, drawer on mobile), brand-consistent, with toasts, confirm dialogs and reduced-motion-safe motion.

- **Dashboard** — counts + recent orders
- **Orders** — list/filter, detail, status switcher, reply-on-WhatsApp
- **Products** — search/filter, full editor (variants, gallery, featured/draft) with **drag-and-drop Supabase uploads**
- **Categories** — CRUD + reorder (delete blocked while products reference it)
- **Testimonials** — CRUD + publish toggle + reorder

Security: public sign-up disabled; every admin mutation is guarded by `requireAdmin()` + Zod; sign-in is rate-limited; the `service_role` key never reaches the browser.

## Notes

- Public pages use ISR (`revalidate`); admin writes call `revalidatePath` so the storefront reflects changes.
- Seed images live in `public/products/*`; new uploads go to Supabase. Swapping a product image in the admin replaces it with a Supabase URL.
- See `SYSTEM_BUILD_PLAN.md` for the phased build log.
