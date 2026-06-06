import Link from "next/link";
import { requireUser } from "@/server/auth/guard";
import { Logo } from "@/components/brand/Logo";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

// Minimal dashboard — the full account area (orders, addresses, reorder) lands
// in Phase 1B. This makes the signed-in flow work end-to-end today.
export default async function AccountPage() {
  const user = await requireUser("/account");
  const firstName = (user.name || "").trim().split(/\s+/)[0] || "there";

  return (
    <main className="mx-auto max-w-2xl px-5 py-20 sm:px-8">
      <Link href="/" aria-label="Umthombo Creations" className="text-olive">
        <Logo />
      </Link>
      <p className="eyebrow mt-8 text-olive">Your account</p>
      <h1 className="mt-2 font-display text-4xl">Hi {firstName} 🌱</h1>
      <p className="mt-3 text-ink-soft">
        You’re signed in. Your full dashboard — orders, saved addresses and
        one-tap reorder — is on the way.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/shop"
          className="inline-flex items-center justify-center rounded-full bg-olive px-6 py-3 text-sm font-medium text-cream transition-colors hover:bg-olive-soft"
        >
          Continue shopping
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border border-ink/20 px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-olive hover:text-olive"
        >
          Home
        </Link>
      </div>
    </main>
  );
}
