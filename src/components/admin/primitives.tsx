import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Surfaces                                                           */
/* ------------------------------------------------------------------ */
export function Card({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-cream-3 bg-cream p-5 sm:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AdminPageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 text-sm text-ink-soft">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Status badges                                                      */
/* ------------------------------------------------------------------ */
const statusStyles: Record<string, string> = {
  // order statuses
  new: "bg-olive/15 text-olive",
  confirmed: "bg-mist/20 text-[#3f5a73]",
  preparing: "bg-clay/12 text-clay",
  completed: "bg-ink/10 text-ink",
  cancelled: "bg-clay/10 text-clay/70",
  // product statuses
  active: "bg-olive/15 text-olive",
  draft: "bg-taupe/20 text-taupe",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
        statusStyles[status] ?? "bg-cream-2 text-ink-soft"
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}

const paymentStyles: Record<string, string> = {
  paid: "bg-olive/15 text-olive",
  pending: "bg-taupe/20 text-taupe",
  failed: "bg-clay/12 text-clay",
  cancelled: "bg-clay/10 text-clay/70",
};
const paymentLabels: Record<string, string> = {
  paid: "Paid",
  pending: "Unpaid",
  failed: "Payment failed",
  cancelled: "Payment cancelled",
};

export function PaymentBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        paymentStyles[status] ?? "bg-cream-2 text-ink-soft"
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {paymentLabels[status] ?? status}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty state                                                        */
/* ------------------------------------------------------------------ */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      {icon && <div className="mb-4 text-taupe">{icon}</div>}
      <p className="font-display text-xl">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-ink-soft">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Form fields                                                        */
/* ------------------------------------------------------------------ */
export const inputClass =
  "w-full rounded-xl border border-cream-3 bg-cream px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft/55 transition-colors focus:border-olive focus:outline-none focus:ring-2 focus:ring-olive/15 disabled:opacity-60";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  required,
  children,
  className,
}: {
  label?: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="flex items-center gap-1 text-sm font-medium text-ink"
        >
          {label}
          {required && <span className="text-clay">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-clay">{error}</p>
      ) : hint ? (
        <p className="text-xs text-ink-soft">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />;
}

export function Textarea(
  props: React.TextareaHTMLAttributes<HTMLTextAreaElement>
) {
  return (
    <textarea
      {...props}
      className={cn(inputClass, "resize-y", props.className)}
    />
  );
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(inputClass, "pr-8", props.className)} />
  );
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        checked ? "bg-olive" : "bg-cream-3"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-cream shadow transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}
