"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Check, ImagePlus, X, MailCheck } from "lucide-react";
import type { CategoryView } from "@/lib/view-types";
import {
  createCustomRequest,
  uploadReferenceImage,
} from "@/server/actions/custom-requests";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Honeypot } from "@/components/ui/Honeypot";
import { Turnstile, type TurnstileHandle } from "@/components/auth/Turnstile";
import { isHoneypotFilled } from "@/lib/honeypot";

const inputCls =
  "w-full rounded-xl border border-cream-3 bg-cream px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 transition-colors focus:border-olive focus:outline-none";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-soft">{hint}</span>}
    </label>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-cream-3 bg-cream p-6">
      <h2 className="font-display text-xl">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

const MAX_IMAGES = 5;

export function CustomRequestForm({
  categories,
  account,
}: {
  categories: CategoryView[];
  account: { name: string; email: string; phone: string } | null;
}) {
  const signedIn = !!account;

  const [categoryId, setCategoryId] = useState("");
  const [title, setTitle] = useState("");
  const [scent, setScent] = useState("");
  const [colour, setColour] = useState("");
  const [size, setSize] = useState("");
  const [occasion, setOccasion] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const [name, setName] = useState(account?.name ?? "");
  const [email, setEmail] = useState(account?.email ?? "");
  const [phone, setPhone] = useState(account?.phone ?? "");

  const [hp, setHp] = useState("");
  const [captcha, setCaptcha] = useState<string | null>(null);
  const captchaRef = useRef<TurnstileHandle>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ requestNumber: string } | null>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_IMAGES - images.length;
    if (room <= 0) return;
    setUploading(true);
    setError(null);
    for (const file of Array.from(files).slice(0, room)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadReferenceImage(fd);
      if (res.ok && res.url) {
        setImages((prev) => [...prev, res.url!]);
      } else {
        setError(res.error ?? "Couldn’t upload that image.");
      }
    }
    setUploading(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isHoneypotFilled(hp)) return;
    setError(null);
    if (!categoryId) return setError("Please choose a category.");
    if (title.trim().length < 3) return setError("Give your idea a short title.");
    if (!name.trim() || !email.trim() || !phone.trim()) {
      return setError("Please fill in your contact details.");
    }
    setSubmitting(true);
    const res = await createCustomRequest({
      name,
      email,
      phone,
      categoryId,
      title,
      scent: scent.trim() || undefined,
      colour: colour.trim() || undefined,
      size: size.trim() || undefined,
      occasion: occasion.trim() || undefined,
      quantity,
      notes: notes.trim() || undefined,
      referenceImages: images.length ? images : undefined,
      hp,
      captchaToken: captcha ?? undefined,
    });
    setSubmitting(false);
    if (res.ok && res.requestNumber) {
      setDone({ requestNumber: res.requestNumber });
    } else {
      captchaRef.current?.reset();
      setCaptcha(null);
      setError(res.error ?? "Something went wrong. Please try again.");
    }
  };

  if (done) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-cream-3 bg-cream p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-olive/15 text-olive">
          <MailCheck size={22} />
        </span>
        <h2 className="mt-5 font-display text-2xl">Your request is in 🌱</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Reference{" "}
          <span className="font-medium text-ink">{done.requestNumber}</span>. We’ll
          review your idea and email you a quote. We’ve also emailed you a link to
          track it
          {!signedIn && " and to set up your account"}.
        </p>
        <Link
          href="/shop"
          className="mt-7 inline-flex items-center justify-center rounded-full border border-ink/25 px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-olive hover:text-olive"
        >
          Continue browsing
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative mx-auto max-w-2xl space-y-6">
      <Honeypot value={hp} onChange={setHp} />

      <Panel title="What you’d like">
        <Field label="Category">
          <Select
            value={categoryId}
            onChange={setCategoryId}
            placeholder="Choose a category…"
            options={categories.map((c) => ({ value: c.id, label: c.label }))}
          />
        </Field>
        <Field label="Title" hint="A short summary, e.g. “Lavender pillar candle for a wedding”">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What are you dreaming up?"
            className={inputCls}
            required
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Scent" hint="Optional">
            <input value={scent} onChange={(e) => setScent(e.target.value)} className={inputCls} placeholder="e.g. Lavender & vanilla" />
          </Field>
          <Field label="Colour" hint="Optional">
            <input value={colour} onChange={(e) => setColour(e.target.value)} className={inputCls} placeholder="e.g. Sage green" />
          </Field>
          <Field label="Size / vessel" hint="Optional">
            <input value={size} onChange={(e) => setSize(e.target.value)} className={inputCls} placeholder="e.g. Large tin, 250ml" />
          </Field>
          <Field label="Occasion" hint="Optional">
            <input value={occasion} onChange={(e) => setOccasion(e.target.value)} className={inputCls} placeholder="e.g. Wedding favours" />
          </Field>
        </div>
        <Field label="Quantity">
          <input
            type="number"
            min={1}
            max={999}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className={`${inputCls} w-28`}
          />
        </Field>
        <Field label="Tell us more" hint="Anything else — inspiration, deadlines, packaging…">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className={`${inputCls} resize-none`}
            placeholder="Describe what you have in mind."
          />
        </Field>
      </Panel>

      <Panel title="Inspiration (optional)">
        <p className="text-sm text-ink-soft">
          Add up to {MAX_IMAGES} reference images — colours, vessels, a style you love.
        </p>
        {images.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {images.map((url) => (
              <div key={url} className="relative h-20 w-20 overflow-hidden rounded-xl border border-cream-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  aria-label="Remove image"
                  onClick={() => setImages((prev) => prev.filter((u) => u !== url))}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-ink/70 text-cream"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        {images.length < MAX_IMAGES && (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink/20 px-4 py-2.5 text-sm text-ink transition-colors hover:border-olive hover:text-olive">
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
            {uploading ? "Uploading…" : "Add images"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                onFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </Panel>

      <Panel title="Your details">
        {signedIn ? (
          <p className="rounded-xl bg-olive/10 px-4 py-2.5 text-sm text-olive">
            <Check size={14} className="mr-1 inline" />
            Saved to your account — track it from your dashboard.
          </p>
        ) : (
          <p className="rounded-xl bg-taupe/15 px-4 py-2.5 text-xs text-ink-soft">
            We’ll set up an account so you can track this request — you’ll get an
            email to set a password.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} autoComplete="name" required />
          </Field>
          <Field label="Phone">
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} autoComplete="tel" placeholder="+27 or 0…" required />
          </Field>
        </div>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
            autoComplete="email"
            disabled={signedIn}
            required
          />
        </Field>
      </Panel>

      <p className="rounded-2xl bg-cream-2 px-5 py-4 text-sm text-ink-soft">
        A <span className="font-medium text-ink">deposit may be applied</span> if your
        request is accepted — it’s always deducted from your total. You’ll see the
        full price before paying anything.
      </p>

      {!signedIn && (
        <Turnstile ref={captchaRef} onVerify={setCaptcha} onExpire={() => setCaptcha(null)} />
      )}

      {error && (
        <p className="rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay">{error}</p>
      )}

      <Button type="submit" size="lg" className="w-full" disabled={submitting || uploading}>
        {submitting && <Loader2 size={16} className="animate-spin" />}
        {submitting ? "Sending your request…" : "Send request"}
      </Button>
    </form>
  );
}
