"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> & {
  /** Classes for the relative wrapper (e.g. spacing like `mt-1`). */
  wrapperClassName?: string;
  /** Classes for the eye toggle button. Override to reposition per input style. */
  toggleClassName?: string;
};

/**
 * Drop-in replacement for `<input type="password">` with a show/hide eye
 * toggle. Callers keep their own visual styling via `className` — just add
 * right padding (e.g. `pr-10`) so typed text doesn't run under the icon.
 */
export function PasswordInput({
  className,
  wrapperClassName,
  toggleClassName,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={`relative${wrapperClassName ? ` ${wrapperClassName}` : ""}`}>
      <input type={visible ? "text" : "password"} className={className} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className={
          toggleClassName ??
          "absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center text-ink-faint transition hover:text-ink-muted"
        }
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
