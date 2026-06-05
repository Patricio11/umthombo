"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Star, Search, Package } from "lucide-react";
import type { AdminProductRow } from "@/server/db/admin-queries";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { EmptyState, StatusBadge, inputClass } from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/admin/Toast";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { deleteProduct, toggleFeatured } from "@/server/actions/products";
import { formatZAR } from "@/lib/format";
import { cn } from "@/lib/utils";

export function ProductsTable({ products }: { products: AdminProductRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "draft">("all");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (!needle) return true;
      return (
        p.name.toLowerCase().includes(needle) ||
        p.slug.toLowerCase().includes(needle) ||
        p.categoryLabel.toLowerCase().includes(needle)
      );
    });
  }, [products, q, status]);

  const onFeature = (p: AdminProductRow) =>
    startTransition(async () => {
      await toggleFeatured(p.id, !p.featured);
      router.refresh();
    });

  const onDelete = async (p: AdminProductRow) => {
    const ok = await confirm({
      title: `Delete “${p.name}”?`,
      description: "This removes it from the shop and deletes its uploaded images. This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteProduct(p.id);
      if (res.ok) toast.success(`Deleted “${p.name}”.`);
      else toast.error(res.error ?? "Could not delete.");
      router.refresh();
    });
  };

  const columns: Column<AdminProductRow>[] = [
    {
      key: "product",
      header: "Product",
      primary: true,
      cell: (p) => (
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-cream-2">
            {p.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium">{p.name}</p>
            <p className="truncate text-xs text-ink-soft">/{p.slug}</p>
          </div>
        </div>
      ),
    },
    { key: "category", header: "Category", cell: (p) => <span className="text-ink-soft">{p.categoryLabel}</span> },
    {
      key: "price",
      header: "Price",
      align: "right",
      cell: (p) => (
        <span className="tabular-nums">
          {formatZAR(p.priceZAR)}
          {p.priceMaxZAR != null && (
            <span className="text-ink-soft">–{formatZAR(p.priceMaxZAR)}</span>
          )}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (p) => <StatusBadge status={p.status} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            aria-label={p.featured ? "Unfeature" : "Feature"}
            title={p.featured ? "Featured on home" : "Not featured"}
            onClick={() => onFeature(p)}
            className={cn(
              "rounded-lg p-2 transition-colors hover:bg-cream-2",
              p.featured ? "text-clay" : "text-ink-soft/50"
            )}
          >
            <Star size={16} fill={p.featured ? "currentColor" : "none"} />
          </button>
          <Link
            href={`/admin/products/${p.id}`}
            aria-label={`Edit ${p.name}`}
            className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-cream-2 hover:text-ink"
          >
            <Pencil size={16} />
          </Link>
          <button
            type="button"
            aria-label={`Delete ${p.name}`}
            onClick={() => onDelete(p)}
            className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-clay/10 hover:text-clay"
          >
            <Trash2 size={16} />
          </button>
        </div>
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
            placeholder="Search products…"
            className={cn(inputClass, "pl-9")}
          />
        </div>
        <div className="flex gap-1 rounded-full bg-cream-2 p-1">
          {(["all", "active", "draft"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition-colors",
                status === s ? "bg-cream text-ink shadow-sm" : "text-ink-soft hover:text-ink"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <p className="text-xs text-ink-soft">
        {rows.length} of {products.length} products
      </p>
    </div>
  );

  return (
    <DataTable
      columns={columns}
      rows={rows}
      getKey={(p) => p.id}
      toolbar={toolbar}
      empty={
        <EmptyState
          icon={<Package size={28} />}
          title={q || status !== "all" ? "No matching products" : "No products yet"}
          description={q || status !== "all" ? "Try a different search or filter." : "Add your first product to the shop."}
          action={
            <Link href="/admin/products/new">
              <Button size="sm">New product</Button>
            </Link>
          }
        />
      }
    />
  );
}
