# Umthombo — Shipping (BobGo) + Payments (YetoEFT) + Integrations

Turning the shop into a **full transactional system**: live shipping rates from **BobGo**, real **online payment** via **YetoEFT (YetoPay)**, and an **Integrations** admin section where the owner switches each provider on/off and enters its credentials. The current flat/percent/per-product delivery model is **removed**.

> Plan-first. Track here; tick tasks as they land. Each phase ends green (`npm run build`).

---

## The new order flow (the target)

```
Cart → Checkout
  1. Contact details (name, email, phone)
  2. Method:  Collection (free)  |  Delivery
  3. If Delivery → structured address (street, suburb, city, province, postal)
       → "Get delivery options"  → BobGo /rates-at-checkout
       → list of couriers/prices/ETAs  → customer selects one
  4. Order summary: items + (selected delivery) + total
  5. Pay
       • If a payment provider is enabled → create order (payment: pending)
         → YetoPay payment link → redirect to paymentUrl → customer pays
         → return to /checkout/success → webhook marks order PAID
         → (delivery) create BobGo shipment → tracking via webhook
       • If no payment provider enabled → fall back to the current
         WhatsApp hand-off (order saved, confirmed over WhatsApp)
Admin sees the order with payment status, shipping service + tracking.
```

**Graceful degradation (important):** every integration is optional and admin-toggled.
- BobGo **off/unconfigured** → delivery is unavailable; checkout is **collection-only**.
- YetoPay **off/unconfigured** → checkout falls back to the existing **WhatsApp** order (nothing breaks while the owner is still getting credentials).

---

## Locked decisions

| # | Decision | Choice |
|---|---|---|
| 1 | Checkout UI | A dedicated **`/checkout`** page (multi-step), not the cramped modal. Cart's "Place your order" → `/checkout`. |
| 2 | Where credentials live | **In the DB**, entered by admin in the Integrations section (the yetopayeft pattern) — **not** env. Secrets masked in the UI. |
| 3 | Delivery pricing | **Only** BobGo live rates (the old flat/%/per-product model is deleted). Collection = free. |
| 4 | Payment-first | Order is created when the customer hits **Pay** (status `new`, payment `pending`); webhook flips payment → `paid`. |
| 5 | Checkout methods | Both managed by admin toggles: **Pay online** (YetoEFT) and **Order via WhatsApp** (secondary). At least one is always available; if both off, WhatsApp is the guaranteed fallback. |
| 6 | Address | **Structured** (street, suburb, city, province‑select, postal) because BobGo needs a ZA province `zone`. |
| 7 | Confirmation of payment | The **webhook** is authoritative (verified HMAC); the success redirect is optimistic UX only. |
| 8 | Email | **Resend** is a core, system-wide integration (admin enters the key) — used for order/shipping emails now and the future customer dashboard. |
| 9 | WhatsApp | A managed toggle (on/off in Integrations), not removed — secondary checkout option. |

---

## Integration API reference (verified from the sources)

### BobGo — `https://api.bobgo.co.za/v2` (sandbox `https://api.sandbox.bobgo.co.za/v2`)
- Auth: `Authorization: Bearer {apiKey}`.
- **Rates:** `POST /rates-at-checkout`
  - body: `{ collection_address, delivery_address, items[], declared_value }`
  - address shape: `{ company, street_address, local_area, city, zone, country:"ZA", code }` (`zone` = ZA province code: WC/GP/KZN/EC/FS/LP/MP/NC/NW)
  - item shape: `{ description, price, quantity, length_cm, width_cm, height_cm, weight_kg }`
  - response: `{ rates: [{ service_code, service_name, total_price, currency, min_delivery_date, max_delivery_date }] }`
