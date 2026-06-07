import { HONEYPOT_NAME } from "@/lib/honeypot";

/**
 * Visually-hidden decoy field. Positioned off-screen (not `display:none`, which
 * some bots skip), hidden from assistive tech and removed from the tab order so
 * a real person never reaches it. Bots that auto-fill every field will populate
 * it — the server then rejects the submission.
 */
export function Honeypot({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden"
    >
      <label>
        Company website
        <input
          type="text"
          name={HONEYPOT_NAME}
          tabIndex={-1}
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}
