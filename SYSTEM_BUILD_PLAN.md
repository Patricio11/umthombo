# Umthombo Creations — Full System Build Plan

Turning the (already-built) editorial marketing site into a **fully functional, admin-managed application**: a real database, authenticated admin, and persisted orders. The public site keeps its exact look & feel — it just reads live data instead of static files.

> Track progress here. Tick tasks as they land. Each phase ends with a green build (`npm run build`).

---

## Locked decisions

| Area | Choice |
|---|---|
| Database | **PostgreSQL on Neon** (serverless) |
| ORM | **Drizzle ORM** + drizzle-kit migrations |
| Auth | **Better Auth** — email/password, admin-only, sessions in Postgres |
| Image storage | **Supabase Storage** — existing `/public/products/*` stay as **seed**; new/edited images upload to Supabase and store the public URL |
| Orders | **Persist to DB + keep the WhatsApp hand-off** (admin manages status) |
| Mutations | Next.js **Server Actions** (auth-guarded) + a public order endpoint |
| Existing `src/data/*.ts` | Repurposed as the **seed source** (then the app reads from the DB) |

---

## Environment variables (`.env.local`)

```bash
# Neon Postgres
DATABASE_URL=postgresql://...               # provided by you

# Better Auth
BETTER_AUTH_SECRET=                          # `openssl rand -base64 32`
BETTER_AUTH_URL=http://localhost:3000

# Supabase Storage (product images)
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=                   # server-side uploads
SUPABASE_STORAGE_BUCKET=product-images

# Seed admin (used once by the seed script)
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

---

## Architecture at a glance

```
src/
  server/
    db/
      index.ts            # drizzle client (Neon)
      schema.ts           # all tables
      queries.ts          # read helpers used by public pages
    auth/
      auth.ts             # Better Auth server instance
      guard.ts            # requireAdmin() for actions/pages
    storage/
      supabase.ts         # server client + upload/delete helpers
    actions/              # server actions (categories, products, orders, testimonials)
  app/
    (public)/             # existing site, now DB-backed
    admin/
      login/              # Better Auth sign-in
      (dashboard)/        # protected: dashboard, categories, products, orders, testimonials
    api/
      auth/[...all]/      # Better Auth handler
      orders/             # public POST to create an order
  data/                   # now SEED source only
scripts/
  seed.ts                 # seeds categories, products, testimonials, admin user
