import Link from "next/link";
import { Package, TrendingUp, Truck, MapPin } from "lucide-react";
import {
  getAnalytics,
  isPeriodKey,
  PERIODS,
  type PeriodKey,
} from "@/server/db/analytics";
import {
  AdminPageHeader,
  Card,
  StatusBadge,
} from "@/components/admin/primitives";
import { BarChart } from "@/components/admin/analytics/BarChart";
import { formatZAR } from "@/lib/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Analytics" };

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="h-full">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="mt-2 font-display text-3xl leading-none">{value}</p>
      {sub && <p className="mt-2 text-xs text-ink-soft">{sub}</p>}
    </Card>
  );
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period } = await searchParams;
  const key: PeriodKey = isPeriodKey(period) ? period : "this-month";
  const a = await getAnalytics(key);

  return (
    <>
      <AdminPageHeader
        title="Analytics"
        subtitle={`A read on how the shop is doing — ${a.periodLabel.toLowerCase()}.`}
      />

      {/* Period selector */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-full bg-cream-2 p-1">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/admin/analytics?period=${p.key}`}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
              key === p.key
                ? "bg-cream text-ink shadow-sm"
                : "text-ink-soft hover:text-ink"
            )}
          >
            {p.label}
          </Link>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          label="Revenue"
          value={formatZAR(a.revenue)}
          sub={`${formatZAR(a.deliveryRevenue)} from delivery`}
        />
        <Kpi
          label="Completed orders"
          value={String(a.completedCount)}
          sub={`${a.ordersPlaced} placed · ${Math.round(a.conversion * 100)}% completed`}
        />
        <Kpi label="Items sold" value={String(a.itemsSold)} />
        <Kpi
          label="Avg order"
          value={formatZAR(a.avgOrder)}
          sub="completed orders"
        />
      </div>

      {/* Revenue chart */}
      <Card className="mt-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl">Revenue over time</h2>
          <span className="inline-flex items-center gap-1.5 text-sm text-ink-soft">
            <TrendingUp size={15} className="text-olive" /> completed
          </span>
        </div>
        <BarChart data={a.series} />
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Best sellers */}
        <Card className="lg:col-span-2">
          <h2 className="font-display text-xl">Best sellers</h2>
          {a.topProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center text-sm text-ink-soft">
              <Package size={26} className="mb-3 text-taupe" />
              No completed sales in this period yet.
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {a.topProducts.map((p, i) => {
                const max = a.topProducts[0].qty || 1;
                return (
                  <li key={p.name}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">
                        <span className="mr-2 text-ink-soft">{i + 1}.</span>
                        {p.name}
                      </span>
                      <span className="shrink-0 text-ink-soft">
                        {p.qty} sold · {formatZAR(p.revenue)}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-cream-2">
                      <div
                        className="h-full rounded-full bg-olive/70"
                        style={{ width: `${(p.qty / max) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Status + method */}
        <div className="space-y-6">
          <Card>
            <h2 className="font-display text-xl">Orders by status</h2>
            <ul className="mt-4 space-y-2.5">
              {a.statusBreakdown.length === 0 ? (
                <li className="text-sm text-ink-soft">No orders in this period.</li>
              ) : (
                a.statusBreakdown.map((s) => (
                  <li
                    key={s.status}
                    className="flex items-center justify-between text-sm"
                  >
                    <StatusBadge status={s.status} />
                    <span className="tabular-nums text-ink-soft">{s.count}</span>
                  </li>
                ))
              )}
            </ul>
          </Card>

          <Card>
            <h2 className="font-display text-xl">Fulfilment</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-ink-soft">
                  <Truck size={16} className="text-taupe" /> Delivery
                </span>
                <span className="tabular-nums">{a.methodSplit.delivery}</span>
              </li>
              <li className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-ink-soft">
                  <MapPin size={16} className="text-taupe" /> Collection
                </span>
                <span className="tabular-nums">{a.methodSplit.collection}</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
