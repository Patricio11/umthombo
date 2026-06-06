"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { passwordStrength } from "@/lib/password";
import { authInputCls } from "@/components/auth/AuthShell";
import { cn } from "@/lib/utils";

const toneClass = {
  clay: "bg-clay",
  taupe: "bg-taupe",
  olive: "bg-olive",
} as const;
const toneText = {
  clay: "text-clay",
  taupe: "text-taupe",
  olive: "text-olive",
} as const;

export function PasswordInput({
  value,
  onChange,
  placeholder = "Password",
  autoComplete = "current-password",
  showMeter = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  showMeter?: boolean;
}) {
  const [show, setShow] = useState(false);
  const strength = passwordStrength(value);

  return (
    <div>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={cn(authInputCls, "pr-11")}
        />
        <button
          type="button"
          aria-label={show ? "Hide password" : "Show password"}
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft transition-colors hover:text-olive"
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {showMeter && value.length > 0 && (
        <div className="mt-2">
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i < strength.score ? toneClass[strength.tone] : "bg-cream-3"
                )}
              />
            ))}
          </div>
          <p className={cn("mt-1 text-xs", toneText[strength.tone])}>
            {strength.label}
          </p>
        </div>
      )}
    </div>
  );
}
