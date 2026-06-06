# Customer Accounts, Reviews & FAQ — Build Plan

> **✅ DELIVERED (2026-06-06).** All three phases built and committed:
> Phase 1 (accounts 1A–1G), Phase 2 (reviews), Phase 3 (FAQ). Migrations
> 0011–0016 applied. Needs **Resend enabled** for verification/notification
> emails; test the auth + checkout + review flows end-to-end on the deployment.


Adding a **customer** to the system: sign in / sign up, a responsive account
dashboard (orders, saved addresses, reorder), **product reviews** by real
buyers, **new-product notifications**, and a proper **FAQ**.

> **Phases:** 1) Customer accounts → 2) Reviews → 3) FAQ.
> Each phase ships independently and ends green (build + migration + verify).

---

## 0. Honest assessment & key decisions

This is the largest initiative so far. It's very doable on the current stack
(Better Auth already runs the admin; Resend, Drizzle, the checkout and order
model are all in place), but customer auth is a **security + privacy surface**,
not just UI. A few things I want to be straight about, and a few choices that
are genuinely yours to make before I code:

**My honest recommendations**
- **Keep guest checkout.** Forcing sign-up to buy *reduces* sales. Accounts
  should be an optional convenience (save addresses, track orders, reorder,
  review), never a wall in front of the cart.
- **Require email verification for customers.** Otherwise anyone could sign up
  with *your* email and "claim" your past orders. Verification (via Resend) is
  the gate that makes linking past orders by email safe. Small friction, big
  safety win.
- **Marketing/new-product emails must be opt-in (POPIA).** South Africa's POPIA
  treats unsolicited marketing as a no-go. We add a clear opt-in at signup and a
  toggle in account settings. Transactional emails (order/payment/tracking)
  don't need consent; product-announcement emails do.
- **Reviews should be purchase-gated.** Only a customer with a paid order
  containing the product can review it. This is what makes the ★ ratings
  trustworthy to customers *and* to Google (real, abuse-resistant). Admin still
  moderates.

**Decisions — CONFIRMED ✅ (locked 2026-06-06):**
| # | Question | Decision |
|---|---|---|
| D1 | Email verification for customers? | **Required.** Plus a deferred-password "create account at checkout" flow — see below. |
| D2 | New-product marketing emails | **Opt-in** (checkbox; POPIA-compliant). |
| D3 | Review eligibility | **Paid order**, and **admin audits/approves each review before it shows** (moderation). |
| D4 | FAQ source | **Admin-managed table** with a clean management page. |
| D5 | Claim past guest orders by verified email | **Yes** (after verification). |
| D6 | One editable review per product per customer | **Yes.** |

### Account creation flows (D1)
Two ways to get an account, both ending **email-verified with a password set**:

1. **Standard signup** (`/signup`): email + password (with a **strength meter**)
   + name → verification email → verify → signed in.

2. **Create account at checkout (deferred password)** — the smooth path:
   - At checkout, a **"Create an account" checkbox** (uses the email they're
     already entering — no password asked here).
   - On placing the order, we create the account (unverified, no password) and
     send a **verification email**.
   - Clicking the link **verifies the email** and **redirects to a Set-Password
     page** (with the **strength check**); on submit the password is set, the
     account is active and signed in, and the just-placed order is linked.
   - If they don't finish, the order is still saved as a normal (guest) order
     and can be claimed later by verifying that email (D5).

Password rules everywhere: min length + strength meter (length, mixed case,
number/symbol), with a clear, friendly indicator.

---

## 1. Data model (new + changed)

**Better Auth `user`** (extend via additionalFields):
- `role` (exists) — customers default `"customer"`, admin stays `"admin"`.
- `phone` (text, null)
- `marketingOptIn` (bool, default false) — POPIA consent for product emails.

**`orders`** — add:
- `userId` (uuid, null, FK `user` → set null) — set when a logged-in customer
  checks out, or backfilled by **verified** email.

**`addresses`** (new):
- `id, userId (FK user, cascade), label, recipientName, phone, company?,
  streetAddress, localArea, city, zone (province), code (postal), country (ZA),
  isPrimary (bool), createdAt, updatedAt`.
- Exactly one `isPrimary` per user (enforced in the action).

**`reviews`** (new):
- `id, productId (FK product, cascade), userId (FK user, set null),
  orderId (FK order, set null), authorName (snapshot), rating (1–5),
  title?, body, status ('pending'|'published'|'rejected', default 'pending'),
  createdAt, updatedAt`.
