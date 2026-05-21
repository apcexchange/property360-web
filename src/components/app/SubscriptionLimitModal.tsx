"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X, AlertTriangle, Clock } from "lucide-react";
import {
  SubscriptionLimitDetail,
  SubscriptionLimitReason,
  SUBSCRIPTION_LIMIT_EVENT,
} from "@/lib/api";

/**
 * Global modal shown when the API returns HTTP 402 (subscription limit hit
 * or expired). The interceptor in src/lib/api.ts dispatches a custom event
 * with the limit detail; we listen here. Sits inside /app/layout so it's
 * only mounted when a landlord is in their app.
 *
 * We keep the prompt informational + a single big "Manage plan" link to
 * /billing — no in-modal Paystack call. The actual upgrade happens on
 * /billing where the user picks a tier and goes through checkout.
 */
export function SubscriptionLimitModal() {
  const [detail, setDetail] = useState<SubscriptionLimitDetail | null>(null);

  useEffect(() => {
    function onLimit(e: Event) {
      const ce = e as CustomEvent<SubscriptionLimitDetail>;
      setDetail(ce.detail);
    }
    window.addEventListener(SUBSCRIPTION_LIMIT_EVENT, onLimit);
    return () => window.removeEventListener(SUBSCRIPTION_LIMIT_EVENT, onLimit);
  }, []);

  // Close on Esc.
  useEffect(() => {
    if (!detail) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDetail(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [detail]);

  if (!detail) return null;

  const meta = META_FOR_REASON[detail.reason];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sub-limit-title"
      className="fixed inset-0 z-50 grid place-items-center bg-foundation-900/40 px-4 backdrop-blur-sm"
      onClick={() => setDetail(null)}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-foundation-700/10 bg-paper shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setDetail(null)}
          aria-label="Dismiss"
          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full text-ink-muted transition hover:bg-foundation-700/5 hover:text-foundation-700"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="bg-foundation-700 px-6 pb-5 pt-7 text-paper">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-cryola-300 text-foundation-700">
            <meta.Icon className="h-5 w-5" />
          </div>
          <h2
            id="sub-limit-title"
            className="mt-4 font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.01em]"
          >
            {meta.title}
          </h2>
          <p className="mt-2 text-[13.5px] leading-[1.5] text-paper/80">
            {meta.body(detail)}
          </p>
        </div>

        {detail.reason !== "SUBSCRIPTION_EXPIRED" && (
          <div className="border-b border-foundation-700/10 px-6 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Current usage
            </p>
            <p className="mt-2 font-display text-[26px] font-extrabold leading-none text-foundation-700">
              {detail.reason === "PROPERTY_LIMIT_REACHED"
                ? `${detail.propertyCount ?? "?"} / ${detail.propertyLimit ?? "?"}`
                : `${detail.agentSeatCount ?? "?"} / ${detail.agentSeatLimit ?? "?"}`}
              <span className="ml-2 text-[13px] font-normal text-ink-muted">
                {detail.reason === "PROPERTY_LIMIT_REACHED"
                  ? "properties"
                  : "agent seats"}
              </span>
            </p>
            {detail.tier && (
              <p className="mt-1 text-[12px] capitalize text-ink-muted">
                You&apos;re on the <strong>{detail.tier}</strong> plan.
              </p>
            )}
          </div>
        )}

        <div className="space-y-3 px-6 py-5">
          <Link
            href="/billing"
            onClick={() => setDetail(null)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-foundation-700 px-5 py-3 text-[13px] font-semibold text-paper transition hover:bg-foundation-800"
          >
            <Sparkles className="h-4 w-4" />
            {detail.reason === "SUBSCRIPTION_EXPIRED"
              ? "Reactivate plan"
              : "Upgrade plan"}
          </Link>
          <button
            type="button"
            onClick={() => setDetail(null)}
            className="block w-full rounded-full border border-foundation-700/15 bg-paper px-5 py-3 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

interface ReasonMeta {
  Icon: typeof AlertTriangle;
  title: string;
  body: (d: SubscriptionLimitDetail) => string;
}

const META_FOR_REASON: Record<SubscriptionLimitReason, ReasonMeta> = {
  PROPERTY_LIMIT_REACHED: {
    Icon: AlertTriangle,
    title: "Property limit reached",
    body: (d) =>
      `Your current plan covers ${d.propertyLimit ?? "your"} properties. Upgrade to add more and unlock larger caps for tenants and agents.`,
  },
  AGENT_SEAT_LIMIT_REACHED: {
    Icon: AlertTriangle,
    title: "Agent seat limit reached",
    body: (d) =>
      `Your current plan includes ${d.agentSeatLimit ?? "your"} agent seats. Upgrade to invite more team members.`,
  },
  SUBSCRIPTION_EXPIRED: {
    Icon: Clock,
    title: "Subscription ended",
    body: () =>
      "Your trial or subscription has ended. Reactivate a plan to add new properties or invite agents. Your existing data is safe.",
  },
};
