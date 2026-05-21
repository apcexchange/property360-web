"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { OnboardingShell } from "@/components/marketing/OnboardingShell";
import { AppStoreButtons } from "@/components/marketing/AppStoreButtons";
import { useOnboardingState } from "@/lib/onboarding-state";

export default function DonePage() {
  const { state, reset, ready } = useOnboardingState();

  // Clear the wizard scratch state on landing — the auth token is held in the
  // shared session module, not here, so this only drops names/phone/etc.
  useEffect(() => {
    if (ready) reset();
    // We intentionally only run this once; not depending on `reset` to avoid
    // re-clearing on re-render after the state empties.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const firstName = state.firstName ?? "there";
  const role = state.role ?? "user";

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
