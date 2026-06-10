"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Users, ArrowRight } from "lucide-react";
import type { AdminUserRow } from "@/server/db/admin-users";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { EmptyState, inputClass } from "@/components/admin/primitives";
import { cn } from "@/lib/utils";

const FILTERS = ["all", "customer", "admin"] as const;
type Filter = (typeof FILTERS)[number];

const fmtDate = (d: Date | string) =>
  new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(d));

function Tag({ children, tone }: { children: React.ReactNode; tone: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tone
      )}
    >
      {children}
    </span>
  );
}

export function CustomersTable({ rows }: { rows: AdminUserRow[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.role !== filter) return false;
      if (!needle) return true;
      return (
        r.name.toLowerCase().includes(needle) ||
        r.email.toLowerCase().includes(needle)
      );
    });
  }, [rows, q, filter]);

  const columns: Column<AdminUserRow>[] = [
    {
      key: "user",
      header: "Customer",
      primary: true,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium">
            {r.name}
            {r.role === "admin" && (
              <span className="ml-2 align-middle">
                <Tag tone="bg-olive/15 text-olive">Admin</Tag>
              </span>
            )}
            {r.banned && (
              <span className="ml-2 align-middle">
                <Tag tone="bg-clay/12 text-clay">Disabled</Tag>
              </span>
            )}
          </p>
          <p className="truncate text-xs text-ink-soft">{r.email}</p>
        </div>
      ),
    },
    {
      key: "verified",
      header: "Email",
      cell: (r) =>
        r.emailVerified ? (
          <Tag tone="bg-olive/15 text-olive">Verified</Tag>
        ) : (
          <Tag tone="bg-taupe/20 text-taupe">Unverified</Tag>
        ),
    },
    {
      key: "orders",
      header: "Orders",
      align: "right",
      cell: (r) => <span className="tabular-nums text-ink-soft">{r.orderCount}</span>,
    },
    {
      key: "joined",
      header: "Joined",
      cell: (r) => <span className="text-ink-soft">{fmtDate(r.createdAt)}</span>,
    },
    {
      key: "go",
      header: "",
      align: "right",
      cell: (r) => (
        <Link
          href={`/admin/customers/${r.id}`}
          className="inline-flex items-center gap-1 text-sm text-olive hover:text-olive-soft"
        >
          Open <ArrowRight size={14} />
        </Link>
      ),
    },
  ];

  const toolbar = (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or email…"
            className={cn(inputClass, "pl-9")}
          />
        </div>
        <div className="flex gap-1 rounded-full bg-cream-2 p-1">
          {FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition-colors",
                filter === s ? "bg-cream text-ink shadow-sm" : "text-ink-soft hover:text-ink"
              )}
            >
              {s === "all" ? "All" : s + "s"}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-ink-soft">
        {list.length} of {rows.length} customers
      </p>
    </div>
  );

  return (
    <DataTable
      columns={columns}
      rows={list}
      getKey={(r) => r.id}
      toolbar={toolbar}
      empty={
        <EmptyState
          icon={<Users size={28} />}
          title={q || filter !== "all" ? "No matching customers" : "No customers yet"}
          description={
            q || filter !== "all"
              ? "Try a different search or filter."
              : "Customers who order or request a custom piece appear here."
          }
        />
      }
    />
  );
}