drizzle/                  # generated migrations
drizzle.config.ts
```

---

## Data model

- **categories** — `id, slug (unique), label, eyebrow, accent, blurb, sortOrder, timestamps`
- **products** — `id, slug (unique), name, categoryId→categories, tagline, description, notes, size, weight, priceZAR, priceMaxZAR, packPriceZAR, customisable, featured, status (draft|active), image, gallery (jsonb text[]), variants (jsonb text[]), sortOrder, timestamps`
- **orders** — `id, orderNumber, customerName, customerEmail, customerPhone, method (delivery|collection), note, ownContainer, subtotalZAR, totalZAR, status (new|confirmed|preparing|completed|cancelled), timestamps`
- **order_items** — `id, orderId→orders, productId→products (nullable), name (snapshot), variant, qty, unitPriceZAR, lineTotalZAR`
- **testimonials** — `id, name, quote, location, sortOrder, published, timestamps`
- **Better Auth tables** — `user, session, account, verification` (generated)

---

## Admin UX/UI principles (non-negotiable)

The admin must feel as crafted as the storefront — **smooth, consistent, fully responsive**.

- **Unique & brand-consistent**: same olive/cream/ink palette, Bricolage + Hanken type, organic/editorial details and soft easing — a distinctive, authored admin, **never** a generic Material/Bootstrap dashboard.
- **Responsive**: works beautifully phone → tablet → desktop. Sidebar collapses to a drawer/bottom-nav on mobile; tables become cards on small screens.
- **Smooth**: subtle motion (page/section reveals, optimistic updates, animated toasts), all gated behind `prefers-reduced-motion`.
- **Consistent system**: shared primitives — `AdminShell`, `DataTable`, `Field`, `Toast`, `ConfirmDialog`, `StatusBadge`, `EmptyState` — reused across every screen so nothing feels bolted-on.
- **Forgiving**: inline validation, clear empty/loading/error states, confirm before destructive actions, undoable where sensible.
- **Fast**: optimistic UI + `revalidatePath` so changes show instantly.

## Phases & tasks

### Phase 0 — Foundation & schema ✅
- [x] Install deps: `drizzle-orm`, `@neondatabase/serverless`, `better-auth`, `@supabase/supabase-js`, `dotenv`, `ws`; dev: `drizzle-kit`, `tsx`
- [x] `drizzle.config.ts` + `src/server/db/index.ts` (Neon **serverless/pool** client — transaction-capable, lazy-init)
- [x] Define `schema.ts`: categories, products, orders, order_items, testimonials (+ relations + inferred types)
- [x] Add `.env.example` documenting every variable
- [x] `npm run db:generate` → migration `0000_init.sql`
- [x] Wire `db:*` scripts (generate / migrate / push / seed / studio)
- [x] Pin `kysely@0.28.17` + `serverExternalPackages` in next.config (Better Auth bundling fix)

### Phase 1 — Auth (Better Auth) — code ✅ (migrate+seed in Phase 2)
- [x] Better Auth server instance with Drizzle adapter (email/password, sign-ups disabled)
- [x] Better Auth tables (`user/session/account/verification`) in schema + migration
- [x] `api/auth/[...all]` route handler + `auth-client.ts` helpers
- [x] `/admin/login` page (branded, Suspense-wrapped)
- [x] `requireAdmin()` guard + `middleware.ts` protecting `/admin/*`
- [x] Split public site into `(site)` route group so admin has a clean shell
- [ ] Run the migration against Neon + verify login end-to-end (needs env → Phase 2)

> Legend: each phase lists **Goal → Tasks → Acceptance**. Tick tasks as they land; tick **Acceptance** only when the whole phase is verifiably done. Keep the Progress log current.

### Phase 2 — Seed & first migration
**Goal:** the Neon DB has all schema + all existing content as real rows, and an admin can log in.
- [ ] Add `DATABASE_URL` etc. to `.env.local`; `npm run db:migrate` (apply `0000_init`) and confirm 9 tables exist
- [ ] `scripts/seed.ts` scaffold: load env, connect, wrap in idempotent upserts (safe to re-run)
- [ ] Seed **categories** from `categoryMeta` (slug, label, eyebrow, accent, blurb, sortOrder)
- [ ] Seed **products** from `data/products.ts` → map `category` string → `categoryId`; keep `image`/`gallery` as current `/public/products/*` paths; carry `variants`, `featured`, `customisable`, prices, specs
- [ ] Seed **testimonials** from `data/testimonials.ts` (sortOrder, published=true)
- [ ] Seed the **admin user** via Better Auth's server API (`auth.api.signUpEmail` / admin create) from `ADMIN_EMAIL`/`ADMIN_PASSWORD` (hashed), role=`admin`; skip if it exists
- [ ] `npm run db:seed`; verify counts (23 products, 4 categories, 4 testimonials, 1 admin) via `drizzle-studio`
- [ ] Log in at `/admin/login` end-to-end (session cookie set, middleware lets `/admin` through)
- **Acceptance:** fresh `db:migrate && db:seed` populates everything; admin can sign in and out.

### Phase 3 — Point the public site at the DB
**Goal:** every public page renders identically, now from Postgres (no visual change).
- [ ] `server/db/queries.ts`: `getCategories()`, `getCategoryBySlug()`, `getProducts({category?,status:'active'})`, `getFeaturedProducts()`, `getProductBySlug()`, `getRelatedProducts()`, `getTestimonials()` — all typed, `active`-only for public
- [ ] Map DB rows → the existing `Product`/`Category` view types (keep components untouched where possible)
- [ ] Refactor **home**: `Featured`, `CategoryTiles`, `Testimonials` read from DB (server components; pass data down to client bits)
- [ ] Refactor **/shop** + **ShopExplorer**: categories + products from DB (filter UI stays); **/shop/[category]** via `getCategoryBySlug`
- [ ] Refactor **/product/[slug]**: DB fetch + `generateStaticParams` from DB + `generateMetadata`; JSON-LD from row
- [ ] Refactor **/hampers**, **/custom** (customisable filter) to DB
- [ ] Caching strategy: `export const revalidate` / tagged fetches so admin edits show after revalidation; `next/image` `remotePatterns` already allows Supabase
- [ ] Keep `data/*.ts` only as seed source (no longer imported by pages)
- **Acceptance:** side-by-side parity with current site; all routes build; product pages still SSG.

