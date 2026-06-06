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

**`orders`** — add:
`shippingAddress` → **jsonb** (structured: company?, street, suburb, city, province, postalCode); keep `deliveryFeeZAR` (now the chosen rate); add `shippingService (text)`, `shippingServiceCode (text)`, `bobgoOrderId (text)`, `trackingReference (text)`, `trackingUrl (text)`, **`shipmentStatus (text)`** (BobGo `method_status`, updated on each webhook), `paymentProvider (text)`, `paymentReference (text)` (YetoPay transactionId), `paymentStatus (enum: pending|paid|failed|cancelled, default pending)`, `paidAt (timestamp)`.

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
- [ ] Migration: add `products.weightKg/lengthCm/widthCm/heightCm`; drop `products.deliveryFeeZAR`; drop the 5 `settings.delivery*` columns
- [ ] Delete `lib/delivery.ts`; remove `computeDeliveryFee` usage from order actions, OrderModal, OrderForm; remove `deliveryFeeZAR` from cart item + ProductView + product schema/form
- [ ] Remove the **Shipping** tab from Settings (SettingsForm + settings schema/action/getSiteSettings)
- [ ] Product form: a **Shipping** section (weight kg, L×W×H cm) with sensible defaults; product list unaffected
- [ ] Order create/edit temporarily compute delivery = 0 (real value comes from BobGo selection in Phase 4)
- **Acceptance:** old delivery settings gone; products store dimensions; build green; checkout still works (collection-only for now).

### Phase 3 — BobGo shipping service (server)
**Goal:** fetch live delivery rates for a cart + address.
- [ ] `server/shipping/bobgo.ts`: base URL by `sandbox`, Bearer auth, `getRatesAtCheckout({deliveryAddress, items, declaredValue})` → typed `RateOption[]`; `createBobgoOrder(order)` → `{id, ...}`; ZA province normaliser
- [ ] `server/actions/shipping.ts`: `getDeliveryRates({cart:[{slug,qty}], address})` — `requireIntegration('bobgo')`, re-price + dimension items from DB, call BobGo, return `{ok, rates}` or graceful error
- [ ] Map products → BobGo items (`weight_kg`, `*_cm`, price, qty); handle missing dimensions with defaults; collection address from integration config
- **Acceptance:** with a (mock or real) key, the action returns rate options for an address; disabled → clean "delivery unavailable".

