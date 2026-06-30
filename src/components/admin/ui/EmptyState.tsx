import React from "react";

interface Props {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {/* Editorial dingbat, a printer's flourish, not an icon */}
      <div className="font-display text-[28px] leading-none text-ink-faint">
        ⁂
      </div>
      <p className="mt-5 font-display text-[19px] font-medium tracking-[-0.015em] text-ink">
        {title}
      </p>
      {description && (
        <p className="mt-2 max-w-sm font-display text-[14px] italic text-ink-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
