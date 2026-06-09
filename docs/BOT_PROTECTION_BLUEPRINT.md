# Bot & Spam Protection - Reusable Blueprint

A portable, layered recipe for protecting **login / register / password-reset /
checkout** (and any sensitive form) from bots and spam - without annoying real
users. Copy the files, wire the forms, add two env keys. Done.

Built for **Next.js (App Router) + Better Auth**, but the honeypot half is
framework-agnostic and there's a "generalising" section at the end for other
stacks / auth libraries.

---

## 1. Philosophy - defence in layers

No single control stops everything. Stack cheap-and-broad with
strong-and-targeted so each layer covers the previous one's gap:

| Layer | Stops | Cost | Friction | Bypassable? |
|---|---|---|---|---|
| **Rate limiting** | Brute force, floods | Free (built into Better Auth) | None | Slows, doesn't stop |
| **Email verification** | Throwaway/fake signups | Free | One click | Neutralises fake accounts |
| **Honeypot** | Naive form-filling bots | Free, no keys | None (invisible) | Yes, by direct API hits |
| **Turnstile (CAPTCHA)** | Scripted/headless bots | Free, needs keys | ~Invisible | Hard |

**Key principle:** the honeypot is the free, instant, no-setup layer that works
*before* you configure anything; Turnstile is the server-verified layer that
closes the honeypot's "direct API call" gap. Use both.

> **Don't protect what isn't exposed.** A "contact form" that only opens a
> `mailto:`/WhatsApp deep link client-side has **no server endpoint** - a bot
> can't abuse it. Audit each form for an actual server write/email/payment
> before adding friction.

---

## 2. What you need

- **Rate limiting** - Better Auth has it built in (see §6). If you're not on
  Better Auth, add your own (e.g. Upstash Ratelimit) on the sensitive routes.
- **Cloudflare account** (free) for Turnstile keys.
- Everything is **gated on env keys**: with no keys set, forms work normally
  (honeypot + rate-limits only). No half-broken states.

---

## 3. The honeypot (framework-agnostic)

A decoy field hidden from humans and assistive tech but auto-filled by dumb
bots. If it comes back non-empty → reject.

### `src/lib/honeypot.ts`

```ts
/**
 * Honeypot anti-bot field. A decoy input that's hidden from real users (and
 * assistive tech) but that naive bots happily fill in. If it comes back with
 * any value, the submitter is almost certainly a bot.
 */
export const HONEYPOT_NAME = "company_website";

/** True when the honeypot was filled - treat the submission as a bot. */
export function isHoneypotFilled(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}
```

### `src/components/ui/Honeypot.tsx`

```tsx
import { HONEYPOT_NAME } from "@/lib/honeypot";

/**
 * Visually-hidden decoy field. Positioned off-screen (NOT `display:none`, which
 * some bots skip), hidden from assistive tech and removed from the tab order so
 * a real person never reaches it. Bots that auto-fill every field populate it -
 * the server then rejects the submission.
 */
export function Honeypot({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden"
    >
      <label>
        Company website
        <input
          type="text"
          name={HONEYPOT_NAME}
          tabIndex={-1}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}
```

**Why off-screen, not `display:none`?** Some bots skip fields with
`display:none`/`hidden`. Off-screen positioning + `aria-hidden` + `tabIndex=-1`
+ `autocomplete="off"` keeps it invisible to people and password managers while
still "present" enough that form-fillers take the bait.

> The parent form must be `position: relative` (Tailwind `relative`) so the
> `absolute` honeypot anchors to it.

---

## 4. The CAPTCHA - Cloudflare Turnstile widget

Invisible "are you human?" check. Renders **nothing** unless a site key is set,
so the form works before keys exist. On success it yields a token you send to
your server for verification.

### `src/components/auth/Turnstile.tsx`

```tsx
"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

/**
 * Cloudflare Turnstile - an invisible "are you human?" check. Renders nothing
 * unless NEXT_PUBLIC_TURNSTILE_SITE_KEY is set, so forms work before keys are
 * configured. On success it hands a token to `onVerify`; send that token to the
 * server (Better Auth: as the `x-captcha-response` header). The server only
 * *enforces* it when the secret key is also set.
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadTurnstile(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Turnstile failed to load"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export interface TurnstileHandle {
  /** Discard the used token and fetch a fresh one (call after a failed submit). */
  reset: () => void;
}

export const Turnstile = forwardRef<
  TurnstileHandle,
  { onVerify: (token: string) => void; onExpire?: () => void }
>(function Turnstile({ onVerify, onExpire }, ref) {
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  // Keep latest callbacks without re-rendering the widget.
  const onVerifyRef = useRef(onVerify);
  onVerifyRef.current = onVerify;
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useImperativeHandle(ref, () => ({
    reset: () => {
      if (widgetId.current && window.turnstile) {
        window.turnstile.reset(widgetId.current);
      }
    },
  }));

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;
    loadTurnstile()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widgetId.current = window.turnstile.render(container.current, {
          sitekey: SITE_KEY,
          callback: (token: string) => onVerifyRef.current(token),
          "expired-callback": () => onExpireRef.current?.(),
          "error-callback": () => onExpireRef.current?.(),
          appearance: "interaction-only", // show only when a challenge is needed
          theme: "light",
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetId.current);
        } catch {
          /* ignore */
        }
        widgetId.current = null;
      }
    };
  }, []);

  if (!SITE_KEY) return null;
  return <div ref={container} className="flex justify-center [&:empty]:hidden" />;
});
```

