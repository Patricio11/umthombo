import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Fully custom checkbox — a styled box over a visually-hidden native input
 * (keeps native keyboard + label behaviour + form semantics). Controlled:
 * `checked` + `onChange(checked)`.
 */
export function Checkbox({
  checked,
  onChange,
  className,
  disabled,
  ...rest
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
} & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "checked" | "onChange" | "type"
>) {
  return (
    <span
      className={cn(
        "relative inline-flex h-[18px] w-[18px] shrink-0 align-middle",
        className
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer absolute inset-0 z-10 m-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        {...rest}
      />
      <span className="pointer-events-none absolute inset-0 rounded-[6px] border-2 border-cream-3 bg-cream transition-colors peer-checked:border-olive peer-checked:bg-olive peer-hover:border-olive/60 peer-focus-visible:ring-2 peer-focus-visible:ring-olive/35 peer-focus-visible:ring-offset-1 peer-disabled:opacity-50" />
      <Check
        size={13}
        strokeWidth={3.25}
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-cream opacity-0 transition-opacity peer-checked:opacity-100"
      />
    </span>
  );
}
