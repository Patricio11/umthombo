"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  User,
  LayoutDashboard,
  Package,
  LogOut,
  ChevronDown,
  Shield,
} from "lucide-react";
import { authClient, signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type SessionUser = { name?: string; role?: string } | null;

export function AccountMenu() {
  const [user, setUser] = useState<SessionUser>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Fetch the session on the client only (avoids running auth hooks during
  // static prerender of the storefront). Re-fetch on navigation so the menu
  // reflects sign in / sign out.
  useEffect(() => {
    let active = true;
    authClient
      .getSession()
      .then((res) => {
        if (!active) return;
        setUser((res?.data?.user as SessionUser) ?? null);
        setLoaded(true);
      })
      .catch(() => active && setLoaded(true));
    return () => {
      active = false;
    };
  }, [pathname]);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!loaded) return <span className="inline-block h-10 w-10" />; // reserve space, no flash

  if (!user) {
    return (
      <Link
        href="/login"
        aria-label="Sign in"
        className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm text-ink-soft transition-colors hover:text-olive"
      >
        <User size={18} />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }

  const isAdmin = user.role === "admin";
  const firstName = (user.name || "").trim().split(/\s+/)[0] || "Account";

  const onSignOut = async () => {
    await signOut();
    setOpen(false);
    router.push("/");
    router.refresh();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm text-ink transition-colors hover:text-olive"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-olive/15 text-xs font-medium uppercase text-olive">
          {firstName[0]}
        </span>
        <span className="hidden max-w-[8rem] truncate sm:inline">{firstName}</span>
        <ChevronDown
          size={15}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-cream-3 bg-cream shadow-xl"
        >
          <MenuLink href="/account" icon={<LayoutDashboard size={16} />}>
            Dashboard
          </MenuLink>
          <MenuLink href="/account/orders" icon={<Package size={16} />}>
            My orders
          </MenuLink>
          {isAdmin && (
            <MenuLink href="/admin" icon={<Shield size={16} />}>
              Admin
            </MenuLink>
          )}
          <button
            type="button"
            onClick={onSignOut}
            role="menuitem"
            className="flex w-full items-center gap-2.5 border-t border-cream-2 px-4 py-3 text-left text-sm text-ink-soft transition-colors hover:bg-cream-2 hover:text-clay"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  icon,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex items-center gap-2.5 px-4 py-3 text-sm text-ink transition-colors hover:bg-cream-2 hover:text-olive"
    >
      {icon}
      {children}
    </Link>
  );
}
