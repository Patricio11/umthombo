# BobPay — Payment Gateway Integration Plan

Add **BobPay** (bobpay.co.za, the Bob Group's payments arm — same family as the BobGo shipping we already use) as a **third** online payment gateway, alongside **YetoEFT** and **Yoco**. BobPay is a **redirect** gateway — the customer is sent to BobPay's hosted page and returns via `success_url`. This is the **same pattern as Yoco** (also redirect-only), so the integration is a close clone of it.

> One gateway, many methods: BobPay's hosted page itself offers card, Instant EFT, Apple/Google Pay, Capitec Pay, PayShap, Scan-to-Pay, manual EFT, etc. We create one payment intent and let BobPay present the method menu.

---

## What BobPay actually is (from their WooCommerce plugin source)

| Thing | Value |
|---|---|
| API base | `https://api.bobpay.co.za` (prod) · `https://api.sandbox.bobpay.co.za` (sandbox) |
| Hosted page | `https://my.bobpay.co.za` (prod) · `https://sandbox.bobpay.co.za` (sandbox) |
| Auth | `Authorization: Bearer <api_key>` |
| Create payment | `POST {api}/payments/intents/link` |
| Amount format | **Rand, 2 decimals** (e.g. `"150.00"`) — NOT cents (unlike Yoco) |
| Response | `short_url` (preferred) or `url` — the hosted payment page to send the customer to |
| Webhook verify | **Echo-back**: `POST {api}/payments/intents/validate` with the raw webhook body → HTTP `200` = genuine. No HMAC. (Optional source-IP allowlist: `13.245.84.126`, `13.246.100.25`.) |
| Webhook payload | `{ custom_payment_id, status: 'paid'\|'unpaid', amount, payment: { id, payment_method } }` |

**Create-intent request fields:** `custom_payment_id` (our unique ref), `amount`, `email`, `mobile_number`, `item_name`, `item_description`, `notify_url`, `success_url`, `pending_url`, `cancel_url`, `source`, optional `payment_method`.

**Key difference from Yoco/YetoPay:** the webhook carries **only `custom_payment_id`**, not an arbitrary metadata object. So we put our existing unique reference (`orderNumber` like `UMT-…`, or `requestNumber` like `CR-…`) in `custom_payment_id` and resolve the record by that on the webhook. (We already mint and store both.)

---

## Locked decisions

| Area | Choice |
|---|---|
| **Role** | A third gateway *alongside* YetoEFT + Yoco (not a replacement). **[confirmed]** |
| **Presentation** | **Redirect only** — top-level navigate to BobPay's `short_url`, return via `success_url`. Same as Yoco. No iframe. **[confirmed]** |
| **Credentials** | Build code-complete against the documented sandbox API; keys pasted into `/admin/integrations` later, then a sandbox end-to-end test. **[confirmed]** |
| **Amount** | Rand, 2-decimal string. A dedicated formatter (don't reuse Yoco's cents). |
| **Reference** | `custom_payment_id = our reference` (orderNumber / requestNumber). Webhook resolves by it. |
| **Webhook auth** | Echo-back to `/payments/intents/validate` (authoritative) + optional IP allowlist. Idempotent via the existing `payment_events` table. |
| **Config** | DB-managed in `/admin/integrations` (api key, sandbox toggle, source) — like every other provider. Secrets masked. |
| **Methods** | Let BobPay present its full method menu (don't pin `payment_method`). |

---

## How it slots into the existing gateway architecture

Mirrors the Yoco integration almost exactly. Touch points:

| File | Change |
|---|---|
| `lib/integrations.ts` | Add `"bobpay"` to `IntegrationKey` + `PaymentProvider`; `BobpayConfig` (apiKey, sandbox, source); `SECRET_FIELDS.bobpay = ["apiKey"]`; `INTEGRATION_META.bobpay`; **add to the configurable whitelist** (the gap that 404'd Yoco). |
| `server/db/integrations.ts` | `getBobpayConfig()`. |
| `server/payments/bobpay.ts` *(new)* | `createBobpayIntent(config, input)` → `short_url`; `verifyBobpayWebhook(config, rawBody)` → echo-back to `/payments/intents/validate`; rand formatter; sandbox URL switch. |
| `server/payments/gateway.ts` | Add `bobpay` to the available map + a `bobpay` branch in `startGatewayPayment` (so custom-request deposits/balances work through it too). |
| `app/api/webhooks/bobpay/route.ts` *(new)* | Receive → verify (echo-back) → resolve by `custom_payment_id` (order vs custom request by prefix) → mark paid idempotently → fire fulfilment (emails + BobGo order) / custom-request advance. |
| `db/settings` + Integrations UI | `paymentProvider` active-gateway picker gains a 3rd option; "let customers choose" lists all *ready* gateways. |
| Checkout (`CheckoutClient`, payment options) | Add BobPay as a provider option; on select, redirect to `short_url` (exactly the Yoco redirect path — no iframe). |
| Admin integration card | BobPay config form (api key, sandbox, source) + register/test. |

---

## Phases

### Phase 1 — Config + client
- [x] `BobpayConfig`, integration metadata, secret fields, configurable whitelist.
- [x] `getBobpayConfig()`; admin Integrations card (api key, sandbox toggle, source).
- [x] `bobpay.ts`: `createBobpayIntent` + `verifyBobpayWebhook` + rand formatter.

### Phase 2 — Gateway + webhook
- [x] `startGatewayPayment` `bobpay` branch.
- [x] `/api/webhooks/bobpay` — echo-back verify, resolve by reference, idempotent mark-paid, fire order fulfilment / custom-request advance.
- [x] `payment_events` row per webhook (replay-safe).

### Phase 3 — Checkout UX
- [x] Add BobPay to the active-gateway selector + customer-choice options (3-way).
- [x] On select → redirect to `short_url` (the Yoco redirect path). Return via `success_url`; webhook is authoritative for paid.

### Phase 4 — Custom requests + polish
- [x] Confirm deposits/balances route through BobPay (they use `startGatewayPayment`).
- [x] Docs (README integrations table + webhook URL `…/api/webhooks/bobpay`), `.env`/admin notes, sandbox test pass, green build.

---

## Status

**Code-complete ✓** — all phases built, green build. **Pending:** paste sandbox API key into `/admin/integrations → Bob Pay`, then one end-to-end sandbox test (create intent → pay → webhook → order flips to paid). No migration needed (provider columns are free-text).

## Resolved

1. **Gateway line-up** → third option beside YetoEFT + Yoco (keep all three).
2. **Credentials** → build code-complete now; sandbox keys added later, then the Phase-0 spike picks the default presentation. Both iframe + redirect paths shipped.