### Phase 4 — Checkout page (public)
**Goal:** the multi-step checkout that ends at "Pay".
- [ ] `/checkout` page reads the cart; step 1 contact, step 2 method (collection/delivery; delivery only if BobGo enabled)
- [ ] Delivery step: structured address form (province select) → "Get delivery options" → rate cards (courier, ETA, price) → select
- [ ] Live summary: items, selected delivery (or free collection), total = goods − 10% (own container) + delivery
- [ ] Cart drawer "Place your order" → navigate to `/checkout`; keep the cart contents
- [ ] `createPendingOrder` server action: re-price everything from DB, validate address + selected rate (re-verify the chosen rate's price against BobGo when delivery), persist order (`paymentStatus: pending`, shipping fields, structured address), return `{orderId, orderNumber}`
- **Acceptance:** a customer can go cart → checkout → pick a delivery option → see a correct total; order row is created server-priced.

### Phase 5 — YetoEFT payment
**Goal:** pay online; webhook confirms.
- [ ] `server/payments/yetopay.ts`: signed `createPaymentLink({amount, reference, customer, urls, metadata})` (HMAC request signing) reading config from the integration; typed response
- [ ] Checkout "Pay" → `createPendingOrder` → `createPaymentLink` (reference = orderNumber, metadata.orderId) → redirect to `paymentUrl`
- [ ] Return routes: `/checkout/success`, `/checkout/failed`, `/checkout/cancelled` (success shows the receipt; states are optimistic, await webhook)
- [ ] Webhook `POST /api/webhooks/yetopay`: read **raw body**, verify `X-Webhook-Signature` (HMAC of `webhookSecret`), timestamp freshness, idempotency via `payment_events`/`X-Webhook-ID`; on `payment.completed` set order `paymentStatus: paid`, `paidAt`; revalidate admin
- [ ] **Notify on paid:** order-confirmation **email to the customer** (items + receipt) and a new-paid-order note to the admin (email provider — see Notifications below)
- [ ] Fallback: if YetoPay disabled, checkout "Pay" routes to the existing WhatsApp hand-off instead
- **Acceptance:** (with creds) placing an order opens YetoPay, paying fires the webhook → order paid + customer emailed; signature verified; replays ignored.

### Phase 6 — Post-payment fulfilment + BobGo shipment + tracking
**Goal:** turn a paid delivery order into a real shipment with tracking.
- [ ] On `payment.completed` (delivery + BobGo enabled): `createBobgoOrder(order)` with `channel_order_number = orderNumber`; store `bobgoOrderId`; tolerate failure (admin can retry)
- [ ] BobGo webhook `POST /api/webhooks/bobgo` (plain trusted URL, no token/HMAC): match by `channel_order_number` (unknown → 200 no-op); on **every** call update `trackingReference`, `trackingUrl`, **`shipmentStatus`** (`method_status`); record failures (`status`/`failed_reason`); only ever writes shipping/tracking fields; idempotent but update-on-status-change (not ignore)
- [ ] When the **first** fulfilment webhook arrives (tracking reference set), mark the order **fulfilled** and **email the customer their tracking link**; subsequent webhooks just update `shipmentStatus`
- [ ] Admin order detail: payment status badge, shipping service + cost, address, **tracking link + shipment status**, and manual buttons: "Create shipment", "Mark as paid", "Resend payment link"
- **Acceptance:** a paid delivery order gets a BobGo order id; the fulfilment webhook marks it fulfilled, emails the customer tracking, and each later webhook updates the shipment status in admin.

### Notifications (email) — cross-cutting (used by Phases 5–6)
- [ ] Email sender: **Resend** (admin enters the API key + "from" address as an **integration**, consistent with the others; falls back to env `RESEND_API_KEY`). Off → notifications are skipped, nothing breaks.
- [ ] Branded email templates: **order confirmation / paid** (customer), **tracking / shipped** (customer), **new paid order** (admin).

### Phase 7 — Admin orders & analytics updates
**Goal:** orders + analytics understand payment.
- [ ] Orders list/detail: **payment status** badge + filter; show shipping service; structured address; tracking
- [ ] Admin OrderForm (manual orders): structured address, manual shipping service + fee, payment status
- [ ] Analytics: "Revenue" = orders with `paymentStatus: paid` (replace the completed-only assumption where appropriate); add a "Paid vs unpaid" lens; CSV gains payment columns
- **Acceptance:** admin can see/manage paid vs unpaid, shipping, and tracking; analytics reflect real paid revenue.

### Phase 8 — Hardening, docs & deploy
**Goal:** production-ready and documented.
- [ ] Webhook security: raw-body HMAC, timestamp window, idempotency, fail-closed; never log secrets; mask in UI
- [ ] Validation + friendly errors across checkout (address, rate selection, payment init failures); loading/disabled states; reduced-motion
- [ ] `.env.example` + README: how to configure BobGo & YetoPay in `/admin/integrations`, webhook URLs to register (`/api/webhooks/yetopay`, `/api/webhooks/bobgo`), sandbox notes, the YetoPay gaps to confirm
- [ ] Responsive QA of `/checkout` + admin integrations at 360/768/1024/1440; final `npm run build`; smoke test of the full flow (mocked where no creds)
- **Acceptance:** clean build; secure verified webhooks; documented setup; smooth end-to-end flow.

---

## Risks / things to confirm with the owner
- **Live credentials**: BobGo API key + collection address; YetoPay base URL, apiKey/apiSecret/merchantId/webhookSecret. Until provided, we ship the wiring with safe fallbacks and mock-test.
- **YetoPay doc gaps**: real API base URL, sandbox key, and the verify-transaction endpoint (webhook-authoritative for now).
- **Deploy**: webhooks need a public URL — register `/api/webhooks/yetopay` and `/api/webhooks/bobgo` in each provider's dashboard against the live domain.

## Progress log
- _2026-06-06_ — Plan created after studying the BobGo Wix plugin, the YetoEFT API doc, and the yetopayeft reference project. Decisions locked; data-model + phased tasks defined. Awaiting go-ahead to build Phase 1.