- **Order (post-payment):** `POST /orders` → `{ channel_order_number, customer_*, currency, buyer_selected_shipping_cost, buyer_selected_shipping_method, delivery_address, order_items:[{description,sku,vendor,unit_price,qty,unit_weight_kg}], payment_status }` → returns `{ id, fulfillment_status, ... }` (no waybill yet)
- **Tracking/fulfilment webhook (BobGo → us)** — registered in the BobGo dashboard against `POST /api/webhooks/bobgo`:
  - join key: **`channel_order_number`** = our orderNumber (we set it on `POST /orders`); missing → 400.
  - tracking: **`method_reference`** (the waybill) → `trackingUrl = https://track.bobgo.co.za/{method_reference}`.
  - lifecycle: **`method_status`** (`pending-collection` → `collected` → `in-transit` → `delivered`…), **`status`** (`success`/failed), **`failed_reason`**; plus `id`, `order_id`, `time_created/modified`, `order_items[]`.
  - **Fires repeatedly** (once per status change) → handler must **update** `shipmentStatus`/tracking on every call, not dedupe-and-ignore.
  - **Plain URL, no token, no HMAC.** BobGo only accepts a bare webhook URL (`/api/webhooks/bobgo`) — it does **not** support an appended token or query string. The admin subscribes to the **fulfilment-update** event in the BobGo dashboard. We treat the webhook as trusted: it only ever updates an **existing** order matched by `channel_order_number` (unknown order → 200 no-op), it only writes shipping/tracking fields (never money or order totals), and it never creates orders or marks payment. So the worst a forged call can do is set a tracking string on an order whose number the caller already knows — low risk, no token needed.
- Config the admin enters: `apiKey`, `sandbox` (bool), `collectionAddress` (the 7 fields). The fulfilment webhook URL is shown read-only to paste into the BobGo dashboard (no token).

### YetoEFT / YetoPay — base URL admin-entered (doc host `https://yetopay.co.za`)
- Request headers: `Authorization: Bearer {apiKey}`, `X-Merchant-ID`, `X-Timestamp` (Unix **seconds**), `X-Signature: sha256=<hmac>`, `Content-Type: application/json`.
- Request signature: `HMAC_SHA256(key = SHA256_hex(apiSecret), msg = merchantId + timestamp + rawBody)`.
- **Create link:** `POST /api/payment-links` → `{ amount (ZAR rands, ≥1), reference (unique), paymentMethod?, description?, customerName?, customerEmail?, successUrl?, failureUrl?, cancelledUrl?, notifyUrl?, expiresInHours?, metadata? }`
  - response: `{ success, data:{ transactionId, paymentUrl, token, reference, amount, status, ... } }` → redirect to `data.paymentUrl`.
- **Webhook (YetoPay → us):** events `payment.completed|failed|cancelled|transaction.created`; payload `{ id, type, data:{ id, reference, amount, status, paymentMethod, bankName, metadata, completedAt }, timestamp, merchantId }`.
  - headers: `X-Webhook-Signature` (**bare** hex HMAC-SHA256 of `webhookSecret` over the raw body), `X-Webhook-Timestamp` (ms), `X-Webhook-ID` (idempotency), `X-Webhook-Event`.
  - paid status = `data.status === "completed"` / event `payment.completed`.
- Config the admin enters: `baseUrl`, `apiKey`, `apiSecret`, `merchantId`, `webhookSecret`, default `paymentMethod`.
- **Known gaps to confirm with YetoPay later:** real base URL + a sandbox/test key, and the GET "verify transaction" endpoint (we rely on the webhook). Build is webhook-authoritative so this isn't blocking.

---

## Data-model changes

**New table `integrations`** (singleton-per-key credential bag, à la `payment_services`):
`id, key (unique), name, category ('shipping'|'payment'|'email'|'channel'), enabled (bool, default false), config (jsonb), createdAt, updatedAt`.
Seeded keys: **`bobgo`** (shipping), **`yetopay`** (payment), **`resend`** (email — `apiKey`, `fromEmail`, `fromName`), **`whatsapp`** (channel — no creds; toggles the secondary WhatsApp checkout, uses the number from settings).

**`products`** — add shipping dimensions: `weightKg (numeric), lengthCm/widthCm/heightCm (numeric)`. **Remove** `deliveryFeeZAR`.

**`settings`** — **remove** `deliveryEnabled, deliveryChargeEnabled, deliveryFeeType, deliveryFeeZAR, deliveryPercent` (Shipping tab dropped from Settings; lives in Integrations now).

**`orders`** — add (migration `0009_order_payment_shipping`):
keep `shippingAddress` as **text** (flattened, human-readable for admin/WhatsApp) and add **`shippingAddressJson` jsonb** (structured `DeliveryAddress`: company?, streetAddress, localArea, city, zone, code, country — for BobGo fulfilment); keep `deliveryFeeZAR` (now the chosen rate); add `shippingService (text)`, `shippingServiceCode (text)`, `bobgoOrderId (text)`, `trackingReference (text)`, `trackingUrl (text)`, **`shipmentStatus (text)`** (BobGo `method_status`, updated on each webhook), `paymentProvider (text)`, `paymentReference (text)` (YetoPay transactionId), `paymentStatus (enum: pending|paid|failed|cancelled, default pending)`, `paidAt (timestamptz)`.

