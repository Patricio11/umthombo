"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Sparkles,
  MapPin,
  Settings,
  LogOut,
  Store,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/account", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/account/orders", label: "Orders", icon: Package },
  { href: "/account/requests", label: "Custom requests", icon: Sparkles },
  { href: "/account/addresses", label: "Addresses", icon: MapPin },
  { href: "/account/settings", label: "Settings", icon: Settings },
];

export function AccountShell({
  firstName,
  email,
  children,
}: {
  firstName: string;
  email: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  const onSignOut = async () => {
    await signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-dvh bg-cream-2">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:flex lg:gap-10 lg:py-12">
        {/* Sidebar / top nav */}
        <aside className="lg:w-56 lg:shrink-0">
          <div className="flex items-center justify-between">
            <Link href="/" aria-label="Umthombo Creations" className="text-olive">
              <Logo />
            </Link>
            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-ink-soft transition-colors hover:text-olive lg:hidden"
            >
              <Store size={14} /> Shop
            </Link>
          </div>

          <div className="mt-5 hidden lg:block">
            <p className="text-xs uppercase tracking-wide text-ink-soft">
              Signed in
            </p>
            <p className="mt-1 truncate font-medium text-ink">{firstName}</p>
            <p className="truncate text-xs text-ink-soft">{email}</p>
          </div>

          <nav className="mt-5 flex gap-1.5 overflow-x-auto pb-1 lg:mt-6 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
            {NAV.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, item.exact);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-medium transition-colors lg:rounded-xl",
                    active
                      ? "bg-olive text-cream"
                      : "bg-cream text-ink-soft hover:text-olive lg:bg-transparent"
                  )}
                >
                  <Icon size={17} />
                  {item.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex shrink-0 items-center gap-2.5 rounded-full px-4 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:text-clay lg:hidden"
            >
              <LogOut size={17} /> Sign out
            </button>
          </nav>

          <div className="mt-8 hidden gap-1.5 lg:flex lg:flex-col">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm text-ink-soft transition-colors hover:text-olive"
            >
              <Store size={17} /> Back to shop
            </Link>
            <button
              type="button"
              onClick={onSignOut}
              className="inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-left text-sm text-ink-soft transition-colors hover:text-clay"
            >
              <LogOut size={17} /> Sign out
            </button>
          </div>
        </aside>

        {/* Content */}
        <main className="mt-6 min-w-0 flex-1 lg:mt-0">{children}</main>
      </div>
    </div>
  );
}
