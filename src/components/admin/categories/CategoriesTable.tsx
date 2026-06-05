"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, Pencil, Trash2, Tags } from "lucide-react";
import type { AdminCategory } from "@/server/db/admin-queries";
import { accentClasses } from "@/lib/accents";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { EmptyState } from "@/components/admin/primitives";
import { useToast } from "@/components/admin/Toast";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { deleteCategory, moveCategory } from "@/server/actions/categories";
import { Button } from "@/components/ui/Button";

export function CategoriesTable({
  categories,
}: {
  categories: AdminCategory[];
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const onMove = (id: string, direction: "up" | "down") => {
    setBusyId(id);
    startTransition(async () => {
      const res = await moveCategory(id, direction);
      if (!res.ok) toast.error(res.error ?? "Could not reorder.");
      router.refresh();
      setBusyId(null);
    });
  };

  const onDelete = async (cat: AdminCategory) => {
    const ok = await confirm({
      title: `Delete “${cat.label}”?`,
      description:
        "This can't be undone. Categories with products can't be deleted.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    setBusyId(cat.id);
    startTransition(async () => {
      const res = await deleteCategory(cat.id);
      if (res.ok) toast.success(`Deleted “${cat.label}”.`);
      else toast.error(res.error ?? "Could not delete.");
      router.refresh();
      setBusyId(null);
    });
  };

  const columns: Column<AdminCategory>[] = [
    {
      key: "order",
      header: "Order",
      cell: (c) => {
        const i = categories.findIndex((x) => x.id === c.id);
        return (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label="Move up"
              disabled={i === 0 || pending}
              onClick={() => onMove(c.id, "up")}
              className="rounded-md p-1 text-ink-soft transition-colors hover:bg-cream-2 hover:text-ink disabled:opacity-30"
            >
              <ChevronUp size={15} />
            </button>
            <button
              type="button"
              aria-label="Move down"
              disabled={i === categories.length - 1 || pending}
              onClick={() => onMove(c.id, "down")}
              className="rounded-md p-1 text-ink-soft transition-colors hover:bg-cream-2 hover:text-ink disabled:opacity-30"
            >
              <ChevronDown size={15} />
            </button>
          </div>
        );
      },
    },
    {
      key: "label",
      header: "Category",
      primary: true,
      cell: (c) => (
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-cream-2">
            {c.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <span
                className={`block h-full w-full ${accentClasses[c.accent].bg}`}
                aria-hidden
              />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium">{c.label}</p>
            <p className="text-xs text-ink-soft">{c.eyebrow || "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "slug",
      header: "Slug",
      cell: (c) => <code className="text-xs text-ink-soft">/{c.slug}</code>,
    },
    {
      key: "count",
      header: "Products",
      align: "right",
      cell: (c) => <span className="tabular-nums">{c.productCount}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (c) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/admin/categories/${c.id}`}
            aria-label={`Edit ${c.label}`}
            className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-cream-2 hover:text-ink"
          >
            <Pencil size={16} />
          </Link>
          <button
            type="button"
            aria-label={`Delete ${c.label}`}
            disabled={busyId === c.id}
            onClick={() => onDelete(c)}
            className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-clay/10 hover:text-clay disabled:opacity-40"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      rows={categories}
      getKey={(c) => c.id}
      empty={
        <EmptyState
          icon={<Tags size={28} />}
          title="No categories yet"
          description="Create your first category to organise the shop."
          action={
            <Link href="/admin/categories/new">
              <Button size="sm">New category</Button>
            </Link>
          }
        />
      }
    />
  );
}
