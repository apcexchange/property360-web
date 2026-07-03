import React from "react";

interface Props {
  label: string;
  value: React.ReactNode;
  loading?: boolean;
  delta?: number; // signed percent change vs previous period
  icon?: React.ReactNode;
  hint?: string;
}

export function StatCard({ label, value, loading, delta, hint }: Props) {
  const showDelta = !loading && typeof delta === "number" && Number.isFinite(delta);
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="group relative border border-rule bg-surface px-5 pb-5 pt-5 transition-colors hover:bg-cryola-50/60">
      {/* Brand accent rule, the KPI's "spine" */}
      <span aria-hidden className="absolute left-0 top-0 h-[3px] w-14 bg-foundation-700" />
      <span aria-hidden className="absolute left-14 top-0 h-[3px] w-3 bg-cryola-400" />

      <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-foundation-700">
        {label}
      </p>

      <p className="mt-3 font-display text-[30px] font-medium leading-[1.05] tracking-[-0.025em] text-foundation-700 tabular">
        {loading ? (
          <span className="inline-block h-7 w-28 animate-pulse rounded-sm bg-paper-deep" />
        ) : (
          value
        )}
      </p>

      {(showDelta || hint) && (
        <div className="mt-3 flex items-baseline justify-between gap-2 border-t border-foundation-700/15 pt-2.5 text-[11.5px]">
          {hint ? (
            <span className="font-display italic text-ink-muted">{hint}</span>
          ) : (
            <span />
          )}
          {showDelta && (
            <span
              className={`inline-flex items-center gap-1 font-mono text-[11px] font-medium tabular ${
                positive ? "text-foundation-700" : "text-error"
              }`}
            >
              <span
                aria-hidden
                className={positive ? "text-cryola-500" : "text-error"}
              >
                {positive ? "▲" : "▼"}
              </span>
              {Math.abs(delta!).toFixed(1)}%
            </span>
          )}
        </div>
      )}
    </div>
  );
}
