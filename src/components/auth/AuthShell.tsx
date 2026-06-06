import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

/** Centered, on-brand wrapper for the customer auth pages. */
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-cream-2 px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Link href="/" aria-label="Umthombo Creations" className="text-olive">
            <Logo animate />
          </Link>
          <h1 className="mt-6 font-display text-3xl">{title}</h1>
          {subtitle && (
            <p className="mt-1.5 text-sm text-ink-soft">{subtitle}</p>
          )}
        </div>
        {children}
        {footer && (
          <div className="mt-6 text-center text-sm text-ink-soft">{footer}</div>
        )}
        <p className="mt-8 text-center">
          <Link
            href="/"
            className="link-underline text-xs text-ink-soft hover:text-olive"
          >
            ← Back to the shop
          </Link>
        </p>
      </div>
    </main>
  );
}

export const authInputCls =
  "w-full rounded-xl border border-cream-3 bg-cream px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 transition-colors focus:border-olive focus:outline-none";
