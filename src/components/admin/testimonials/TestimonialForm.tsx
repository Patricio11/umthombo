"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { AdminTestimonial } from "@/server/db/admin-queries";
import { Card, Field, Input, Textarea, Switch } from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/admin/Toast";
import {
  createTestimonial,
  updateTestimonial,
} from "@/server/actions/testimonials";

export function TestimonialForm({
  testimonial,
}: {
  testimonial?: AdminTestimonial;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(testimonial?.name ?? "");
  const [quote, setQuote] = useState(testimonial?.quote ?? "");
  const [location, setLocation] = useState(testimonial?.location ?? "");
  const [published, setPublished] = useState(testimonial?.published ?? true);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const input = { name, quote, location, published };
    startTransition(async () => {
      const res = testimonial
        ? await updateTestimonial(testimonial.id, input)
        : await createTestimonial(input);
      if (res.ok) {
        toast.success(testimonial ? "Testimonial updated." : "Testimonial added.");
        router.push("/admin/testimonials");
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
          <Field label="Name" required htmlFor="name">
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Location" htmlFor="location" hint="Optional">
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Cape Town"
            />
          </Field>
        </div>
        <Field label="Quote" required htmlFor="quote">
          <Textarea
            id="quote"
            rows={5}
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            placeholder="The packing is top-tier…"
            required
          />
        </Field>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium">Published on the site</span>
          <Switch checked={published} onChange={setPublished} label="Published" />
        </label>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 size={16} className="animate-spin" />}
          {testimonial ? "Save changes" : "Add testimonial"}
        </Button>
        <Link href="/admin/testimonials" className="text-sm text-ink-soft transition-colors hover:text-ink">
          Cancel
        </Link>
      </div>
    </form>
  );
}