**New table `payment_events`** (idempotency + audit of webhook deliveries): `id, provider, eventId (unique), orderId, type, status, raw (jsonb), createdAt`.

Delete `src/lib/delivery.ts` (computeDeliveryFee) and all its callers.

---

## Phases & tasks

> Legend per phase: **Goal → Tasks → Acceptance**. Note: live API calls need the owner's real BobGo/YetoPay credentials; until then we test the wiring with the integrations disabled (collection-only + WhatsApp fallback) and with mocked responses.

### Phase 1 — Integrations foundation ⭐
**Goal:** an admin section to switch BobGo + YetoPay on/off and store their credentials.
- [ ] `integrations` table + migration; seed `bobgo`, `yetopay`, `resend`, `whatsapp` rows (disabled, empty config)
- [ ] `server/db/integrations.ts`: `getIntegration(key)` (cached), `isIntegrationEnabled(key)`, typed config getters `getBobgoConfig()`, `getYetopayConfig()`, `getResendConfig()` (return null when disabled/unconfigured)
- [ ] Zod schemas for each config; `server/actions/integrations.ts`: `updateIntegration(key, {enabled, config})` — `requireAdmin` + validate + merge + revalidate
- [ ] `/admin/integrations` list — cards per integration (icon, name, category, on/off `Switch`, "Configured ✓/Needs setup")
- [ ] `/admin/integrations/[key]` config form — BobGo (apiKey, sandbox, collection address, read-only fulfilment webhook URL), YetoEFT (baseUrl, apiKey, apiSecret, merchantId, webhookSecret, paymentMethod), Resend (apiKey, fromEmail, fromName), WhatsApp (just the on/off + helper text); secrets **masked**
- [ ] "Integrations" added to admin nav
- **Acceptance:** can enable/disable each integration and save credentials; values persist; secrets masked; build green.

### Phase 2 — Remove old delivery model + product shipping dimensions
**Goal:** delete the flat/%/per-product fee system; products carry parcel data for BobGo.
- [x] Migrations `0007_drop_delivery_model` (drop `products.deliveryFeeZAR` + the 5 `settings.delivery*` columns) and `0008_product_shipping_dims` (add `products.weightKg/lengthCm/widthCm/heightCm` as `real`) — generated + applied
- [x] Deleted `lib/delivery.ts`; removed `computeDeliveryFee`/`DeliveryConfig` from order actions, OrderModal, admin OrderForm; removed `deliveryFeeZAR` from cart item, ProductView, queries, product schema/form, AddToOrder, useQuickAdd
- [x] Removed the **Shipping** tab from Settings (SettingsForm + settings schema/action + `getSiteSettings.delivery`)
- [x] Product form: a **Shipping** card (weight kg, L×W×H cm)
- [x] Public WhatsApp/OrderModal flow → delivery = 0, shown as "Quoted on WhatsApp" / "to be confirmed"; admin OrderForm gets a **manual Shipping (ZAR)** input (added `adminOrderSchema.deliveryFeeZAR`); `orders.deliveryFeeZAR` column kept (holds the BobGo-selected rate later)
- **Acceptance:** ✅ old delivery settings gone; products store dimensions; build green; WhatsApp order + admin order still work.

### Phase 3 — BobGo shipping service (server)
**Goal:** fetch live delivery rates for a cart + address.
- [x] `server/shipping/bobgo.ts`: base URL by `sandbox`, Bearer auth, `getRatesAtCheckout(config, {deliveryAddress, items, declaredValueZAR})` → typed `RateOption[]` (rounded to whole rand, sorted cheapest-first); `createBobgoOrder(config, input)` → `{id, raw}` (ready for Phase 6); `normalizeZone()` province normaliser
- [x] `server/actions/shipping.ts`: `getDeliveryRates({items:[{slug,qty}], address})` — zod-validated address, `getBobgoConfig()` (null → graceful "Delivery isn’t available right now."), re-price + dimension items from DB, call BobGo, return `{ok, rates}` or graceful error
- [x] Map products → BobGo items (`weight_kg`, `*_cm`, price, qty); missing dimensions fall back to `PARCEL_DEFAULTS` (0.5 kg, 15³ cm); collection address from integration config
- [x] Client-safe `lib/shipping.ts` — `DeliveryAddress`, `RateOption`, `PARCEL_DEFAULTS`, `rateEta()` helper
- **Acceptance:** ✅ action returns sorted rate options for an address; disabled/unconfigured → clean "delivery unavailable"; build green.