### Phase 4 — Admin design system + shell + dashboard ⭐ (UX-critical)
**Goal:** a beautiful, consistent, fully responsive admin foundation every later screen reuses.
- [ ] **Design tokens/skin**: reuse olive/cream/ink + Bricolage/Hanken; define an admin surface scale (sidebar, cards, table rows) and elevation; dark-on-cream, calm and editorial — *not* a default dashboard
- [ ] **`AdminShell`** layout: fixed sidebar (desktop) ↔ slide-in drawer (mobile) + top bar; active-route highlight; brand mark; user menu + sign-out; `prefers-reduced-motion`-safe transitions
- [ ] **Responsive nav**: sidebar (≥lg), collapsible icon-rail (md), drawer + hamburger (sm); bottom-safe-area aware
- [ ] **Primitive: `PageHeader`** (title, subtitle, primary action slot, breadcrumb)
- [ ] **Primitive: `Card`/`Section`** containers with consistent padding/rounding
- [ ] **Primitive: `Field`** set (label, input, textarea, select, switch, checkbox, error, hint) — single source of truth for forms
- [ ] **Primitive: `Button`** admin variants (primary/olive, subtle, danger, ghost, icon) + loading/disabled states
- [ ] **Primitive: `DataTable`** — sortable headers, sticky head, zebra/hover, **responsive → stacks into cards on mobile**, empty + loading skeleton states, pagination
- [ ] **Primitive: `StatusBadge`** (order statuses, product draft/active) with consistent colour mapping
- [ ] **Primitive: `Toast`** (success/error) provider + `useToast`; **`ConfirmDialog`** (Radix) for destructive actions; **`EmptyState`** (icon, copy, CTA)
- [ ] **Motion**: subtle page/section reveals, optimistic row updates, animated toasts — all gated by reduced-motion
- [ ] **`/admin` dashboard**: stat cards (orders by status, total products, categories, testimonials), recent orders list, quick links; responsive grid
- [ ] Loading (`loading.tsx`) + error (`error.tsx`) boundaries for the admin segment
- **Acceptance:** shell + dashboard look polished and work flawlessly at 360px, 768px, 1024px, 1440px; keyboard-navigable; no layout shift.

### Phase 5 — Categories admin (CRUD)
**Goal:** manage the category taxonomy with the shared primitives.
- [ ] `server/actions/categories.ts`: `createCategory`, `updateCategory`, `deleteCategory`, `reorderCategories` — `requireAdmin()` + Zod, `revalidatePath`
- [ ] **List** (`/admin/categories`): `DataTable` with label, slug, accent swatch, product count, sortOrder; responsive cards on mobile
- [ ] **Create/Edit** form (drawer or `/new` + `/[id]`): slug (auto-from-label, editable, uniqueness check), label, eyebrow, accent picker (olive/clay/mist/taupe swatches), blurb; inline validation + toast
- [ ] **Reorder** via up/down or drag (sortOrder persisted)
- [ ] **Delete** with `ConfirmDialog`; block + explain when products reference it (FK `restrict`)
- **Acceptance:** full CRUD works, validates, revalidates the public site, responsive, accessible.

### Phase 6 — Products admin (CRUD + Supabase uploads) ⭐ (UX-critical)
**Goal:** the flagship admin screen — create/edit any product, upload images, manage variants/gallery.
- [ ] `server/storage/supabase.ts`: server client (service role), `uploadProductImage(file)→publicUrl`, `deleteProductImage(url)`; create/document the `product-images` bucket (public read)
- [ ] Upload UI: drag-and-drop + click, preview thumb, progress, replace/remove, validation (type/size); writes go to Supabase, store URL
- [ ] `server/actions/products.ts`: `createProduct`, `updateProduct`, `deleteProduct`, `toggleFeatured`, `setStatus` — `requireAdmin()` + Zod, slug uniqueness, `revalidatePath`
- [ ] **List** (`/admin/products`): searchable, filter by category + status, sort; columns: thumb, name, category, price, featured, status badge; **responsive cards**; pagination; row quick-actions (edit, feature, publish, delete)
- [ ] **Create/Edit** form — sectioned & responsive (two-column on desktop, stacked on mobile):
  - Basics: name, slug (auto/edit), category (select), tagline, description
  - Pricing: priceZAR, priceMaxZAR, packPriceZAR
  - Details: notes, size, weight
  - Options: **variants** repeatable list (add/remove/reorder), customisable toggle
  - Media: primary **image upload** + **gallery** (multi, reorderable) to Supabase
  - Visibility: featured toggle, status (draft/active), sortOrder
- [ ] Unsaved-changes guard; optimistic save + toast; delete with confirm (also delete its Supabase images)
- **Acceptance:** can create a brand-new product with a real uploaded image and see it live on the shop; edits revalidate; fully responsive & validated.

