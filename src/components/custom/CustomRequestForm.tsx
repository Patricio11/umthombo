"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Loader2,
  Check,
  ImagePlus,
  X,
  MailCheck,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import {
  createCustomRequest,
  uploadReferenceImage,
  getRequestPrefill,
} from "@/server/actions/custom-requests";
import { REQUEST_TYPES } from "@/lib/custom-request-schema";
import { Button } from "@/components/ui/Button";
import { Honeypot } from "@/components/ui/Honeypot";
import { Turnstile, type TurnstileHandle } from "@/components/auth/Turnstile";
import { isHoneypotFilled } from "@/lib/honeypot";
import { cn } from "@/lib/utils";

const inputCls =
  "w-full rounded-xl border border-cream-3 bg-cream px-4 py-3 text-sm text-ink placeholder:text-ink-soft/60 transition-colors focus:border-olive focus:outline-none";

const MAX_IMAGES = 5;
const STEPS = ["What", "Details", "You"];
const TYPE_OPTIONS = [...REQUEST_TYPES, "Other"] as const;

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

export function CustomRequestForm({
  onClose,
  defaultType,
}: {
  onClose?: () => void;
  defaultType?: string;
}) {
  const reduce = useReducedMotion();

  const [signedIn, setSignedIn] = useState(false);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);

  // What — pre-select when a valid type is passed (e.g. from the shop category)
  const [requestType, setRequestType] = useState(
    defaultType && (REQUEST_TYPES as readonly string[]).includes(defaultType)
      ? defaultType
      : ""
  );
  const [otherType, setOtherType] = useState("");
  const [title, setTitle] = useState("");
  // Details
  const [scent, setScent] = useState("");
  const [colour, setColour] = useState("");
  const [size, setSize] = useState("");
  const [occasion, setOccasion] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  // You
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [hp, setHp] = useState("");
  const [captcha, setCaptcha] = useState<string | null>(null);
  const captchaRef = useRef<TurnstileHandle>(null);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{
    requestNumber: string;
    newAccount: boolean;
  } | null>(null);

  useEffect(() => {
    let active = true;
    getRequestPrefill()
      .then((p) => {
        if (!active || !p) return;
        setSignedIn(true);
        setName(p.name);
        setEmail(p.email);
        setPhone(p.phone);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const resolvedType = requestType === "Other" ? otherType.trim() : requestType;

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
      if (res.ok && res.url) setImages((p) => [...p, res.url!]);
      else setError(res.error ?? "Couldn’t upload that image.");
    }
    setUploading(false);
  };

  const goNext = () => {
    setError(null);
    if (step === 0) {
      if (!resolvedType) return setError("Tell us what you’d like.");
      if (title.trim().length < 3) return setError("Give your idea a short title.");
    }
    setDir(1);
    setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };
  const goBack = () => {
    setError(null);
    setDir(-1);
    setStep((s) => Math.max(0, s - 1));
  };

  const onSubmit = async () => {
    if (isHoneypotFilled(hp)) return;
    setError(null);
    if (!name.trim() || !email.trim() || !phone.trim()) {
      return setError("Please fill in your contact details.");
    }
    setSubmitting(true);
    const res = await createCustomRequest({
      name,
      email,
      phone,
      requestType: resolvedType,
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
      setDone({
        requestNumber: res.requestNumber,
        newAccount: !!res.isNewAccount,
      });
    } else {
      captchaRef.current?.reset();
      setCaptcha(null);
      setError(res.error ?? "Something went wrong. Please try again.");
    }
  };

  if (done) {
    return (
      <div className="px-2 py-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-olive/15 text-olive">
          <MailCheck size={22} />
        </span>
        <h2 className="mt-5 font-display text-2xl">Your request is in 🌱</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-soft">
          Reference{" "}
          <span className="font-medium text-ink">{done.requestNumber}</span>. We’ll
          review your idea and email you a quote — with a link to track it
          {done.newAccount && " and to set up your new account"}.
        </p>
        {onClose ? (
          <Button className="mt-7" onClick={onClose}>
            Done
          </Button>
        ) : (
          <Link
            href="/shop"
            className="mt-7 inline-flex items-center justify-center rounded-full border border-ink/25 px-6 py-3 text-sm font-medium text-ink transition-colors hover:border-olive hover:text-olive"
          >
            Continue browsing
          </Link>
        )}
      </div>
    );
  }

  const variants = {
    enter: (d: number) => ({ x: reduce ? 0 : d * 36, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: reduce ? 0 : d * -36, opacity: 0 }),
  };

  return (
    <div className="relative">
      <Honeypot value={hp} onChange={setHp} />

      {/* Stepper */}
      <div className="mb-7 flex items-center">
        {STEPS.map((label, i) => {
          const active = i === step;
          const complete = i < step;
          return (
            <Fragment key={label}>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors sm:h-7 sm:w-7",
                    active
                      ? "bg-olive text-cream"
                      : complete
                        ? "bg-olive/15 text-olive"
                        : "bg-cream-2 text-ink-soft"
                  )}
                >
                  {complete ? <Check size={13} /> : i + 1}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium sm:text-sm",
                    active ? "text-ink" : "text-ink-soft"
                  )}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <span
                  className={cn(
                    "mx-2 h-px flex-1 transition-colors sm:mx-3",
                    complete ? "bg-olive/40" : "bg-cream-3"
                  )}
                />
              )}
            </Fragment>
          );
        })}
      </div>

      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.div
          key={step}
          custom={dir}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <span className="mb-2 block text-sm font-medium text-ink">
                  What would you like?
                </span>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {TYPE_OPTIONS.map((t) => {
                    const active = requestType === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setRequestType(t)}
                        className={cn(
                          "rounded-xl border px-3 py-3 text-sm font-medium transition-all",
                          active
                            ? "border-olive bg-olive/5 text-ink"
                            : "border-cream-3 text-ink-soft hover:border-olive/40"
                        )}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
                {requestType === "Other" && (
                  <input
                    value={otherType}
                    onChange={(e) => setOtherType(e.target.value)}
                    placeholder="Tell us what kind of piece…"
                    className={cn(inputCls, "mt-2.5")}
                    autoFocus
                  />
                )}
              </div>
              <Field
                label="Give it a title"
                hint="A short summary, e.g. “Lavender pillar candle for a wedding”"
              >
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What are you dreaming up?"
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
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
                  className={cn(inputCls, "w-28")}
                />
              </Field>
              <Field label="Tell us more" hint="Inspiration, deadlines, packaging…">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className={cn(inputCls, "resize-none")}
                  placeholder="Describe what you have in mind."
                />
              </Field>
              <div>
                <span className="mb-1.5 block text-sm font-medium text-ink">
                  Inspiration images <span className="font-normal text-ink-soft">· optional</span>
                </span>
                {images.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2.5">
                    {images.map((url) => (
                      <div key={url} className="relative h-16 w-16 overflow-hidden rounded-lg border border-cream-3">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          aria-label="Remove image"
                          onClick={() => setImages((p) => p.filter((u) => u !== url))}
                          className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-ink/70 text-cream"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {images.length < MAX_IMAGES && (
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-ink/20 px-4 py-2 text-sm text-ink transition-colors hover:border-olive hover:text-olive">
                    {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
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
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {signedIn ? (
                <p className="rounded-xl bg-olive/10 px-4 py-2.5 text-sm text-olive">
                  <Check size={14} className="mr-1 inline" />
                  Saved to your account — track it from your dashboard.
                </p>
              ) : (
                <p className="rounded-xl bg-taupe/15 px-4 py-2.5 text-xs text-ink-soft">
                  We’ll link this request to your account so you can track it.
                  New here? We’ll email you a link to set a password.
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name">
                  <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} autoComplete="name" />
                </Field>
                <Field label="Phone">
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} autoComplete="tel" placeholder="+27 or 0…" />
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
                />
              </Field>
              <p className="rounded-xl bg-cream-2 px-4 py-3 text-sm text-ink-soft">
                A <span className="font-medium text-ink">deposit may apply</span> if
                accepted — always deducted from your total. You’ll see the full
                price before paying anything.
              </p>
              {!signedIn && (
                <Turnstile ref={captchaRef} onVerify={setCaptcha} onExpire={() => setCaptcha(null)} />
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {error && (
        <p className="mt-4 rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay">{error}</p>
      )}

      {/* Nav */}
      <div className="mt-6 flex items-center justify-between gap-3">
        {step > 0 ? (
          <button
            type="button"
            onClick={goBack}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
          >
            <ArrowLeft size={16} /> Back
          </button>
        ) : (
          <span />
        )}
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={goNext}>
            Continue <ArrowRight size={16} />
          </Button>
        ) : (
          <Button type="button" onClick={onSubmit} disabled={submitting || uploading}>
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? "Sending…" : "Send request"}
          </Button>
        )}
      </div>
    </div>
  );
}