### Phase 4 — Checkout page (public)
**Goal:** the multi-step checkout that ends at "Pay".
- [x] `/checkout` page (`(site)/checkout`) reads the cart; contact + method (delivery only if BobGo enabled); structured address form (province select) → "Get delivery options" → courier rate cards (name, ETA via `rateEta`, price) → select; cheapest pre-selected when only one
- [x] Live sticky summary: items, own-container −10%, delivery (selected rate / "Enter address" / "Select an option" / Free collection), total; address edits invalidate fetched rates
- [x] Cart drawer "Place your order" → **"Checkout"** → `router.push('/checkout')` (cart kept); removed the WhatsApp `OrderModal` trigger (fallback returns in Phase 5)
- [x] `createPendingOrder` action: re-prices from DB, for delivery **re-verifies the chosen rate against BobGo** (stale/unavailable → refresh error), persists order (`paymentStatus: pending`, shipping service/code, text + jsonb address), returns `{orderId, orderNumber, totalZAR}`
- [x] `/checkout/success?order=…` confirmation page (`getOrderConfirmation` minimal non-sensitive summary) — doubles as the post-payment return page in Phase 5
- [x] Migration `0009_order_payment_shipping` (order shipping/payment columns + `payment_status` enum + `payment_events` table) generated + applied
- **Acceptance:** ✅ cart → checkout → pick a delivery option → correct total; order row created server-priced (`pending`); build green.

### Phase 5 — YetoEFT payment
**Goal:** pay online; webhook confirms.
- [x] `server/payments/yetopay.ts`: signed `createPaymentLink(config, {...})` — request signing `X-Signature: sha256=HMAC(SHA256(apiSecret), merchantId+timestamp+rawBody)`, signs the exact sent body; typed result; plus `verifyWebhookSignature()` (bare-hex HMAC, constant-time)
- [x] `placeOrder` action: `createPendingOrder` → if YetoEFT configured, `createPaymentLink` (reference = orderNumber, metadata.orderId, success/failure/cancelled/notify URLs) → store `paymentProvider`/`paymentReference` → return `redirectUrl`; client redirects via `window.location`
- [x] Return routes: `/checkout/success` (clears cart on mount; "Payment received" when paid, "Order placed" while pending) and `/checkout/cancelled` (cart kept, "Try again" → /checkout). failureUrl reuses cancelled
- [x] Webhook `POST /api/webhooks/yetopay`: reads **raw body**, verifies `X-Webhook-Signature`, idempotent via `payment_events` + `X-Webhook-ID`; `payment.completed` → `paymentStatus: paid` + `paidAt`; failed/cancelled set accordingly; unmatched/duplicate → 200. **Owner subscribes this URL in the YetoPay dashboard** (shown read-only in the integration form)
- [x] WhatsApp fallback: when YetoEFT is off but WhatsApp is on, `placeOrder` builds a pre-filled wa.me link from the saved order and returns it (client opens it + lands on success); else "manual" — order recorded, owner follows up
- [ ] **Notify on paid:** customer order-confirmation email + admin new-paid note — **deferred to Phase 6** (Resend), wired at the same `payment.completed` hook
- **Acceptance:** ✅ build green; placing an order (with creds) opens YetoPay, paying fires the webhook → order paid; signature verified; replays ignored. Email-on-paid lands in Phase 6.

### Phase 6 — Post-payment fulfilment + BobGo shipment + tracking
**Goal:** turn a paid delivery order into a real shipment with tracking.
- [x] On `payment.completed` (first paid): `handleOrderPaid(orderId)` — best-effort, never throws into the webhook. For delivery + BobGo on: `createBobgoOrder` with `channel_order_number = orderNumber`, items dimensioned from the products join; stores `bobgoOrderId`; tolerates failure (owner can retry). Order `status` auto-advances `new → confirmed` on paid
- [x] BobGo webhook `POST /api/webhooks/bobgo` (plain trusted URL, no token/HMAC): missing `channel_order_number` → 400; unknown order → 200 no-op; idempotent/audit via `payment_events` (`bobgo:{id}:{status}:{ref}`); on each call `applyBobgoFulfilment` updates `trackingReference`, `trackingUrl` (`track.bobgo.co.za/{ref}`), **`shipmentStatus`** (`method_status`); `delivered` → status `completed`, tracking set → `preparing`
- [x] First waybill (trackingReference null→set) → **email the customer their tracking link** (once); later webhooks just update `shipmentStatus`
- [ ] Admin order detail: payment badge, shipping service + cost, tracking link + shipment status, manual actions — **moved to Phase 7** (admin orders & analytics)
- **Acceptance:** ✅ build green; a paid delivery order creates a BobGo order id; the fulfilment webhook updates tracking/shipment status idempotently and emails tracking once. (Admin surfacing in Phase 7.)

