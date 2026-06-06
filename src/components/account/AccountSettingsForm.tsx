"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { updateUser, changePassword } from "@/lib/auth-client";
import { passwordOk } from "@/lib/password";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { authInputCls } from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/Button";

function Card({
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

function Note({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <p
      className={`rounded-xl px-4 py-2.5 text-sm ${
        ok ? "bg-olive/12 text-olive" : "bg-clay/10 text-clay"
      }`}
    >
      {ok && <Check size={14} className="mr-1 inline" />}
      {msg}
    </p>
  );
}

export function AccountSettingsForm({
  name: name0,
  email,
  phone: phone0,
  marketingOptIn: marketing0,
}: {
  name: string;
  email: string;
  phone: string;
  marketingOptIn: boolean;
}) {
  // Profile
  const [name, setName] = useState(name0);
  const [phone, setPhone] = useState(phone0);
  const [marketing, setMarketing] = useState(marketing0);
  const [pSaving, setPSaving] = useState(false);
  const [pMsg, setPMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setPMsg(null);
    setPSaving(true);
    const { error } = await updateUser({
      name: name.trim(),
      phone: phone.trim(),
      marketingOptIn: marketing,
    } as Parameters<typeof updateUser>[0]);
    setPSaving(false);
    setPMsg(
      error
        ? { ok: false, msg: error.message || "Couldn’t save." }
        : { ok: true, msg: "Saved." }
    );
  };

  // Password
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (!passwordOk(next)) {
      setPwMsg({ ok: false, msg: "New password needs at least 8 characters." });
      return;
    }
    setPwSaving(true);
    const { error } = await changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    });
    setPwSaving(false);
    if (error) {
      setPwMsg({ ok: false, msg: error.message || "Couldn’t change password." });
      return;
    }
    setCurrent("");
    setNext("");
    setPwMsg({ ok: true, msg: "Password updated." });
  };

  return (
    <div className="grid max-w-xl gap-5">
      {/* Profile */}
      <Card title="Profile">
        <form onSubmit={saveProfile} className="space-y-4">
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={authInputCls}
              required
            />
          </Field>
          <Field label="Phone">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+27 or 0…"
              className={authInputCls}
            />
          </Field>
          <Field label="Email">
            <input value={email} disabled className={`${authInputCls} opacity-60`} />
          </Field>
          <label className="flex items-start gap-2.5 text-sm text-ink-soft">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-olive"
            />
            <span>Email me about new products and occasional offers.</span>
          </label>
          {pMsg && <Note {...pMsg} />}
          <Button type="submit" disabled={pSaving}>
            {pSaving && <Loader2 size={16} className="animate-spin" />}
            Save profile
          </Button>
        </form>
      </Card>

      {/* Password */}
      <Card title="Change password">
        <form onSubmit={savePassword} className="space-y-4">
          <Field label="Current password">
            <PasswordInput
              value={current}
              onChange={setCurrent}
              placeholder="Current password"
              autoComplete="current-password"
            />
          </Field>
          <Field label="New password">
            <PasswordInput
              value={next}
              onChange={setNext}
              placeholder="New password"
              autoComplete="new-password"
              showMeter
            />
          </Field>
          {pwMsg && <Note {...pwMsg} />}
          <Button type="submit" disabled={pwSaving}>
            {pwSaving && <Loader2 size={16} className="animate-spin" />}
            Update password
          </Button>
        </form>
      </Card>
    </div>
  );
}
