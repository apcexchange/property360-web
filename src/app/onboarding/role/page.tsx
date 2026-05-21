"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Home, Key, Briefcase } from "lucide-react";
import { OnboardingShell } from "@/components/marketing/OnboardingShell";
import { useOnboardingState } from "@/lib/onboarding-state";
import type { UserRole } from "@/lib/auth-api";

const ROLES: {
  id: UserRole;
  title: string;
  body: string;
  icon: typeof Home;
}[] = [
  {
    id: "landlord",
    title: "I'm a landlord",
    body: "I own one or more properties and want to manage tenants, leases, and rent collection.",
    icon: Home,
  },
  {
    id: "tenant",
    title: "I'm a tenant",
    body: "I'm renting a home (or about to). I want to pay rent, sign agreements, and chat with my landlord in one app.",
    icon: Key,
  },
  {
    id: "agent",
    title: "I'm a property manager",
    body: "I manage my own portfolio and/or accept invitations from landlords to manage theirs.",
    icon: Briefcase,
  },
];

export default function RolePage() {
  const router = useRouter();
  const { state, update, ready } = useOnboardingState();

  function pick(role: UserRole) {
    update({ role });
    router.push("/onboarding/account");
  }

  return (
    <OnboardingShell
      currentStep="role"
      includesPlan={ready && state.role !== "tenant"}
    >
      <p className="eyebrow">Get started</p>
      <h1 className="mt-2 font-display text-[clamp(1.75rem,4.5vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.02em]">
        Which one are you?
      </h1>
      <p className="mt-3 text-[15px] text-ink-muted">
        Your account is set up around your role. You can&apos;t switch later — but you
        can sign up again from a different email if you wear two hats.
      </p>

      <div className="mt-8 space-y-3">
        {ROLES.map((r) => {
          const Icon = r.icon;
          const active = state.role === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => pick(r.id)}
              className={`flex w-full items-start gap-4 rounded-2xl border p-5 text-left transition ${
                active
                  ? "border-foundation-700 bg-foundation-700/5"
                  : "border-foundation-700/10 bg-surface hover:border-foundation-700/30"
              }`}
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cryola-300 text-foundation-700">
                <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
              </span>
              <span>
                <span className="block text-[15.5px] font-semibold text-foundation-700">
                  {r.title}
                </span>
                <span className="mt-1 block text-[13.5px] leading-[1.55] text-ink-muted">
                  {r.body}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="mt-10 text-[13px] text-ink-muted">
        Already have an account?{" "}
        <Link
          href="/billing/login"
          className="font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4"
        >
          Sign in to manage your plan
        </Link>
        .
      </p>
    </OnboardingShell>
  );
}