### Notifications (email) — cross-cutting (used by Phases 5–6)
- [x] Email sender: **Resend** integration (`server/email/resend.ts` — `sendEmail` reads `getResendConfig()`, off → returns false, nothing breaks)
- [x] Branded email templates (`server/email/templates.ts`): **order confirmation / paid** (customer), **tracking / shipped** (customer), **new paid order** (admin → `settings.email`, reply-to customer). Wired in `handleOrderPaid` + `applyBobgoFulfilment`.

### Phase 7 — Admin orders & analytics updates
**Goal:** orders + analytics understand payment.
- [x] Orders list: **payment badge** column + Paid/Unpaid filter. Detail: `PaymentBadge` in the header + a **Payment & shipping** card (provider, paidAt, ref; courier service + cost, shipment status, tracking link, BobGo id) and manual actions **Mark as paid** / **Create BobGo shipment** (`OrderFulfilmentActions`)
- [x] Manual actions (`orders.ts`): `markOrderPaid` (→ runs `handleOrderPaid`: emails + shipment) and `createShipment` (→ `createBobgoShipment`, idempotent). `createBobgoShipment` extracted from `handleOrderPaid` for reuse
- [x] Admin OrderForm (manual orders): **Payment** status select (paid → stamps `paidAt`, provider `manual`, fires `handleOrderPaid` on edit-to-paid) + courier service field + manual shipping fee
- [x] `AdminOrderDetail` now `typeof orders.$inferSelect & {items}` so all payment/shipping columns surface; `AdminOrderRow` += `paymentStatus`
- [x] Analytics: added a **Paid** scope (`paymentStatus = paid`) — now the **default** revenue lens (alongside Completed / Incl. pending); CSV export gains Payment / Payment-via / Courier / Tracking columns
- **Acceptance:** ✅ admin sees/manages paid vs unpaid, shipping & tracking; analytics default to real paid revenue; build green.

### Phase 8 — Hardening, docs & deploy
**Goal:** production-ready and documented.
- [x] Webhook security: YetoPay verifies **raw-body HMAC** (`X-Webhook-Signature`, constant-time), **idempotent** via `payment_events`, **fail-closed** (bad sig → 401; no secret → ack-and-ignore). BobGo trusted-by-construction (order-scoped, shipping-only writes) + idempotent. No secrets logged; secrets masked in UI. *(Timestamp-window intentionally omitted — idempotency already blocks replays, and a strict clock gate would drop legitimately delayed provider retries.)*
- [x] Checkout: friendly errors (address/rate/payment-init), loading + disabled states (rate fetch, place order); no unguarded motion (reduced-motion safe). Graceful degradation everywhere (BobGo off → collection-only; YetoEFT off → WhatsApp/manual; Resend off → skip)
- [x] `.env.example` + README: added `NEXT_PUBLIC_APP_URL`, an **Integrations & webhooks** guide (table, product shipping dims, webhook URLs to register, sandbox + YetoPay gaps), updated checkout/admin/file-tree sections
- [x] Responsive `/checkout` (single-column on mobile, sticky summary on lg) + admin integrations grid; **final `next build` clean**; all new routes present (`/checkout`, `/checkout/success|cancelled`, `/api/webhooks/yetopay|bobgo`)
- **Acceptance:** ✅ clean build; verified/idempotent webhooks; documented setup; smooth, gracefully-degrading end-to-end flow.

---

## Risks / things to confirm with the owner
- **Live credentials**: BobGo API key + collection address; YetoPay base URL, apiKey/apiSecret/merchantId/webhookSecret. Until provided, we ship the wiring with safe fallbacks and mock-test.
- **YetoPay doc gaps**: real API base URL, sandbox key, and the verify-transaction endpoint (webhook-authoritative for now).
- **Deploy**: webhooks need a public URL — register `/api/webhooks/yetopay` and `/api/webhooks/bobgo` in each provider's dashboard against the live domain.

## Progress log
- _2026-06-06_ — Plan created after studying the BobGo Wix plugin, the YetoEFT API doc, and the yetopayeft reference project. Decisions locked; data-model + phased tasks defined. Awaiting go-ahead to build Phase 1.
