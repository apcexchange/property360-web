"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { billingApi, SubscriptionResponse } from "@/lib/billing-api";
import { session } from "@/lib/session";

/**
 * Paystack callback target. Paystack appends ?reference=… and ?trxref=… here.
 * We call /subscriptions/verify with that reference so the backend verifies
 * the transaction directly with Paystack and activates the plan in one round
 * trip — no waiting on the webhook. Verify is idempotent with the webhook,
 * so they can race safely.
 *
 * If the user came from the onboarding wizard (sessionStorage flag set in
 * /onboarding/plan), we redirect them on to /onboarding/done after activation
 * so the flow continues without a manual "Back to billing" tap.
 */
function SuccessInner() {
  const router = useRouter();
  const params = useSearchParams();
  const reference = params?.get("ref") || params?.get("reference") || params?.get("trxref");
  const [sub, setSub] = useState<SubscriptionResponse | null>(null);
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    if (!session.getToken()) {
      setWaiting(false);
      return;
    }
    let cancelled = false;

    const onboardingNext =
      typeof window !== "undefined"
        ? window.sessionStorage.getItem("p360_post_checkout_redirect")
        : null;

    const finishedActive = (fresh: SubscriptionResponse) => {
      if (cancelled) return;
      setSub(fresh);
      setWaiting(false);
      if (fresh.applicable && fresh.status === "active" && onboardingNext) {
        window.sessionStorage.removeItem("p360_post_checkout_redirect");
        // Small delay so the user sees the "you're now on X" confirmation
        // flash before we whisk them away to the next onboarding step.
        setTimeout(() => router.push(onboardingNext), 900);
      }
    };

    const run = async () => {
      // 1) Fast path: ask the backend to verify directly with Paystack.
      if (reference) {
        try {
          const verified = await billingApi.verify(reference);
          finishedActive(verified);
          return;
        } catch {
          // Verify can legitimately fail (e.g. user reloaded after a long
          // delay and Paystack moved the tx to abandoned). Fall through to
          // polling /me which the webhook also writes to.
        }
      }

      // 2) Slow path: poll /subscriptions/me for the webhook to land.
      let attempts = 0;
      const tick = async () => {
        if (cancelled) return;
        attempts += 1;
        try {
          const fresh = await billingApi.getSubscription();
          if (cancelled) return;
          setSub(fresh);
          if (fresh.applicable && fresh.status === "active") {
            finishedActive(fresh);
            return;
          }
        } catch {
          // swallow; retry
        }
        if (attempts < 5) {
          setTimeout(tick, 3000);
        } else if (!cancelled) {
          setWaiting(false);
        }
      };
      tick();
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [reference, router]);

  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <Nav />

      <section className="mx-auto flex max-w-md flex-col items-start px-6 pt-20 pb-16">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-cryola-200 text-foundation-700">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <h1 className="mt-6 font-display text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.02em]">
          Thanks — your payment is in.
        </h1>
        <p className="mt-3 text-[15px] leading-[1.55] text-ink-muted">
          Paystack confirmed your payment. Your subscription updates as soon as
          Paystack notifies our backend — usually within a few seconds.
          {reference && (
            <>
              {" "}
              Reference:{" "}
              <code className="rounded bg-paper-deep px-1.5 py-0.5 text-[12.5px]">
                {reference}
              </code>
              .
            </>
          )}
        </p>

        <div className="mt-8 w-full rounded-2xl border border-foundation-700/10 bg-surface p-5">
          {waiting ? (
            <p className="text-[14px] text-ink-muted">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-cryola-500 align-middle" />{" "}
              Waiting for confirmation…
            </p>
          ) : sub && sub.applicable && sub.status === "active" ? (
            <>
              <p className="text-[14px] font-semibold text-foundation-700">
                You&apos;re now on {sub.tierDisplayName}.
              </p>
              <p className="mt-1 text-[13.5px] text-ink-muted">
                Your next renewal is{" "}
                {sub.renewsAt
                  ? new Date(sub.renewsAt).toLocaleDateString("en-NG", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "in 30 days"}
                .
              </p>
            </>
          ) : (
            <p className="text-[14px] text-ink-muted">
              Your plan should activate within a minute. If it doesn&apos;t,
              refresh this page or check the billing dashboard.
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/billing"
            className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800"
          >
            Back to billing →
          </Link>
          <Link
            href="/"
            className="text-[13px] font-semibold text-foundation-700 transition hover:text-foundation-900"
          >
            Open the marketing site
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-paper" />}>
      <SuccessInner />
    </Suspense>
  );
}
