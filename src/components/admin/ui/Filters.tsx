import React from "react";

export function SearchInput({
  value,
  onChange,
  placeholder,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" strokeLinecap="round" />
        </svg>
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-sm border border-rule bg-surface py-2 pl-9 pr-3 text-[13.5px] text-ink-body placeholder:text-ink-faint outline-none transition focus:border-foundation-500"
      />
    </div>
  );
}

export function Select({
  value,
  onChange,
  children,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`rounded-sm border border-rule bg-surface px-3 py-2 text-[13.5px] text-ink-body outline-none transition focus:border-foundation-500 ${className}`}
    >
      {children}
    </select>
  );
}

export function Button({
  children,
  variant = "secondary",
  size = "md",
  className = "",
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success";
  size?: "sm" | "md";
}) {
  const sizeCls =
    size === "sm"
      ? "px-2.5 py-1 text-[10.5px] tracking-[0.12em]"
      : "px-3.5 py-2 text-[11.5px] tracking-[0.1em]";

  // Editorial buttons: small caps labels, hard corners, ink-on-paper pairings
  const variantCls = {
    primary:
      "bg-foundation-700 text-paper hover:bg-foundation-800 disabled:opacity-50",
    secondary:
      "border border-rule-strong bg-surface text-foundation-700 hover:bg-paper-deep disabled:opacity-50",
    ghost:
      "text-foundation-700 hover:bg-paper-deep disabled:opacity-50",
    danger:
      "border border-error/30 bg-error/5 text-error hover:bg-error/10 disabled:opacity-50",
    success:
      "border border-cryola-500/40 bg-cryola-100 text-foundation-700 hover:bg-cryola-200 disabled:opacity-50",
  }[variant];

  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-sm font-semibold uppercase transition ${sizeCls} ${variantCls} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