### Phase 7 — Orders (public persistence + admin management)
**Goal:** every order is captured and manageable; customer still gets the WhatsApp hand-off.
- [ ] `server/actions/orders.ts` (or `POST /api/orders`): Zod-validate cart + details, compute totals **server-side** (don't trust client prices — re-price from DB), generate `orderNumber`, insert order + items in **one transaction**, return id/number
- [ ] Update `OrderModal`: submit → create order (server) → then open WhatsApp deep-link (existing) → success screen; handle/save failures gracefully
- [ ] `server/actions/orders.ts`: `updateOrderStatus`, `addAdminNote` (optional) — `requireAdmin()`
- [ ] **List** (`/admin/orders`): `DataTable` filter by status + search by name/number/phone; columns: number, customer, total, items count, status badge, date; responsive cards; newest first
- [ ] **Detail** (`/admin/orders/[id]`): customer block, line items (snapshot), totals, 10%-container flag, method, note; **status switcher** (new→confirmed→preparing→completed / cancelled) with toast + optimistic update; quick "reply on WhatsApp" link
- [ ] Dashboard "recent orders" + new-order count wired
- **Acceptance:** placing an order writes a correct row (server-priced) + opens WhatsApp; admin can find it, read it, and move it through statuses.

### Phase 8 — Testimonials admin (+ optional site settings)
**Goal:** manage social proof (and basic site content) without code.
- [ ] `server/actions/testimonials.ts`: CRUD + publish toggle + reorder — `requireAdmin()` + Zod + revalidate
- [ ] **List/Edit** (`/admin/testimonials`): `DataTable`/cards, inline publish switch, reorder, create/edit form (name, quote, location)
- [ ] Public `Testimonials` reads `published` only (already DB-backed from Phase 3)
- [ ] *(Optional)* `settings` singleton + `/admin/settings`: WhatsApp number, tagline, collection info → consumed by site/footer/contact
- **Acceptance:** add/edit/hide a testimonial and see the carousel update after revalidation.

### Phase 9 — Hardening, polish & deploy
**Goal:** production-ready, secure, documented.
- [ ] Audit every server action: `requireAdmin()` + Zod + typed errors surfaced as toasts; no client-trusted prices/ids
- [ ] Auth hardening: enable Better Auth **rate limiting** on sign-in, secure/httpOnly cookies, confirm no public sign-up route, session expiry sensible
- [ ] Consistent loading/empty/error states across all admin screens; full keyboard + screen-reader pass; focus management in dialogs/drawers
- [ ] Revalidation correctness: `revalidatePath`/tags after every write so the public site reflects changes
- [ ] Responsive QA at 360/768/1024/1440 for **every** admin screen; reduced-motion pass
- [ ] Update `README.md` (Neon + Supabase + Better Auth setup, scripts) and keep `.env.example` accurate
- [ ] `npm run build` green; smoke-test full public + admin flows; final commit
- **Acceptance:** clean build, secured + validated mutations, documented setup, and an admin that feels as crafted as the storefront.

---

## Engineering standards (applied throughout)

- **Type-safe end to end** — Drizzle inferred types, Zod on every input/mutation, no `any` at boundaries.
- **Server-only secrets** — DB/auth/storage live under `src/server/*`; only `NEXT_PUBLIC_*` reach the client. `.env.local` is git-ignored; `.env.example` documents shape only.
- **Least privilege** — public sign-up disabled; admin guarded by middleware *and* server-side `requireAdmin()`; service-role keys never exposed to the browser.
- **Atomic writes** — transaction-capable Neon driver; multi-row writes (orders) in a transaction.
- **Migrations are source-controlled** — every schema change via `drizzle-kit generate`; never edit the DB by hand.
- **Separation of concerns** — `(site)` (public) vs `admin` route groups; `server/{db,auth,storage,actions}` layers; shared UI primitives.
- **Accessibility & responsiveness** — same standards as the storefront, on every admin screen.
- **Validation snapshots** — order line items snapshot name/price so historical orders stay correct if products change.

## Progress log

- _2026-06-04_ — Plan created; decisions locked (Neon + Drizzle, Better Auth, Supabase Storage, orders persisted + WhatsApp).
- _2026-06-04_ — **Phase 0 done.** Schema (9 tables) + migration `0000_init`; lazy transaction-capable Neon client; `db:*` scripts; fixed Better Auth/kysely bundling. **Phase 1 code done.** Better Auth (Drizzle adapter, no sign-up), `/admin/login`, middleware + `requireAdmin()`, `(site)` route group. Build green. _Awaiting env (`DATABASE_URL`, `BETTER_AUTH_SECRET`, Supabase keys, admin creds) to migrate + seed._
