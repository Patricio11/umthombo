"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Inbox } from "lucide-react";
import type { AdminOrderRow } from "@/server/db/admin-queries";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/order-schema";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { EmptyState, StatusBadge } from "@/components/admin/primitives";
import { formatZAR } from "@/lib/format";
import { cn } from "@/lib/utils";

const fmtDate = (d: Date | string) =>
  new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(d));

const STATUS_DOT: Record<string, string> = {
  all: "bg-ink/40",
  new: "bg-olive",
  confirmed: "bg-mist",
  preparing: "bg-clay",
  completed: "bg-ink/60",
  cancelled: "bg-clay/40",
};

export function OrdersTable({ orders }: { orders: AdminOrderRow[] }) {
  const router = useRouter();
  const [status, setStatus] = useState<"all" | OrderStatus>("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length };
    for (const s of ORDER_STATUSES) c[s] = 0;
    for (const o of orders) c[o.status] = (c[o.status] ?? 0) + 1;
    return c;
  }, [orders]);

  const rows = useMemo(
    () => (status === "all" ? orders : orders.filter((o) => o.status === status)),
    [orders, status]
  );

  const columns: Column<AdminOrderRow>[] = [
    {
      key: "order",
      header: "Order",
      primary: true,
      cell: (o) => (
        <div>
          <p className="font-medium">{o.customerName}</p>
          <p className="text-xs text-ink-soft">
            {o.orderNumber} · {fmtDate(o.createdAt)}
          </p>
        </div>
      ),
    },
    {
      key: "method",
      header: "Method",
      cell: (o) => <span className="capitalize text-ink-soft">{o.method}</span>,
    },
    {
      key: "items",
      header: "Items",
      align: "right",
      cell: (o) => <span className="tabular-nums">{o.itemCount}</span>,
    },
    {
      key: "total",
      header: "Total",
      align: "right",
      cell: (o) => <span className="tabular-nums">{formatZAR(o.totalZAR)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (o) => <StatusBadge status={o.status} />,
    },
  ];

  const tabs = ["all", ...ORDER_STATUSES] as const;

  return (
    <div className="space-y-5">
      {/* Stats widget — also the status filter */}
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
        {tabs.map((s) => {
          const active = status === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              aria-pressed={active}
              className={cn(
                "rounded-2xl border px-3.5 py-3 text-left transition-colors",
                active
                  ? "border-olive bg-olive/5"
                  : "border-cream-3 bg-cream hover:border-ink/20"
              )}
            >
              <span className="flex items-center gap-1.5">
                <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[s])} />
                <span className="text-[11px] font-medium uppercase tracking-wide text-ink-soft">
                  {s}
                </span>
              </span>
              <span className="mt-1.5 block font-display text-2xl leading-none tabular-nums">
                {counts[s] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        getKey={(o) => o.id}
        onRowClick={(o) => router.push(`/admin/orders/${o.id}`)}
        empty={
          <EmptyState
            icon={<Inbox size={28} />}
            title={status === "all" ? "No orders yet" : "No orders here"}
            description={
              status === "all"
                ? "When customers place orders, they'll appear here."
                : "Try a different status filter."
            }
          />
        }
      />
    </div>
  );
}