**Gotchas baked in:**
- Script loaded **once** via a shared promise (multiple widgets won't double-load it).
- Callbacks held in **refs** so passing inline `onVerify`/`onExpire` doesn't
  re-render the widget on every parent render (empty `useEffect` deps).
- **Tokens are single-use.** After a failed submit, call `ref.reset()` and clear
  your token state to get a fresh one - the integration below does this.
- `appearance: "interaction-only"` keeps it invisible unless a real challenge is
  needed.

---

## 5. Wiring a form (the pattern)

Same shape every time: hold `hp` (honeypot) + `captcha` (token) state, drop on
honeypot, send the token, reset on failure.

```tsx
"use client";
import { useRef, useState } from "react";
import { Turnstile, type TurnstileHandle } from "@/components/auth/Turnstile";
import { Honeypot } from "@/components/ui/Honeypot";
import { isHoneypotFilled } from "@/lib/honeypot";

function MyForm() {
  const [hp, setHp] = useState("");
  const [captcha, setCaptcha] = useState<string | null>(null);
  const captchaRef = useRef<TurnstileHandle>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isHoneypotFilled(hp)) return; // silent drop for bots

    const { error } = await signIn.email(
      { email, password },
      // Better Auth: pass the token as a header (2nd arg = fetch options)
      captcha ? { headers: { "x-captcha-response": captcha } } : undefined
    );

    if (error) {
      captchaRef.current?.reset(); // single-use token - refresh it
      setCaptcha(null);
      // ...show error
    }
  };

  return (
    <form onSubmit={onSubmit} className="relative space-y-3">
      <Honeypot value={hp} onChange={setHp} />
      {/* ...your fields... */}
      <Turnstile
        ref={captchaRef}
        onVerify={setCaptcha}
        onExpire={() => setCaptcha(null)}
      />
      <button type="submit">Submit</button>
    </form>
  );
}
```

Apply to **login**, **signup**, **forgot-password**. (For signup, also run your
password check after the honeypot drop.)

---

## 6. Server side - Better Auth

### 6a. Rate limiting (already strong - keep it)

```ts
// src/server/auth/auth.ts
export const auth = betterAuth({
  // ...
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30, // default per-IP per window
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },     // brute-force throttle
      "/sign-up/email": { window: 60, max: 5 },
      "/request-password-reset": { window: 300, max: 3 },
      "/send-verification-email": { window: 300, max: 3 },
    },
  },
});
```

### 6b. Turnstile via Better Auth's captcha plugin

```ts
import { captcha } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  // ...
  plugins: [
    // Only enforced when a secret key is set, so dev (and prod before keys are
    // added) keep working unguarded.
    ...(process.env.TURNSTILE_SECRET_KEY
      ? [
          captcha({
            provider: "cloudflare-turnstile",
            secretKey: process.env.TURNSTILE_SECRET_KEY,
          }),
        ]
      : []),
    // nextCookies() MUST stay last.
    nextCookies(),
  ],
});
```

The plugin protects these endpoints by default and reads the token from the
**`x-captcha-response`** header:

```
/sign-up/email
/sign-in/email
/request-password-reset
```

Pass `endpoints: [...]` to the plugin to customise. Providers supported:
`cloudflare-turnstile`, `google-recaptcha`, `hcaptcha`, `captchafox`.

### 6c. Honeypot on your own server actions (e.g. checkout)

For endpoints you own (not handled by Better Auth), enforce the honeypot
server-side. Add the field to your schema and reject early:

```ts
// schema
export const createPendingOrderSchema = z.object({
  // ...real fields...
  hp: z.string().optional(), // honeypot - must stay empty
});

// action
import { isHoneypotFilled } from "@/lib/honeypot";

export async function placeOrder(input: CreatePendingOrderInput) {
  if (isHoneypotFilled(input.hp)) {
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  // ...continue...
}
```

In the form, render `<Honeypot value={hp} onChange={setHp} />` inside a
`relative` container and include `hp` in the payload you send to the action.

---

## 7. Environment variables

```bash
# Cloudflare Turnstile (bot protection on login/register/reset)
# Free, invisible CAPTCHA. Create a widget at
# https://dash.cloudflare.com/?to=/:account/turnstile
# Leave BOTH blank to disable (forms then rely on the honeypot + rate limits).
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
```

- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` - public, used by the widget in the browser.
- `TURNSTILE_SECRET_KEY` - server-only; its presence is what turns on
  *enforcement*.

---

## 8. Cloudflare setup (~3 min, free)

1. **Cloudflare Dashboard → Turnstile → Add widget.**
2. Add your domain(s). Add `localhost` too if you want to test locally.
3. Widget mode: **Managed** (recommended) or **Invisible**.
4. Copy the **Site Key** and **Secret Key**.
5. Put them in your env (locally in `.env`, in prod in your host's env vars -
   e.g. Vercel → Settings → Environment Variables).
6. Redeploy. Enforcement turns on because the secret key is now present.

**Cloudflare test keys** (always pass/fail/force-challenge - handy for dev):
- Site key always-passes: `1x00000000000000000000AA`
- Secret key always-passes: `1x0000000000000000000000000000000AA`
- More at the Turnstile docs ("Testing" section).

---

## 9. Testing checklist

- [ ] **No keys set** → forms submit normally (honeypot + rate-limits only).
- [ ] **Honeypot:** fill the hidden field via devtools → submit is silently
      dropped (client) / rejected (server action).
- [ ] **Keys set, happy path** → widget issues a token, submit succeeds.
- [ ] **Keys set, no token** (e.g. block the CF script) → server rejects with a
      captcha error; UI shows "try again" and resets the widget.
- [ ] **Reused token** → second submit fails (single-use); `reset()` issues a
      fresh one.
- [ ] **Rate limit** → hammer `/sign-in/email` >5×/min → throttled.
- [ ] **Screen reader / keyboard** → honeypot is unreachable (tab order skips
      it), no visible artifact.

---

## 10. Generalising beyond Better Auth

**Honeypot** is already portable - the lib + component work anywhere. Enforce
`isHoneypotFilled()` in whatever handles your POST.

**Turnstile without the Better Auth plugin** - verify the token yourself in any
server route:

```ts
async function verifyTurnstile(token: string, ip?: string): Promise<boolean> {
  if (!process.env.TURNSTILE_SECRET_KEY) return true; // disabled
  if (!token) return false;
  const res = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        secret: process.env.TURNSTILE_SECRET_KEY,
        response: token,
        ...(ip ? { remoteip: ip } : {}),
      }),
    }
  );
  const data = (await res.json()) as { success: boolean };
  return data.success === true;
}
```

Send the token from the client however you like (header or body) and gate the
handler on `verifyTurnstile()`. Same idea for **hCaptcha** / **reCAPTCHA** - only
the verify URL and field names differ.

---

## 11. File manifest

```
src/lib/honeypot.ts                  # constant + isHoneypotFilled()
src/components/ui/Honeypot.tsx        # hidden decoy field
src/components/auth/Turnstile.tsx     # invisible CAPTCHA widget (+ reset handle)
src/server/auth/auth.ts               # captcha plugin (gated) + rate limits
src/app/login/page.tsx                # form wiring
src/app/signup/page.tsx               # form wiring (+ honeypot)
src/app/forgot-password/page.tsx      # form wiring
src/lib/checkout-schema.ts            # hp field on the schema
src/server/actions/checkout.ts        # server-enforced honeypot
.env.example                          # the two Turnstile keys
```

---

## 12. Decisions & trade-offs (the honest bit)

- **Honeypot on auth forms is a client-side drop** - a bot POSTing directly to
  the API bypasses it. That's fine: **Turnstile (server-verified) is the layer
  that catches those.** The honeypot's value is (a) free protection *before* you
  set up Cloudflare and (b) genuine server-side enforcement on your own actions
  (checkout).
- **No CAPTCHA on checkout.** Don't add challenges to paying customers. Honeypot
  + server-side validation/re-pricing is enough there.
- **Don't rely on your host's "automatic" protection.** Platform DDoS mitigation
  ≠ form-level spam protection. Vercel's WAF/Attack-Challenge-Mode is a manual,
  paid-tier tool for active attacks, not a default form guard.
- **Email enumeration:** keep forgot-password always returning success
  regardless of whether the email exists.
- **Everything env-gated** so a missing key degrades gracefully instead of
  locking users out.
```
