"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Check,
} from "lucide-react";
import type { Faq } from "@/server/db/schema";
import { Card, Field, Input, Textarea, Switch } from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/admin/Toast";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import {
  createFaq,
  updateFaq,
  deleteFaq,
  toggleFaqPublished,
  moveFaq,
} from "@/server/actions/faqs";

type Mode = { kind: "list" } | { kind: "new" } | { kind: "edit"; faq: Faq };

export function FaqManager({ faqs }: { faqs: Faq[] }) {
  const [mode, setMode] = useState<Mode>({ kind: "list" });

  if (mode.kind !== "list") {
    return (
      <FaqForm
        initial={mode.kind === "edit" ? mode.faq : undefined}
        onDone={() => setMode({ kind: "list" })}
      />
    );
  }

  return (
    <div className="space-y-4">
      {faqs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-cream-3 bg-cream px-6 py-12 text-center">
          <p className="font-medium text-ink">No FAQs yet</p>
          <p className="mt-1 text-sm text-ink-soft">
            Add common questions about delivery, custom orders and care.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {faqs.map((f, i) => (
            <FaqRow
              key={f.id}
              faq={f}
              first={i === 0}
              last={i === faqs.length - 1}
              onEdit={() => setMode({ kind: "edit", faq: f })}
            />
          ))}
        </ul>
      )}
      <Button onClick={() => setMode({ kind: "new" })}>
        <Plus size={16} /> Add FAQ
      </Button>
    </div>
  );
}

function FaqRow({
  faq,
  first,
  last,
  onEdit,
}: {
  faq: Faq;
  first: boolean;
  last: boolean;
  onEdit: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error ?? "Something went wrong.");
      router.refresh();
    });

  const onDelete = async () => {
    const yes = await confirm({
      title: "Delete this FAQ?",
      description: "It’ll be removed from the FAQ page. This can’t be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (yes) run(() => deleteFaq(faq.id));
  };

  return (
    <li className="rounded-2xl border border-cream-3 bg-cream p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-ink">{faq.question}</p>
          <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{faq.answer}</p>
          {faq.category && (
            <span className="mt-2 inline-block rounded-full bg-cream-2 px-2 py-0.5 text-xs text-ink-soft">
              {faq.category}
            </span>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Switch
            checked={faq.published}
            onChange={(v) => run(() => toggleFaqPublished(faq.id, v))}
            label="Published"
          />
          <span className="text-[11px] text-ink-soft">
            {faq.published ? "Live" : "Hidden"}
          </span>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1 border-t border-cream-2 pt-2.5">
        <button
          type="button"
          disabled={first || pending}
          onClick={() => run(() => moveFaq(faq.id, "up"))}
          className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-cream-2 disabled:opacity-30"
          aria-label="Move up"
        >
          <ChevronUp size={16} />
        </button>
        <button
          type="button"
          disabled={last || pending}
          onClick={() => run(() => moveFaq(faq.id, "down"))}
          className="rounded-lg p-1.5 text-ink-soft transition-colors hover:bg-cream-2 disabled:opacity-30"
          aria-label="Move down"
        >
          <ChevronDown size={16} />
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="ml-1 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-cream-2 hover:text-ink"
        >
          <Pencil size={13} /> Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:bg-clay/10 hover:text-clay"
        >
          <Trash2 size={13} /> Delete
        </button>
        {pending && <Loader2 size={14} className="animate-spin text-ink-soft" />}
      </div>
    </li>
  );
}

function FaqForm({ initial, onDone }: { initial?: Faq; onDone: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [answer, setAnswer] = useState(initial?.answer ?? "");
  const [category, setCategory] = useState(initial?.category ?? "");
  const [published, setPublished] = useState(initial?.published ?? true);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const input = { question, answer, category: category || undefined, published };
      const res = initial
        ? await updateFaq(initial.id, input)
        : await createFaq(input);
      if (res.ok) {
        toast.success(initial ? "FAQ updated." : "FAQ added.");
        router.refresh();
        onDone();
      } else {
        toast.error(res.error ?? "Something went wrong.");
      }
    });
  };

  return (
    <Card className="max-w-2xl space-y-5">
      <h2 className="font-display text-lg">{initial ? "Edit FAQ" : "Add an FAQ"}</h2>
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Question">
          <Input value={question} onChange={(e) => setQuestion(e.target.value)} required />
        </Field>
        <Field
          label="Answer"
          hint="Tip: write {discount} and it becomes your current bring-back discount (set in Discounts)."
        >
          <Textarea
            rows={4}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            required
          />
        </Field>
        <Field label="Category (optional)" hint="Groups questions on the page, e.g. Delivery">
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Delivery" />
        </Field>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Published</span>
          <Switch checked={published} onChange={setPublished} label="Published" />
        </label>
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Save FAQ
          </Button>
          <button type="button" onClick={onDone} className="text-sm text-ink-soft transition-colors hover:text-ink">
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
