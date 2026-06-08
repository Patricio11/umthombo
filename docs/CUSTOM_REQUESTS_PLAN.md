# Custom Order Requests — Build Plan

Turn `/custom` from a marketing page into a real **commission pipeline**:
a client requests a bespoke piece → admin quotes (price + ETA, optional deposit)
or declines (with a reason) → client pays a deposit → admin builds it → admin
sends a balance link when ready → done. Reuses existing payments, Resend email,
Supabase uploads, the admin panel, and the deferred-account checkout pattern.

## Decisions (locked)
- **Access:** guests *and* logged-in. Guests submit with name/email/phone;
  logged-in users get it pre-filled and tracked in their dashboard (deferred
  account offered, exactly like checkout).
- **Notifications:** **email is fully automated** on every status change.
  **WhatsApp** = one-tap `wa.me` links (client emails carry a "Chat on
  WhatsApp" button to the business; the admin screen has a one-tap link to
  message the *client*). True automated WhatsApp (Cloud API) is a later,
  separate integration — out of scope here.
- **Money:** **deposit now**, **balance via a second payment link later**. Both
  reuse the active gateway (Yoco / YetoPay). Balance = quoted price − deposit.

## Status lifecycle

```
pending ──accept──▶ quoted ──deposit paid (or no deposit)──▶ in_progress
   │                  │                                          │
   └──decline──▶ declined (reason)                         mark ready
                                                                 │
                                                                 ▼
                                              ready ──balance paid──▶ completed
any non-terminal ──▶ cancelled
```

- `pending` — submitted, awaiting admin.
- `quoted` — admin set price + ETA (+ optional deposit). Client notified; if a
  deposit is required, the client pays it from here.
- `in_progress` — work underway. Auto on deposit payment; or admin sets it
  manually when no deposit was required.
- `ready` — piece finished; admin generates the **balance** payment link.
- `completed` — balance settled. *(terminal)*
- `declined` *(terminal, has a reason)* · `cancelled` *(terminal, either side)*

## Data model — `custom_requests`

| Field | Type | Notes |
|---|---|---|
| id | uuid pk | |
| requestNumber | text | human ref, e.g. `CR-260608-7F3A` |
| statusToken | text | unguessable; powers the guest status link |
| userId | uuid? | fk user when logged in |
| name, email, phone | text | contact |
| categoryId | uuid? | fk categories (candle/home/skin/hampers) |
| title | text | short summary |
| scent, colour, size, occasion | text? | structured spec fields |
| quantity | int | default 1 |
| notes | text | free description |
| referenceImages | jsonb | Supabase URLs (optional uploads) |
| status | enum | the lifecycle above |
| declineReason / adminNote | text? | |
| quotedPriceZAR | int? | whole rand, set on quote |
| etaText / etaDate | text? / date? | "2–3 weeks" and/or a date |
| depositRequired | bool | |
| depositZAR | int? | admin-set amount |
| depositPaidAt | timestamptz? | set by webhook |
| balancePaidAt | timestamptz? | set by webhook |
| createdAt / updatedAt / respondedAt | timestamptz | |

Deposit/balance payments are tracked **on the request** (via gateway metadata
`{ customRequestId, kind: "deposit" | "balance" }`) — they do **not** create
full e-commerce orders, so they stay decoupled from BobGo shipment/fulfilment.
Shipping the finished piece is arranged when it's `ready` (manually or a normal
order later).

---

## Phase 1 — Request submission (client)

**Goal:** a smooth public form that creates a request and notifies both sides.

- `custom_requests` table + status enum + migration.
- Zod schema + types (`lib/custom-request-schema.ts`).
- Page `/(site)/custom/request` (linked from a new CTA on `/custom`):
  grouped sections — *What you'd like* (category, title, scent, colour, size,
  quantity, occasion, notes) → *Inspiration* (optional reference image uploads,
  reuse the existing upload action) → *Your details* (name/email/phone,
  pre-filled if logged in; "create an account" deferred-checkbox).
  Uses the custom `Select`/`Checkbox`, feels like checkout.
- Prominent line: **"A deposit may be applied if your request is accepted — it'll
  be deducted from your total."**
- Spam protection: honeypot (server-enforced) + rate-limit + Turnstile when
  logged out (all already in the codebase).
- Action `createCustomRequest` → generates `requestNumber` + `statusToken`,
  links `userId` if present, optionally fires the deferred-account flow.
- Emails (Resend): **admin lead alert** + **client confirmation** (with the
  guest status link + a "Chat on WhatsApp" button).

**Done when:** a guest and a logged-in user can submit; both emails fire; the
row appears in admin; spam is blocked.

## Phase 2 — Admin management & quoting

**Goal:** admin can review, decline (reason) or quote (price/ETA/deposit), and
drive the lifecycle, with the client notified at each step.

- `/admin/custom-requests` list (DataTable: number, client, category, status,
  date, quoted price) + status filter; nav entry + a dashboard count/badge.
- Detail page: full spec + reference images + a response panel:
  - **Decline** (reason) → `declined`.
  - **Quote/Accept**: quoted price, ETA (text + optional date), **deposit
    toggle + amount** → `quoted`.
  - Transitions: **Mark in progress**, **Mark ready** (generates the balance
    link), **Mark completed**, **Cancel**.
  - One-tap **wa.me link to the client** for ad-hoc chat.
- Each transition sends the client an automated email (+ WhatsApp button);
  deposit/balance-paid events also email the admin.

**Done when:** every transition works, is guarded/auditable, and notifies.

## Phase 3 — Deposit & balance payments (reuse the gateways)

**Goal:** client pays the deposit, later the balance, through the active PSP.

- Extract a small `startGatewayPayment({ amountZAR, reference, metadata,
  successUrl, failureUrl })` from `placeOrder` that resolves the active gateway
  (Yoco/YetoPay) and returns a `redirectUrl`. `placeOrder` and custom-request
  payments both use it.
- **Pay deposit** (from the client status page / dashboard) and **Pay balance**
  (after `ready`) → redirect to the gateway with metadata
  `{ customRequestId, kind }`.
- Webhook routes (`/api/webhooks/yoco`, `/api/webhooks/yetopay`) branch on
  `metadata.customRequestId`: mark `depositPaidAt` → `in_progress` (notify
  admin), or `balancePaidAt` → `completed`. Idempotent via `payment_events`.
- Balance amount = `quotedPriceZAR − depositZAR`; deposit clearly shown as
  deducted everywhere.

**Done when:** deposit and balance both pay end-to-end and move the status.

## Phase 4 — Client visibility

**Goal:** clients can track and act without friction.

- **Logged-in:** "My requests" in the account dashboard — status, ETA, and
  Pay-deposit / Pay-balance buttons.
- **Guests:** tokened status page `/custom/request/[token]` (link in every
  email) — same status + pay buttons, no login.
- `/custom` page CTA: **"Request a custom piece."**

**Done when:** both guest and logged-in clients can view status and pay.

## Out of scope (future)
- **WhatsApp Cloud API** — true automated WhatsApp (Meta verification + approved
  templates + per-message cost). Slots in behind the existing notification
  hooks when wanted.
- In-app threaded clarifications (we lean on WhatsApp for the back-and-forth).
- Request analytics / conversion reporting.

## Reused building blocks
Payments (Yoco/YetoPay + webhooks + `payment_events`), Resend email, Supabase
image upload, admin DataTable/primitives, deferred-account checkout flow,
honeypot + Turnstile, custom `Select`/`Checkbox`.
