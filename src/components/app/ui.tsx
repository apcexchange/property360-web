"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function PageContainer({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-6xl px-6 py-8">{children}</div>;
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-foundation-700/10 bg-paper ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <Card className="p-5 transition hover:border-foundation-700/20">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </p>
      <p className="mt-3 font-amount text-[28px] font-extrabold leading-none tracking-[-0.02em] text-foundation-700">
        {value}
      </p>
      {hint && <p className="mt-2 text-[12.5px] text-ink-muted">{hint}</p>}
    </Card>
  );
  if (href) {
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body?: string;
  cta?: { label: string; href: string };
}) {
  return (
    <Card className="grid place-items-center p-12 text-center">
      <p className="font-display text-[20px] font-bold text-foundation-700">
        {title}
      </p>
      {body && (
        <p className="mt-2 max-w-md text-[13.5px] text-ink-muted">{body}</p>
      )}
      {cta && (
        <Link
          href={cta.href}
          className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800"
        >
          {cta.label} <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </Card>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-foundation-700/10 ${className}`}
    />
  );
}

export function ErrorBox({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Card className="border-red-200 bg-red-50 p-5">
      <p className="text-[14px] font-semibold text-red-700">{title}</p>
      {message && (
        <p className="mt-1 text-[13px] text-red-700/80">{message}</p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-full border border-red-300 bg-paper px-4 py-1.5 text-[12.5px] font-semibold text-red-700 transition hover:bg-red-100"
        >
          Try again
        </button>
      )}
    </Card>
  );
}

export function StatusPill({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "good" | "warn" | "bad" | "info";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-foundation-700/10 text-foundation-700",
    good: "bg-emerald-100 text-emerald-700",
    warn: "bg-amber-100 text-amber-700",
    bad: "bg-red-100 text-red-700",
    info: "bg-cryola-200 text-foundation-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.08em] ${tones[tone]}`}
    >
      {label}
    </span>
  );
}

export function formatNgn(n: number): string {
  if (!Number.isFinite(n)) return "₦0";
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
}

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