- Unique `(userId, productId)` → one editable review per product per customer.

**`faqs`** (new, if D4 = admin-managed):
- `id, question, answer, category?, sortOrder, published, timestamps`.

**`notifications`** (optional, Phase 1G / nice-to-have):
- `id, userId, type, title, body, href?, readAt?, createdAt` — powers an
  in-dashboard bell + an audit trail for product-announcement emails. Can be
  deferred; emails work without it.

Testimonials stay **exactly as they are** (general brand social proof on the
home page) — separate concept from reviews.

---

## PHASE 1 — Customer accounts & dashboard

**Goal:** a customer can sign up, sign in, and manage their profile, addresses,
orders, reorders and notification prefs — without disturbing admin or guest
checkout.

### 1A — Auth foundation
- [ ] Enable Better Auth email/password **sign-up** with role `customer`
      (currently sign-up is disabled / admin-only). Keep admin separate.
- [ ] **Email verification required** (D1) via Resend; **password reset**
      ("forgot password") via Resend; both on the existing email integration.
- [ ] **Set-password page** (`/account/set-password?token=…`) used by the
      checkout deferred-password flow and by password reset — with the
      **strength meter**. Verifying the email lands the user here.
- [ ] Helper to **create an unverified, password-less account** (for the
      checkout checkbox) + send the verify/set-password email.
- [ ] Rate-limit sign-up/sign-in/reset (Better Auth); secrets stay server-only.
- [ ] Route gating: `requireUser()` guard + `/account` middleware (redirect to
      `/login?next=…`). `/admin` gate unchanged; admin→`/account` ok, customer→
      `/admin` blocked.
- [ ] Pages: `/login`, `/signup` (password + strength meter), `/forgot-password`,
      `/account/set-password` — clean, on-brand, **fully responsive**.
- **Accept:** standard signup (verify → signed in) AND checkout-created account
  (verify → set password → signed in) both work; reset works; bots rate-limited;
  admin area unaffected.

### 1B — Header auth state + dashboard shell
- [ ] Header (server-aware): signed-out → **"Sign in"**; signed-in customer →
      account menu (avatar/initial → **Dashboard**, Orders, Sign out); admin →
      link to `/admin`.
- [ ] `/account` customer layout (NOT the admin shell): responsive sidebar/
      drawer, brand-consistent, reduced-motion-safe.
- [ ] Dashboard overview: greeting, recent order, quick links, primary address.
- [ ] `/account/settings`: name, phone, change email (re-verify), change
      password, **"Email me about new products"** toggle (D2).
- **Accept:** header reflects auth state everywhere; dashboard is responsive at
  360/768/1024/1440; settings persist.

### 1C — Saved addresses
- [ ] `addresses` table + migration; Zod schema (ZA provinces, reuse
      `DeliveryAddress` shape + recipient/phone).
- [ ] `/account/addresses`: list as cards, **Add / Edit / Delete**, **Set as
      primary** (one primary, enforced server-side). First address auto-primary.
- [ ] Server actions (`requireUser`, owner-scoped, validated, revalidate).
- **Accept:** a customer manages multiple addresses; exactly one primary.

### 1D — Order history
- [ ] `orders.userId` column + migration. Set it at checkout when logged in;
      **backfill** existing orders to a user by **verified** email (D5) on
      verification / first dashboard load.
- [ ] `/account/orders`: list (number, date, total, status, payment, tracking).
- [ ] `/account/orders/[id]`: items, totals, address, **payment + shipment
      status + tracking link** (reuse the order data we already store).
- [ ] Owner-scoping: a customer can only see their own orders.
- **Accept:** a logged-in customer sees their orders + live tracking; can't see
  anyone else's.

### 1E — Checkout integration (logged-in convenience)
- [ ] If logged in: prefill contact (name/email/phone); show **saved addresses
      as selectable cards**, **primary pre-selected**, switchable; "Use a new
      address" + optional **"Save this address"**.
- [ ] If **not** logged in: a **"Create an account" checkbox** (deferred-password
      flow from §0) — on order, create the unverified account + send the
      verify/set-password email; link the order on completion / by verified email.
- [ ] Link the created order to `userId`; save the new address if asked.
- [ ] Guest checkout path stays exactly as today.
- **Accept:** logged-in checkout is 2 taps (address already there); a guest can
  opt to create an account in one checkbox; guests-who-don't are unaffected.

