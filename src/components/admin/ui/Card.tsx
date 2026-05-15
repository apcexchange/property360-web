import React from "react";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`border border-rule bg-surface ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="relative flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-foundation-700/20 px-5 py-4">
      {/* Brand spine on every card header */}
      <span aria-hidden className="absolute left-0 top-0 bottom-0 w-[2px] bg-foundation-700" />
      <div className="min-w-0">
        <h3 className="font-display text-[18px] font-medium leading-tight tracking-[-0.015em] text-foundation-700">
          {title}
        </h3>
        {description && (
          <p className="mt-1 font-display text-[13.5px] italic leading-snug text-ink-muted">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function CardBody({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}
