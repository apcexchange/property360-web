import React from "react";

interface Props {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  filters?: React.ReactNode;
  /** Optional small caps eyebrow displayed above the title (e.g. "Section 01"). */
  eyebrow?: string;
}

export function PageHeader({ title, description, actions, filters, eyebrow }: Props) {
  return (
    <div className="mb-8">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          {eyebrow && (
            <div className="mb-3 flex items-center gap-2.5">
              <span aria-hidden className="h-3 w-[3px] bg-cryola-400" />
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-foundation-700">
                {eyebrow}
              </p>
            </div>
          )}
          <h2 className="font-display text-[34px] font-medium leading-[1.05] tracking-[-0.025em] text-foundation-700 sm:text-[40px]">
            {title}
          </h2>
          {description && (
            <p className="mt-2.5 max-w-2xl font-display text-[15.5px] italic leading-snug text-ink-muted">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
      </div>

      {/* Masthead double rule, the editorial signature, now in brand teal */}
      <div className="mt-5 h-px w-full bg-foundation-700/30" />
      <div className="mt-[3px] h-px w-full bg-foundation-700/30" />

      {filters && (
        <div className="mt-5 flex flex-wrap items-center gap-2">{filters}</div>
      )}
    </div>
  );
}
