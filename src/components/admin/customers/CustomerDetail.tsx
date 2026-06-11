"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  KeyRound,
  BadgeCheck,
  Ban,
  CircleCheck,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import type { AdminUserDetail } from "@/server/db/admin-users";
import { Card, StatusBadge, PaymentBadge, inputClass } from "@/components/admin/primitives";
import { StatusPill } from "@/components/admin/custom-requests/StatusPill";
import { Stars } from "@/components/product/Stars";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/admin/Toast";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import {
  sendUserPasswordLink,
  setUserPassword,
  markUserVerified,
  setUserBanned,
  deleteUserAccount,
} from "@/server/actions/users";
import { formatZAR } from "@/lib/format";
import { cn } from "@/lib/utils";

const fmtDate = (d: Date | string) =>
  new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(d));

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  if (value == null || value === "") return null;
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-ink-soft">{label}</span>
      <span className="text-right text-ink">{value}</span>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Card className="space-y-3">
      <h2 className="font-display text-lg">
        {title}{" "}
        <span className="text-sm font-normal text-ink-soft">({count})</span>
      </h2>
      {count === 0 ? (
        <p className="text-sm text-ink-soft">None yet.</p>
      ) : (
        children
      )}
    </Card>
  );
}

export function CustomerDetail({
  detail,
  isSelf,
}: {
  detail: AdminUserDetail;
  isSelf: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, ok: string) =>
    start(async () => {
      const res = await fn();
      if (res.ok) toast.success(ok);
      else toast.error(res.error ?? "Something went wrong.");
      router.refresh();
    });

  const onSetPassword = () => {
    if (pw.length < 8) {
      toast.error("Use at least 8 characters.");
      return;
    }
    start(async () => {
      const res = await setUserPassword(detail.id, pw);
      if (res.ok) {
        toast.success("Password updated.");
        setPw("");
        setShowPw(false);
      } else {
        toast.error(res.error ?? "Couldn’t set the password.");
      }
      router.refresh();
    });
  };

  const onDelete = async () => {
    const yes = await confirm({
      title: `Delete ${detail.name}?`,
      description:
        "This removes their account and sign-in. Their past orders are kept (just unlinked). This can’t be undone.",
      confirmLabel: "Delete account",
      danger: true,
    });
    if (!yes) return;
    start(async () => {
      const res = await deleteUserAccount(detail.id);
      if (res.ok) {
        toast.success("Account deleted.");
        router.push("/admin/customers");
        router.refresh();
      } else toast.error(res.error ?? "Couldn’t delete.");
    });
  };

  return (
    <div className="space-y-6">
      <Link
        href="/admin/customers"
        className="link-underline inline-flex items-center gap-2 text-sm text-ink-soft"
      >
        <ArrowLeft size={16} /> Customers
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">{detail.name}</h1>
          <p className="text-sm text-ink-soft">{detail.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {detail.role === "admin" && (
            <span className="rounded-full bg-olive/15 px-2.5 py-1 text-xs font-medium text-olive">
              Admin
            </span>
          )}
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
              detail.emailVerified ? "bg-olive/15 text-olive" : "bg-taupe/20 text-taupe"
            }`}
          >
            {detail.emailVerified ? "Verified" : "Unverified"}
          </span>
          {detail.banned && (
            <span className="rounded-full bg-clay/12 px-2.5 py-1 text-xs font-medium text-clay">
              Disabled
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* History */}
        <div className="space-y-6">
          <Section title="Orders" count={detail.orders.length}>
            <ul className="divide-y divide-cream-2">
              {detail.orders.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm transition-colors hover:text-olive"
                  >
                    <span className="min-w-0">
                      <span className="font-medium">{o.orderNumber}</span>{" "}
                      <span className="text-ink-soft">· {fmtDate(o.createdAt)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <PaymentBadge status={o.paymentStatus} />
                      <StatusBadge status={o.status} />
                      <span className="tabular-nums">{formatZAR(o.totalZAR)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Custom requests" count={detail.requests.length}>
            <ul className="divide-y divide-cream-2">
              {detail.requests.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/custom/request/${r.statusToken}`}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm transition-colors hover:text-olive"
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-medium">{r.title}</span>{" "}
                      <span className="text-ink-soft">· {r.requestNumber}</span>
                    </span>
                    <StatusPill status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Reviews" count={detail.reviews.length}>
            <ul className="space-y-3">
              {detail.reviews.map((rv) => (
                <li key={rv.id} className="border-b border-cream-2 pb-3 last:border-0">
                  <div className="flex items-center justify-between gap-3">
                    <Stars value={rv.rating} size={15} />
                    <span className="text-xs text-ink-soft">
                      {rv.productName ?? "—"} · {rv.status}
                    </span>
                  </div>
                  {rv.title && <p className="mt-1 text-sm font-medium">{rv.title}</p>}
                  <p className="mt-0.5 text-sm text-ink-soft">{rv.body}</p>
                </li>
              ))}
            </ul>
          </Section>
        </div>

        {/* Profile + actions */}
        <div className="space-y-6">
          <Card className="space-y-1">
            <h2 className="mb-2 font-display text-lg">Profile</h2>
            <Row label="Phone" value={detail.phone} />
            <Row label="Role" value={<span className="capitalize">{detail.role}</span>} />
            <Row
              label="Marketing emails"
              value={detail.marketingOptIn ? "Opted in" : "No"}
            />
            <Row label="Joined" value={fmtDate(detail.createdAt)} />
          </Card>

          <Section title="Addresses" count={detail.addresses.length}>
            <ul className="space-y-2 text-sm">
              {detail.addresses.map((a) => (
                <li key={a.id} className="text-ink-soft">
                  {[a.streetAddress, a.localArea, a.city, a.code]
                    .filter(Boolean)
                    .join(", ")}
                  {a.isPrimary && (
                    <span className="ml-1.5 text-xs text-olive">· primary</span>
                  )}
                </li>
              ))}
            </ul>
          </Section>

          <Card className="space-y-3">
            <div>
              <h2 className="font-display text-lg">Set a new password</h2>
              <p className="mt-1 text-xs text-ink-soft">
                Applies immediately — no email needed.{" "}
                {isSelf
                  ? "You’ll stay signed in."
                  : "Signs the user out of other devices."}
              </p>
            </div>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="New password"
                autoComplete="new-password"
                className={cn(inputClass, "pr-10")}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onSetPassword();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? "Hide password" : "Show password"}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-ink-soft transition-colors hover:text-ink"
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={pending || pw.length < 8}
              onClick={onSetPassword}
            >
              {pending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <KeyRound size={15} />
              )}
              Set password
            </Button>
          </Card>

          <Card className="space-y-2">
            <h2 className="font-display text-lg">Actions</h2>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={pending}
              onClick={() =>
                run(() => sendUserPasswordLink(detail.id), "Password link sent.")
              }
            >
              <KeyRound size={15} /> Send password link
            </Button>
            {!detail.emailVerified && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={pending}
                onClick={() =>
                  run(() => markUserVerified(detail.id), "Email marked verified.")
                }
              >
                <BadgeCheck size={15} /> Mark email verified
              </Button>
            )}
            {!isSelf && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => setUserBanned(detail.id, !detail.banned),
                      detail.banned ? "Account enabled." : "Account disabled."
                    )
                  }
                >
                  {detail.banned ? (
                    <>
                      <CircleCheck size={15} /> Enable login
                    </>
                  ) : (
                    <>
                      <Ban size={15} /> Disable login
                    </>
                  )}
                </Button>
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={pending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-clay transition-colors hover:bg-clay/10 disabled:opacity-60"
                >
                  {pending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Trash2 size={15} />
                  )}
                  Delete account
                </button>
              </>
            )}
            {isSelf && (
              <p className="text-xs text-ink-soft">
                This is your own account — disable/delete are off.
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
