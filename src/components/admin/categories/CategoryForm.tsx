"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { AdminCategory } from "@/server/db/admin-queries";
import { Card, Field, Input, Textarea } from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import { ImageField } from "@/components/admin/ImageUploader";
import { useToast } from "@/components/admin/Toast";
import { accentClasses, type Accent } from "@/lib/accents";
import { slugify } from "@/lib/admin-schemas";
import { createCategory, updateCategory } from "@/server/actions/categories";
import { cn } from "@/lib/utils";

const ACCENTS: Accent[] = ["olive", "clay", "mist", "taupe"];

export function CategoryForm({ category }: { category?: AdminCategory }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [label, setLabel] = useState(category?.label ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(!!category);
  const [eyebrow, setEyebrow] = useState(category?.eyebrow ?? "");
  const [accent, setAccent] = useState<Accent>(category?.accent ?? "olive");
  const [blurb, setBlurb] = useState(category?.blurb ?? "");
  const [image, setImage] = useState(category?.image ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const onLabel = (v: string) => {
    setLabel(v);
    if (!slugEdited) setSlug(slugify(v));
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const input = { label, slug, eyebrow, accent, blurb, image };
    startTransition(async () => {
      const res = category
        ? await updateCategory(category.id, input)
        : await createCategory(input);
      if (res.ok) {
        toast.success(category ? "Category updated." : "Category created.");
        router.push("/admin/categories");
        router.refresh();
      } else {
        toast.error(res.error ?? "Something went wrong.");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      <Card className="space-y-5">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Name" required htmlFor="label" error={errors.label}>
            <Input
              id="label"
              value={label}
              onChange={(e) => onLabel(e.target.value)}
              placeholder="Candles"
              required
            />
          </Field>
          <Field
            label="Slug"
            required
            htmlFor="slug"
            hint="Used in the URL: /shop/slug"
            error={errors.slug}
          >
            <Input
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugEdited(true);
              }}
              placeholder="candles"
              required
            />
          </Field>
        </div>

        <Field label="Eyebrow" htmlFor="eyebrow" hint="Small label above the title">
          <Input
            id="eyebrow"
            value={eyebrow}
            onChange={(e) => setEyebrow(e.target.value)}
            placeholder="For the room"
          />
        </Field>

        <Field label="Accent colour">
          <div className="flex flex-wrap gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAccent(a)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm capitalize transition-all",
                  accent === a
                    ? "border-ink/30 bg-cream-2"
                    : "border-cream-3 hover:border-ink/20"
                )}
              >
                <span className={`h-4 w-4 rounded-full ${accentClasses[a].bg}`} />
                {a}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Blurb" htmlFor="blurb" hint="One calm line describing the category">
          <Textarea
            id="blurb"
            rows={2}
            value={blurb}
            onChange={(e) => setBlurb(e.target.value)}
            placeholder="Sculptural, scented, slow to burn."
          />
        </Field>

        <Field label="Image" hint="Shown on the home page category tile">
          <ImageField value={image} onChange={setImage} />
        </Field>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 size={16} className="animate-spin" />}
          {category ? "Save changes" : "Create category"}
        </Button>
        <Link
          href="/admin/categories"
          className="text-sm text-ink-soft transition-colors hover:text-ink"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
