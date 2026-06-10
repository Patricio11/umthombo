"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Star, Search, BookOpen, Eye, EyeOff } from "lucide-react";
import type { AdminPostRow } from "@/server/db/journal";
import { DataTable, type Column } from "@/components/admin/DataTable";
import { EmptyState, StatusBadge, inputClass } from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/admin/Toast";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { deletePost, setPostStatus, toggleFeatured } from "@/server/actions/journal";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export function PostsTable({ posts }: { posts: AdminPostRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [, startTransition] = useTransition();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | "published" | "draft">("all");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return posts.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      if (!needle) return true;
      return (
        p.title.toLowerCase().includes(needle) ||
        p.slug.toLowerCase().includes(needle) ||
        p.tags.some((t) => t.toLowerCase().includes(needle))
      );
    });
  }, [posts, q, status]);

  const onToggleVisible = (p: AdminPostRow) =>
    startTransition(async () => {
      const next = p.status === "published" ? "draft" : "published";
      const res = await setPostStatus(p.id, next);
      if (res.ok) {
        toast.success(
          next === "published" ? `“${p.title}” is live.` : `“${p.title}” is now a draft.`
        );
      } else {
        toast.error(res.error ?? "Could not update.");
      }
      router.refresh();
    });

  const onFeature = (p: AdminPostRow) =>
    startTransition(async () => {
      await toggleFeatured(p.id, !p.featured);
      router.refresh();
    });

  const onDelete = async (p: AdminPostRow) => {
    const ok = await confirm({
      title: `Delete “${p.title}”?`,
      description: "This permanently removes the post. This can't be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    startTransition(async () => {
      const res = await deletePost(p.id);
      if (res.ok) toast.success(`Deleted “${p.title}”.`);
      else toast.error(res.error ?? "Could not delete.");
      router.refresh();
    });
  };

  const columns: Column<AdminPostRow>[] = [
    {
      key: "title",
      header: "Post",
      primary: true,
      cell: (p) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{p.title}</p>
          <p className="truncate text-xs text-ink-soft">/journal/{p.slug}</p>
        </div>
      ),
    },
    {
      key: "tags",
      header: "Tags",
      cell: (p) =>
        p.tags.length ? (
          <div className="flex flex-wrap gap-1">
            {p.tags.slice(0, 3).map((t) => (
              <span key={t} className="rounded-full bg-cream-2 px-2 py-0.5 text-xs text-ink-soft">
                {t}
              </span>
            ))}
            {p.tags.length > 3 && (
              <span className="text-xs text-ink-soft">+{p.tags.length - 3}</span>
            )}
          </div>
        ) : (
          <span className="text-ink-soft/50">—</span>
        ),
    },
    { key: "status", header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
    {
      key: "date",
      header: "Published",
      cell: (p) => (
        <span className="text-ink-soft">
          {p.publishedAt ? formatDate(p.publishedAt) : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (p) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            aria-label={p.status === "published" ? `Unpublish ${p.title}` : `Publish ${p.title}`}
            title={
              p.status === "published"
                ? "Published - click to make a draft"
                : "Draft - click to publish"
            }
            onClick={() => onToggleVisible(p)}
            className={cn(
              "rounded-lg p-2 transition-colors hover:bg-cream-2",
              p.status === "published" ? "text-olive" : "text-ink-soft/50"
            )}
          >
            {p.status === "published" ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
          <button
            type="button"
            aria-label={p.featured ? "Unfeature" : "Feature"}
            title={p.featured ? "Featured on journal" : "Not featured"}
            onClick={() => onFeature(p)}
            className={cn(
              "rounded-lg p-2 transition-colors hover:bg-cream-2",
              p.featured ? "text-clay" : "text-ink-soft/50"
            )}
          >
            <Star size={16} fill={p.featured ? "currentColor" : "none"} />
          </button>
          <Link
            href={`/admin/journal/${p.id}`}
            aria-label={`Edit ${p.title}`}
            className="rounded-lg p-2 text-ink-soft transition-colors hover:bg-cream-2 hover:text-ink"
          >
            <Pencil size={16} />
          </Link>
          <button
            type="button"
            aria-label={`Delete ${p.title}`}
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
            placeholder="Search posts…"
            className={cn(inputClass, "pl-9")}
          />
        </div>
        <div className="flex gap-1 rounded-full bg-cream-2 p-1">
          {(["all", "published", "draft"] as const).map((s) => (
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
        {rows.length} of {posts.length} posts
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
          icon={<BookOpen size={28} />}
          title={q || status !== "all" ? "No matching posts" : "No posts yet"}
          description={
            q || status !== "all"
              ? "Try a different search or filter."
              : "Write your first journal entry."
          }
          action={
            <Link href="/admin/journal/new">
              <Button size="sm">New post</Button>
            </Link>
          }
        />
      }
    />
  );
}
