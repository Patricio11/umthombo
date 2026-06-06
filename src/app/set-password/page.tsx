"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { resetPassword } from "@/lib/auth-client";
import { passwordOk } from "@/lib/password";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Button } from "@/components/ui/Button";

export default function SetPasswordPage() {
  return (
    <Suspense>
      <SetPasswordForm />
    </Suspense>
  );
}

function SetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token");
  const error0 = params.get("error");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token || error0) {
    return (
      <AuthShell title="Link expired">
        <p className="rounded-xl bg-clay/10 px-4 py-3 text-center text-sm text-clay">
          This link is invalid or has expired. Please request a new one.
        </p>
        <p className="mt-5 text-center">
          <Link href="/forgot-password" className="link-underline text-olive">
            Get a new link
          </Link>
        </p>
      </AuthShell>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!passwordOk(password)) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don’t match.");
      return;
    }
    setLoading(true);
    const { error } = await resetPassword({ newPassword: password, token });
    setLoading(false);
    if (error) {
      setError(error.message || "We couldn’t set your password. Try a new link.");
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <AuthShell title="Password set">
        <div className="rounded-2xl border border-cream-3 bg-cream p-6 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-olive/15 text-olive">
            <CheckCircle2 size={22} />
          </span>
          <p className="mt-4 text-sm text-ink-soft">
            Your password is set. You can sign in now.
          </p>
          <Link
            href="/login"
            className="mt-5 inline-block link-underline text-sm text-olive"
          >
            Go to sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Set your password"
      subtitle="Choose a strong password for your account."
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <PasswordInput
          value={password}
          onChange={setPassword}
          placeholder="New password"
          autoComplete="new-password"
          showMeter
        />
        <PasswordInput
          value={confirm}
          onChange={setConfirm}
          placeholder="Confirm password"
          autoComplete="new-password"
        />
        {error && (
          <p className="rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay">
            {error}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          Set password
        </Button>
      </form>
    </AuthShell>
  );
}
