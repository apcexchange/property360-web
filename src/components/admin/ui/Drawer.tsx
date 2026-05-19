"use client";

import React, { useEffect } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: "md" | "lg" | "xl";
  footer?: React.ReactNode;
}

const widthClass: Record<NonNullable<Props["width"]>, string> = {
  md: "max-w-md",
  lg: "max-w-xl",
  xl: "max-w-2xl",
};

export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  children,
  width = "lg",
  footer,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex">
      <div
        className="absolute inset-0 bg-foundation-900/45 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`relative ml-auto flex h-full w-full ${widthClass[width]} flex-col border-l border-rule-strong bg-surface shadow-pop`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <header className="flex items-start justify-between gap-4 border-b border-rule-strong px-6 py-5">
          <div className="min-w-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
              Detail
            </p>
            <h3 className="mt-1.5 truncate font-display text-[22px] font-medium leading-tight tracking-[-0.02em] text-ink">
              {title}
            </h3>
            {subtitle && (
              <p className="mt-1 truncate font-display text-[13.5px] italic text-ink-muted">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-sm border border-rule-strong px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-foundation-700 hover:bg-paper-deep"
            aria-label="Close drawer"
          >
            Close
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <footer className="border-t border-rule-strong bg-paper-deep/40 px-6 py-3.5">
            {footer}
          </footer>
        )}
      </aside>
    </div>
  );
}
