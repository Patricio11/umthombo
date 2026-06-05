"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { Settings } from "@/server/db/schema";
import { Card, Field, Input, Textarea } from "@/components/admin/primitives";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/admin/Toast";
import { updateSettings } from "@/server/actions/settings";
import { site } from "@/data/site";

export function SettingsForm({ settings }: { settings: Settings | null }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState({
    tagline: settings?.tagline ?? "",
    story: settings?.story ?? "",
    collection: settings?.collection ?? "",
    whatsappNumber: settings?.whatsappNumber ?? "",
    whatsappDisplay: settings?.whatsappDisplay ?? "",
    instagramHandle: settings?.instagramHandle ?? "",
    instagramUrl: settings?.instagramUrl ?? "",
    facebookHandle: settings?.facebookHandle ?? "",
    facebookUrl: settings?.facebookUrl ?? "",
    email: settings?.email ?? "",
  });

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateSettings(form);
      if (res.ok) {
        toast.success("Settings saved.");
        router.refresh();
      } else {
        toast.error(res.error ?? "Something went wrong.");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      <p className="text-sm text-ink-soft">
        Leave a field blank to use the built-in default (shown as the
        placeholder).
      </p>

      <Card className="space-y-5">
        <h2 className="font-display text-lg">Brand voice</h2>
        <Field label="Tagline">
          <Input
            value={form.tagline}
            onChange={(e) => set("tagline", e.target.value)}
            placeholder={site.tagline}
          />
        </Field>
        <Field label="Story" hint="The short paragraph on the home + about pages">
          <Textarea
            rows={3}
            value={form.story}
            onChange={(e) => set("story", e.target.value)}
            placeholder={site.story}
          />
        </Field>
      </Card>

      <Card className="space-y-5">
        <h2 className="font-display text-lg">Contact</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="WhatsApp number" hint="Digits only, incl. country code">
            <Input
              value={form.whatsappNumber}
              onChange={(e) => set("whatsappNumber", e.target.value)}
              placeholder={site.whatsapp.number}
            />
          </Field>
          <Field label="WhatsApp display">
            <Input
              value={form.whatsappDisplay}
              onChange={(e) => set("whatsappDisplay", e.target.value)}
              placeholder={site.whatsapp.display}
            />
          </Field>
        </div>
        <Field label="Email">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder={site.email}
          />
        </Field>
        <Field label="Collection info">
          <Input
            value={form.collection}
            onChange={(e) => set("collection", e.target.value)}
            placeholder={site.collection}
          />
        </Field>
      </Card>

      <Card className="space-y-5">
        <h2 className="font-display text-lg">Social</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Instagram handle">
            <Input
              value={form.instagramHandle}
              onChange={(e) => set("instagramHandle", e.target.value)}
              placeholder={site.instagram.handle}
            />
          </Field>
          <Field label="Instagram URL">
            <Input
              value={form.instagramUrl}
              onChange={(e) => set("instagramUrl", e.target.value)}
              placeholder={site.instagram.href}
            />
          </Field>
          <Field label="Facebook handle">
            <Input
              value={form.facebookHandle}
              onChange={(e) => set("facebookHandle", e.target.value)}
              placeholder={site.facebook.handle}
            />
          </Field>
          <Field label="Facebook URL">
            <Input
              value={form.facebookUrl}
              onChange={(e) => set("facebookUrl", e.target.value)}
              placeholder={site.facebook.href}
            />
          </Field>
        </div>
      </Card>

      <Button type="submit" disabled={pending}>
        {pending && <Loader2 size={16} className="animate-spin" />}
        Save settings
      </Button>
    </form>
  );
}
