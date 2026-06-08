"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Sparkles, ArrowRight } from "lucide-react";
import type { AdminCustomRequestRow } from "@/server/db/admin-queries";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { EmptyState, inputClass } from "@/components/admin/primitives";
import { StatusPill } from "@/components/admin/custom-requests/StatusPill";
import { CUSTOM_REQUEST_STATUS_LABEL } from "@/lib/custom-request-schema";
import { formatZAR } from "@/lib/format";
import { cn } from "@/lib/utils";

const FILTERS = ["all", "pending", "quoted", "in_progress", "completed"] as const;
type Filter = (typeof FILTERS)[number];

const fmtDate = (d: Date | string) =>
  new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(d));

export function CustomRequestsTable({
  rows,
}: {
  rows: AdminCustomRequestRow[];
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!needle) return true;
      return (
        r.name.toLowerCase().includes(needle) ||
        r.requestNumber.toLowerCase().includes(needle) ||
        (r.categoryLabel ?? "").toLowerCase().includes(needle)
      );
    });
  }, [rows, q, filter]);

  const columns: Column<AdminCustomRequestRow>[] = [
    {
      key: "request",
      header: "Request",
      primary: true,
      cell: (r) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{r.name}</p>
          <p className="truncate text-xs text-ink-soft">
            {r.requestNumber}
            {r.categoryLabel ? ` · ${r.categoryLabel}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "price",
      header: "Quoted",
      align: "right",
      cell: (r) => (
        <span className="tabular-nums text-ink-soft">
          {r.quotedPriceZAR != null ? formatZAR(r.quotedPriceZAR) : "—"}
        </span>
      ),
    },
    { key: "status", header: "Status", cell: (r) => <StatusPill status={r.status} /> },
    {
      key: "date",
      header: "Received",
      cell: (r) => <span className="text-ink-soft">{fmtDate(r.createdAt)}</span>,
    },
    {
      key: "go",
      header: "",
      align: "right",
      cell: (r) => (
        <Link
          href={`/admin/custom-requests/${r.id}`}
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
            placeholder="Search requests…"
            className={cn(inputClass, "pl-9")}
          />
        </div>
        <div className="flex flex-wrap gap-1 rounded-full bg-cream-2 p-1">
          {FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                filter === s
                  ? "bg-cream text-ink shadow-sm"
                  : "text-ink-soft hover:text-ink"
              )}
            >
              {s === "all" ? "All" : CUSTOM_REQUEST_STATUS_LABEL[s] ?? s}
            </button>
          ))}
        </div>
      </div>
      <p className="text-xs text-ink-soft">
        {list.length} of {rows.length} requests
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
          icon={<Sparkles size={28} />}
          title={q || filter !== "all" ? "No matching requests" : "No requests yet"}
          description={
            q || filter !== "all"
              ? "Try a different search or filter."
              : "Custom order requests from the shop will appear here."
          }
        />
      }
    />
  );
}
