# Admin User / Customer Management — Plan

Every checkout and custom request now creates a user, but there's no admin
screen to see or manage them. This adds a **Customers** section. Roles stay
read-only (no promote/demote UI — admins are seeded).

## Scope (chosen)
- **View + history** — list (search, role filter, newest first) + a detail page
  with profile and the customer's orders, custom requests, addresses, reviews.
- **Password & verify** — send a reset / set-password link; mark email verified.
- **Delete / disable** — disable login (a `banned` flag checked at sign-in) and
  delete an account (their orders stay, just unlinked).

## Data
- Add `banned` boolean (default false) to the `user` table + expose it as a
  Better-Auth `additionalField` (`input:false`) so it's on the session.

## Auth
- `databaseHooks.session.create.before` → throw for banned users (blocks login).
- The session guard also treats a banned user as logged-out (defence in depth).

## Queries (`src/server/db/admin-users.ts`)
- `getAdminUsers()` — users + order count, newest first.
- `getAdminUser(id)` — profile + orders (`getUserOrders`), requests
  (`getUserCustomRequests`), addresses (`getUserAddresses`), reviews.

## Actions (`src/server/actions/users.ts`, all `requireAdmin`)
- `sendUserReset(id)` → `auth.api.requestPasswordReset` (redirect `/set-password`).
- `markUserVerified(id)` → set `emailVerified`.
- `setUserBanned(id, banned)` → guard (not yourself); set flag; revoke sessions.
- `deleteUserAccount(id)` → guard (not yourself / not last admin); delete
  sessions + accounts, then the user (FKs unlink orders/reviews/requests,
  cascade addresses).

## Admin UI
- Nav: **Customers** (Users icon).
- `/admin/customers` — DataTable (name, email, role, verified, joined, #orders).
- `/admin/customers/[id]` — profile card + action buttons + history sections.

## Status
- Building now.
