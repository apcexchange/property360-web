"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Sparkles, User, ArrowRight, LogOut } from "lucide-react";
import { billingApi, SubscriptionView } from "@/lib/billing-api";
import { session } from "@/lib/session";

/**
 * Paths inside /app/* the user can still visit when their subscription
 * has lapsed — so they can pay, manage their account, or sign out.
 * Includes the legacy top-level `/billing` thin-redirect for mobile
 * handoff users; the real billing UI lives at `/app/billing`.
 */
const ALWAYS_ALLOWED_PREFIXES = [
  "/app/profile",
  "/app/refer",
  "/app/billing",
  "/billing",
  // Withdrawing already-earned money stays available even when expired (the
  // backend exempts POST /payouts), so the wallet + withdraw flow must remain
  // reachable. Bank-account *changes* under here still 402 at the API.
  "/app/wallet",
];

/**
 * Wraps the authed app surface. When the caller is a landlord/agent
 * and their subscription is no longer entitled, swaps the main content
 * for a full-page "Subscription ended" view. The sidebar stays mounted
 * (so the user can still reach Subscription / Profile / Sign out).
 *
 * Tenants and admins fall straight through — they don't carry a paid
 * subscription.
 */
export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";

  const q = useQuery({
    queryKey: ["subscription", "me"],
    queryFn: () => billingApi.getSubscription(),
    // Stale-while-revalidate so paying users don't see a flash on tab
    // resume; bypassed entirely while we're loading the very first time.
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  // While we don't know the answer, default to "allow" so paying users
  // never see a flash of the lock screen on slow connections. The
  // server-side enforcement is the safety net.
  if (q.isLoading || !q.data) return <>{children}</>;

  // Tenants / admins / anyone not on a subscriptionable role — pass through.
  if (!q.data.applicable) return <>{children}</>;

  const view: SubscriptionView = q.data;

  if (view.isEntitled) return <>{children}</>;

  // Allow Billing + Profile + the gate view itself.
  if (ALWAYS_ALLOWED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return <>{children}</>;
  }

  return <LockedView view={view} />;
}

function LockedView({ view }: { view: SubscriptionView }) {
  const router = useRouter();

  function signOut() {
    session.clear();
    router.replace("/login");
  }

  const wasTrial = view.tier === "trial";
  const tierLabel = view.tierDisplayName || view.tier;
  const endedOn = view.trialEndsAt
    ? new Date(view.trialEndsAt)
    : view.renewsAt
    ? new Date(view.renewsAt)
    : null;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 py-12">
      <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-foundation-700/10 bg-paper shadow-[0_24px_60px_-30px_rgb(15_39_44_/_0.25)]">
        <div className="bg-foundation-700 px-8 pb-7 pt-9 text-paper">
          <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-cryola-300 text-foundation-700">
            <Lock className="h-5 w-5" />
          </div>
          <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-cryola-300">
            Subscription required
          </p>
          <h1 className="mt-3 font-display text-[26px] font-extrabold leading-[1.1] tracking-[-0.015em] text-paper">
            {wasTrial
              ? "Your free trial has ended."
              : "Your subscription has ended."}
          </h1>
          <p className="mt-3 text-[14px] leading-[1.55] text-paper/80">
            {wasTrial
              ? "Pick a plan to keep collecting rent, managing tenants, and getting paid into your wallet."
              : `Your ${tierLabel} plan is no longer active. Reactivate it to keep using Property360 — your properties, tenants, and rent records are all safely waiting.`}
          </p>
          {endedOn && (
            <p className="mt-2 text-[12px] text-paper/65">
              {wasTrial ? "Trial ended" : "Plan ended"} on{" "}
              {endedOn.toLocaleDateString("en-NG", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              .
            </p>
          )}
        </div>

        <div className="space-y-3 px-8 py-7">
          <Link
            href="/app/billing"
            className="group flex w-full items-center justify-center gap-2 rounded-full bg-foundation-700 px-5 py-3 text-[13.5px] font-semibold text-paper transition hover:bg-foundation-800"
          >
            <Sparkles className="h-4 w-4" />
            {wasTrial ? "Pick a plan" : "Reactivate plan"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/app/profile"
            className="flex w-full items-center justify-center gap-2 rounded-full border border-foundation-700/15 bg-paper px-5 py-3 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
          >
            <User className="h-4 w-4" /> Manage profile
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-[12.5px] font-semibold text-ink-muted transition hover:bg-foundation-700/5 hover:text-foundation-700"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>

        <div className="border-t border-foundation-700/10 bg-canvas px-8 py-5">
          <p className="text-[12px] leading-[1.5] text-ink-muted">
            <strong className="text-foundation-700">Your data is safe.</strong>{" "}
            Properties, leases, payment records, and uploaded agreements all
            remain in your account. Picking a plan brings them back instantly.
          </p>
        </div>
      </div>
    </div>
  );
}
