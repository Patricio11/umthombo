"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronUp, ChevronDown, Pencil, Trash2, Quote } from "lucide-react";
import type { AdminTestimonial } from "@/server/db/admin-queries";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { EmptyState, Switch } from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/admin/Toast";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import {
  deleteTestimonial,
  moveTestimonial,
  toggleTestimonialPublished,
} from "@/server/actions/testimonials";

export function TestimonialsTable({
  testimonials,
}: {
  testimonials: AdminTestimonial[];
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [, startTransition] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg?: string) =>
    startTransition(async () => {
      const res = await fn();
      if (res.ok && okMsg) toast.success(okMsg);
      if (!res.ok) toast.error(res.error ?? "Something went wrong.");
      router.refresh();
    });

  const onDelete = async (t: AdminTestimonial) => {
    const ok = await confirm({
      title: `Delete ${t.name}'s testimonial?`,
      description: "This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) run(() => deleteTestimonial(t.id), "Testimonial deleted.");
  };

  const columns: Column<AdminTestimonial>[] = [
    {
      key: "order",
      header: "Order",
      cell: (t) => {
        const i = testimonials.findIndex((x) => x.id === t.id);
        return (
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              aria-label="Move up"
              disabled={i === 0}
              onClick={() => run(() => moveTestimonial(t.id, "up"))}
              className="rounded-md p-1 text-ink-soft hover:bg-cream-2 hover:text-ink disabled:opacity-30"
            >
              <ChevronUp size={15} />
            </button>
            <button
              type="button"
              aria-label="Move down"
              disabled={i === testimonials.length - 1}
              onClick={() => run(() => moveTestimonial(t.id, "down"))}
              className="rounded-md p-1 text-ink-soft hover:bg-cream-2 hover:text-ink disabled:opacity-30"
            >
              <ChevronDown size={15} />
            </button>
          </div>
        );
      },
    },
    {
      key: "quote",
      header: "Testimonial",
      primary: true,
      cell: (t) => (
        <div className="min-w-0">
          <p className="font-medium">{t.name}</p>
          <p className="line-clamp-2 max-w-md text-xs text-ink-soft">“{t.quote}”</p>
        </div>
      ),
    },
    {
      key: "published",
      header: "Published",
      cell: (t) => (
        <Switch
          checked={t.published}
          onChange={(v) =>
            run(
              () => toggleTestimonialPublished(t.id, v),
              v ? "Now showing on the site." : "Hidden from the site."
            )
          }
          label="Published"
        />
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (t) => (
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/admin/testimonials/${t.id}`}
            aria-label={`Edit ${t.name}`}
            className="rounded-lg p-2 text-ink-soft hover:bg-cream-2 hover:text-ink"
          >
            <Pencil size={16} />
          </Link>
          <button
            type="button"
            aria-label={`Delete ${t.name}`}
            onClick={() => onDelete(t)}
            className="rounded-lg p-2 text-ink-soft hover:bg-clay/10 hover:text-clay"
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
      rows={testimonials}
      getKey={(t) => t.id}
      empty={
        <EmptyState
          icon={<Quote size={28} />}
          title="No testimonials yet"
          description="Add kind words from your customers."
          action={
            <Link href="/admin/testimonials/new">
              <Button size="sm">New testimonial</Button>
            </Link>
          }
        />
      }
    />
  );
}
