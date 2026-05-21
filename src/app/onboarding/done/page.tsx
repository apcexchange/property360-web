"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, KeyRound } from "lucide-react";
import { OnboardingShell } from "@/components/marketing/OnboardingShell";
import { AppStoreButtons } from "@/components/marketing/AppStoreButtons";
import { useOnboardingState, OnboardingState } from "@/lib/onboarding-state";

export default function DonePage() {
  const { state, reset, ready } = useOnboardingState();

  // The session state is cleared after we mount, so anything we want to
  // *display* (name, email, phone) we have to copy into local state first —
  // otherwise the page re-renders with "there" / blank fields right after
  // the reset fires.
  const [snapshot, setSnapshot] = useState<OnboardingState | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (snapshot === null) setSnapshot(state);
    reset();
    // Intentionally one-shot — depending on `reset` / `state` would re-fire
    // after the reset empties them and trigger a loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const firstName = snapshot?.firstName ?? "there";
  const email = snapshot?.email;
  const phone = snapshot?.phone;
  const role = snapshot?.role ?? "user";

  return (
    <OnboardingShell currentStep="done" includesPlan={role === "landlord"}>
      <div className="grid h-12 w-12 place-items-center rounded-full bg-cryola-200 text-foundation-700">
        <CheckCircle2 className="h-6 w-6" />
      </div>

      <h1 className="mt-6 font-display text-[clamp(1.75rem,4.5vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.02em]">
        You&apos;re all set, {firstName}.
      </h1>

      <p className="mt-4 text-[15px] leading-[1.55] text-ink-muted">
        {role === "landlord"
          ? "Your trial is active. Download the Property360 app to add your first property, invite tenants, and start collecting rent through Paystack."
          : role === "tenant"
          ? "Download the Property360 app to browse homes, pay rent, and stay in touch with your landlord — all in one place."
          : "Download the Property360 app. Once a landlord invites you to manage their property, you'll see it under My properties."}
      </p>

      {(email || phone) && (
        <div className="mt-8 rounded-2xl border border-foundation-700/10 bg-surface p-5">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 h-5 w-5 text-foundation-700" />
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-foundation-700">
                Signing in next time
              </p>
              <p className="mt-1 text-[13px] text-ink-muted">
                Use the email or phone below with the password you just
                created. The same credentials work in the mobile app and on{" "}
                <Link
                  href="/billing/login"
                  className="font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4"
                >
                  property360.africa/billing
                </Link>
                .
              </p>
              <dl className="mt-4 grid grid-cols-1 gap-3 text-[13px] sm:grid-cols-2">
                {email && (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                      Email
                    </dt>
                    <dd className="mt-1 break-all font-semibold text-foundation-700">
                      {email}
                    </dd>
                  </div>
                )}
                {phone && (
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                      Phone
                    </dt>
                    <dd className="mt-1 font-semibold text-foundation-700">
                      {phone}
                    </dd>
                  </div>
                )}
              </dl>
              <p className="mt-3 text-[12px] text-ink-muted">
                Forgot your password? Tap &quot;Forgot password&quot; on the
                sign-in screen.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        <AppStoreButtons />
      </div>

      <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          href="/"
          className="rounded-2xl border border-foundation-700/10 bg-surface px-5 py-4 transition hover:bg-foundation-700/5"
        >
          <p className="text-[13px] font-semibold text-foundation-700">
            Back to home
          </p>
          <p className="mt-1 text-[12.5px] text-ink-muted">
            Read more about Property360.
          </p>
        </Link>
        {role === "landlord" && (
          <Link
            href="/billing"
            className="rounded-2xl border border-foundation-700/10 bg-surface px-5 py-4 transition hover:bg-foundation-700/5"
          >
            <p className="text-[13px] font-semibold text-foundation-700">
              Manage your plan
            </p>
            <p className="mt-1 text-[12.5px] text-ink-muted">
              View your subscription and usage.
            </p>
          </Link>
        )}
        {role === "tenant" && (
          <Link
            href="/listings"
            className="rounded-2xl border border-foundation-700/10 bg-surface px-5 py-4 transition hover:bg-foundation-700/5"
          >
            <p className="text-[13px] font-semibold text-foundation-700">
              Browse listings
            </p>
            <p className="mt-1 text-[12.5px] text-ink-muted">
              Find a home while you wait for the app to install.
            </p>
          </Link>
        )}
      </div>
    </OnboardingShell>
  );
}
