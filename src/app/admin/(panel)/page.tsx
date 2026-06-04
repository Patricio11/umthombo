import Link from "next/link";
import {
  ClipboardList,
  Package,
  Tags,
  Quote,
  ArrowRight,
  Inbox,
} from "lucide-react";
import { getAdminStats, getRecentOrders } from "@/server/db/admin-queries";
import {
  AdminPageHeader,
  Card,
  StatusBadge,
  EmptyState,
} from "@/components/admin/primitives";
import { formatZAR } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, recent] = await Promise.all([
    getAdminStats(),
    getRecentOrders(6),
  ]);

  const cards = [
    {
      label: "Orders",
      value: stats.orders,
      sub: `${stats.ordersByStatus.new} new`,
      href: "/admin/orders",
      icon: ClipboardList,
    },
    {
      label: "Products",
      value: stats.products,
      sub: "in catalogue",
      href: "/admin/products",
      icon: Package,
    },
    {
      label: "Categories",
      value: stats.categories,
      sub: "live",
      href: "/admin/categories",
      icon: Tags,
    },
    {
      label: "Testimonials",
      value: stats.testimonials,
      sub: "collected",
      href: "/admin/testimonials",
      icon: Quote,
    },
  ];

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        subtitle="A calm overview of your shop."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} href={c.href} className="group">
              <Card className="h-full transition-colors group-hover:border-olive/40">
                <div className="flex items-start justify-between">
                  <span className="text-sm text-ink-soft">{c.label}</span>
                  <Icon size={18} className="text-taupe" />
                </div>
                <p className="mt-3 font-display text-4xl leading-none">
                  {c.value}
                </p>
                <p className="mt-2 text-xs text-ink-soft">{c.sub}</p>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Orders by status */}
      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="font-display text-xl">Orders by status</h2>
          <ul className="mt-4 space-y-2.5">
            {Object.entries(stats.ordersByStatus).map(([status, n]) => (
              <li
                key={status}
                className="flex items-center justify-between text-sm"
              >
                <StatusBadge status={status} />
                <span className="tabular-nums text-ink-soft">{n}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Recent orders */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl">Recent orders</h2>
            <Link
              href="/admin/orders"
              className="link-underline inline-flex items-center gap-1 text-sm text-olive"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>

          {recent.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={<Inbox size={28} />}
                title="No orders yet"
                description="When customers place orders, they'll appear here."
              />
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-cream-2">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link
                    href={`/admin/orders/${o.id}`}
                    className="flex items-center justify-between gap-3 py-3 transition-colors hover:text-olive"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {o.customerName}
                      </p>
                      <p className="text-xs text-ink-soft">{o.orderNumber}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm tabular-nums">
                        {formatZAR(o.totalZAR)}
                      </span>
                      <StatusBadge status={o.status} />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
