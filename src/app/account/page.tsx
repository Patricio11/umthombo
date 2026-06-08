import Link from "next/link";
import {
  Package,
  Sparkles,
  MapPin,
  Settings,
  Store,
  ArrowRight,
} from "lucide-react";
import { requireUser } from "@/server/auth/guard";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const user = await requireUser("/account");
  const firstName = (user.name || "").trim().split(/\s+/)[0] || "there";

  return (
    <>
      <p className="eyebrow text-olive">Your account</p>
      <h1 className="mt-2 font-display text-3xl sm:text-4xl">Hi {firstName} 🌱</h1>
      <p className="mt-2 text-ink-soft">
        Manage your orders, saved addresses and details.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <DashCard
          href="/account/orders"
          icon={<Package size={20} />}
          title="Your orders"
          hint="Track, view and reorder"
        />
        <DashCard
          href="/account/requests"
          icon={<Sparkles size={20} />}
          title="Custom requests"
          hint="Quotes, deposits & progress"
        />
        <DashCard
          href="/account/addresses"
          icon={<MapPin size={20} />}
          title="Addresses"
          hint="Save delivery addresses"
        />
        <DashCard
          href="/account/settings"
          icon={<Settings size={20} />}
          title="Settings"
          hint="Profile, password & emails"
        />
        <DashCard
          href="/shop"
          icon={<Store size={20} />}
          title="Shop"
          hint="Browse the collection"
        />
      </div>
    </>
  );
}

function DashCard({
  href,
  icon,
  title,
  hint,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-4 rounded-2xl border border-cream-3 bg-cream p-5 transition-colors hover:border-olive/40"
    >
      <div className="flex items-center gap-3.5">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-cream-2 text-olive">
          {icon}
        </span>
        <div>
          <p className="font-medium text-ink">{title}</p>
          <p className="text-sm text-ink-soft">{hint}</p>
        </div>
      </div>
      <ArrowRight
        size={18}
        className="text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:text-olive"
      />
    </Link>
  );
}
