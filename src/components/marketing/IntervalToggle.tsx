"use client";

import { BillingInterval } from "@/lib/billing-api";

export function IntervalToggle({
  value,
  onChange,
  className = "",
  variant = "light",
  savingsLabel = "Save 20%",
}: {
  value: BillingInterval;
  onChange: (next: BillingInterval) => void;
  className?: string;
  variant?: "light" | "dark";
  savingsLabel?: string;
}) {
  const isDark = variant === "dark";
  const track = isDark
    ? "border-paper/15 bg-foundation-800"
    : "border-foundation-700/10 bg-paper-deep/60";
  const inactive = isDark ? "text-paper/70" : "text-ink-muted";
  const activeFg = isDark ? "text-foundation-700" : "text-foundation-700";
  const activeBg = isDark ? "bg-cryola-300" : "bg-surface shadow-card";

  return (
    <div
      role="tablist"
      aria-label="Billing interval"
      className={`inline-flex items-center gap-1 rounded-full border p-1 ${track} ${className}`}
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "monthly"}
        onClick={() => onChange("monthly")}
        className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition ${
          value === "monthly" ? `${activeBg} ${activeFg}` : inactive
        }`}
      >
        Monthly
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "annual"}
        onClick={() => onChange("annual")}
        className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition ${
          value === "annual" ? `${activeBg} ${activeFg}` : inactive
        }`}
      >
        Annual
        <span
          className={`rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider ${
            value === "annual"
              ? "bg-foundation-700 text-cryola-300"
              : isDark
              ? "bg-cryola-300/80 text-foundation-700"
              : "bg-cryola-300 text-foundation-700"
          }`}
        >
          {savingsLabel}
        </span>
      </button>
    </div>
  );
}
