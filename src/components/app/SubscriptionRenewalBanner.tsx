"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle, Clock, X } from "lucide-react";
import { billingApi, SubscriptionResponse } from "@/lib/billing-api";

const DISMISS_KEY = "p360_renewal_banner_dismissed";
const DAY_MS = 24 * 60 * 60 * 1000;
// Show the soon-to-expire banner this many days before renewsAt. Matches
// the email reminder window in backend SubscriptionRenewalService.
const REMINDER_DAYS = 7;

/**
 * Top-of-app banner that warns when a paid subscription is approaching
 * `renewsAt` (yellow, dismissible for the session) or already past it
 * (red, non-dismissible, the user can't do anything else until they
 * renew anyway). Hidden for trial / cancelled / non-applicable users.
 *
 * Replaces the visibility into renewal state that Paystack auto-debit
 * used to provide implicitly, now that subscriptions are pay-as-you-go,
 * the user needs an in-app nudge to come back.
 */
export function SubscriptionRenewalBanner() {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setDismissed(window.sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {}
  }, []);

  const { data } = useQuery<SubscriptionResponse>({
    queryKey: ["subscription", "renewal-banner"],
    queryFn: () => billingApi.getSubscription(),
    // Don't refetch obsessively, the banner only changes when renewsAt
    // crosses a day boundary. Once an hour is plenty.
    staleTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (!mounted || !data) return null;
  if (!data.applicable) return null;
  if (data.tier === "trial") return null;
  if (data.status === "cancelled") return null;

  const now = Date.now();
  const renewsAtMs = data.renewsAt ? new Date(data.renewsAt).getTime() : null;
  const daysUntil = renewsAtMs ? Math.ceil((renewsAtMs - now) / DAY_MS) : null;

  const isExpired =
    data.status === "expired" ||
    data.status === "past_due" ||
    (renewsAtMs !== null && renewsAtMs <= now);
  const isExpiringSoon =
    !isExpired &&
    data.status === "active" &&
    daysUntil !== null &&
    daysUntil <= REMINDER_DAYS;

  if (!isExpired && !isExpiringSoon) return null;
  // Expired banner is non-dismissible, read-only mode is a hard block
  // and the banner is the user's only path back to billing.
  if (isExpiringSoon && dismissed) return null;

  function dismiss() {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  const expiredCopy = {
    title: "Your subscription has expired",
    body: "Your account is read-only until you renew. Existing records are kept safe.",
  };
  const soonCopy = {
    title:
      daysUntil === 0
        ? "Your subscription expires today"
        : daysUntil === 1
          ? "Your subscription expires tomorrow"
          : `Your subscription expires in ${daysUntil} days`,
    body: "Renew now to avoid any interruption. We accept card, bank transfer, USSD, and pay-with-bank.",
  };
  const copy = isExpired ? expiredCopy : soonCopy;

  const wrapperClass = isExpired
    ? "border-b border-red-200 bg-red-50 px-4 py-2.5 sm:px-6"
    : "border-b border-cryola-200/70 bg-cryola-50/70 px-4 py-2.5 sm:px-6";
  const iconBgClass = isExpired
    ? "bg-red-500 text-white"
    : "bg-cryola-300 text-foundation-700";
  const titleClass = isExpired
    ? "font-semibold text-red-700"
    : "font-semibold text-foundation-700";
  const buttonClass = isExpired
    ? "rounded-full bg-red-600 px-3.5 py-1.5 text-[12px] font-semibold text-white transition hover:bg-red-700"
    : "rounded-full bg-foundation-700 px-3.5 py-1.5 text-[12px] font-semibold text-paper transition hover:bg-foundation-800";

  return (
    <div className={wrapperClass}>
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${iconBgClass}`}
          >
            {isExpired ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
          </span>
          <div className="min-w-0 text-[12.5px] leading-snug">
            <p className={titleClass}>{copy.title}</p>
            <p className="truncate text-ink-muted">{copy.body}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Link href="/app/billing" className={buttonClass}>
            {isExpired ? "Renew now" : "Renew"}
          </Link>
          {isExpiringSoon ? (
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="grid h-7 w-7 place-items-center rounded-full text-ink-muted transition hover:bg-foundation-700/5 hover:text-foundation-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