### 1F — Reorder + product history line
- [ ] **Buy again**: from `/account/orders/[id]` (whole order) and from the
      product page — re-adds items to the cart, **re-priced server-side**.
- [ ] **Product history line**: on a product page, a logged-in customer who
      bought it sees *"You ordered this on {date}"* + a one-tap re-add.
- **Accept:** reorder lands correct items in the cart at current prices; the
  history line shows only for genuine past buyers.

### 1G — New-product notifications
- [ ] Customer pref `marketingOptIn` (settings + signup checkbox, D2).
- [ ] Admin product create/edit: **"Notify customers"** option —
      *"past buyers in this category"* (via `orders.userId → orderItems →
      products.categoryId`) and/or *"all opted-in customers"*.
- [ ] On trigger: resolve recipients (opted-in only), send a branded Resend
      email featuring the new product; batch/throttle; log (optional
      `notifications` table).
- **Accept:** publishing a product can email opted-in similar-buyers; opt-outs
  are never emailed; sending is logged/idempotent.

> **Phase 1 acceptance:** full account lifecycle works end-to-end, guest
> checkout intact, admin untouched, everything responsive, build green.

---

## PHASE 2 — Product reviews

**Goal:** verified buyers leave star reviews; admin moderates; product pages
show ratings and earn ★ rich snippets on Google. (Depends on Phase 1.)

### 2A — Model & gating
- [ ] `reviews` table + migration; queries: `getProductReviews(productId)`
      (published), `getReviewStats(productId)` (avg + count),
      `canReview(userId, productId)` (a **paid** order contains it — D3),
      `getMyReview(userId, productId)`.

### 2B — Customer write/edit review
- [ ] Star input + title/body; from `/account/orders/[id]` per item and from an
      eligible product page. One editable review per product (D6).
- [ ] New/edited reviews enter `pending` (moderation).
- **Accept:** only eligible buyers can submit; resubmission edits, not dupes.

### 2C — Admin moderation
- [ ] Admin **Reviews** section: list + filter (pending/published/rejected, by
      product), **publish / reject / delete**, see author + linked order.
- [ ] Admin nav entry.
- **Accept:** admin controls what's public; pending reviews never show on site.

### 2D — Product page + SEO
- [ ] Product page: average ★, count, published reviews list, "write a review"
      CTA when eligible.
- [ ] `productLd` gains `aggregateRating` + `review[]` when published reviews
      exist → **★ rich results**. (Helper already structured to accept reviews.)
- **Accept:** rich-results test passes; ratings render; no markup when 0 reviews.

### 2E — Review emails (light)
- [ ] Optional: invite-to-review email after an order is paid/delivered;
      notify admin of a new pending review. (Reuses Resend templates.)

> **Phase 2 acceptance:** a real buyer's review flows submit → moderate →
> publish → shows on product + in structured data; build green.

---

## PHASE 3 — FAQ

**Goal:** an on-brand FAQ that ranks (FAQPage schema) and answers real buyer
questions (shipping, collection, payment, custom orders, candle/soap care, eco
packaging, returns, gifting). Independent of Phases 1–2 — **could be pulled
forward as a quick SEO win.**

- [ ] (D4) `faqs` table + admin CRUD (question, answer, category, order,
      publish) **or** a curated `data/faq.ts` if you'd rather keep it simple.
- [ ] `/faq` page: grouped, accordion, on-brand; metadata + canonical.
- [ ] `FAQPage` JSON-LD (`faqLd` in `lib/seo.ts`) → FAQ rich results.
- [ ] Link from footer + Contact; add `/faq` to the sitemap.
- **Accept:** FAQ renders, is editable (if admin-managed), validates as a
  FAQPage rich result, and is in the sitemap.

---

## Risks / things to keep honest about
- **Privacy (POPIA):** product-announcement emails are opt-in; transactional
  emails are fine. Store only what's needed; let customers delete addresses.
- **Order-claiming abuse:** linking guest orders by email is gated behind email
  verification (D1/D5) — without that it's unsafe.
- **Conversion:** never block the cart behind sign-up; accounts are additive.
- **Email deliverability:** depends on the Resend domain being verified
  (already required for order emails).
- **Scope:** Phase 1 is genuinely large (≈ the size of the whole shipping+
  payment initiative). We ship it sub-phase by sub-phase, each green.

## Suggested order of execution
Phases as you asked (Customer → Reviews → FAQ). If you'd like an early SEO win,
**FAQ (Phase 3) is independent and small** — I can slot it in first without
blocking anything. Your call.
