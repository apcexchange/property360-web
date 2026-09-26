"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Home, Key, Building2 } from "lucide-react";
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
    title: "I own property",
    body: "I own homes, land, shops, or other spaces and want to list them free, manage tenants, and collect rent.",
    icon: Home,
  },
  {
    id: "tenant",
    title: "I'm looking for a place",
    body: "I want to find a home, shortlet, shop, land, or hotel room, then manage my tenancy in one app.",
    icon: Key,
  },
  {
    id: "agent",
    title: "I'm an agent, agency, or hotel host",
    body: "I list and manage properties or rooms for myself or clients, including hotels and guesthouses.",
    icon: Building2,
  },
];

export default function RolePage() {
  const router = useRouter();
  const { state, update, ready } = useOnboardingState();

  useEffect(() => {
    if (!ready) return;
    const ref = new URLSearchParams(window.location.search)
      .get("ref")
      ?.trim()
      .toUpperCase();
    if (ref && ref !== state.referralCode) {
      update({ referralCode: ref });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  function pick(role: UserRole) {
    update({ role });
    router.push("/onboarding/account");
  }

  return (
    <OnboardingShell
      currentStep="role"
      includesPlan={ready && state.role !== "tenant"}
    >
      <p className="eyebrow">Account setup · 01</p>
      <h1 className="mt-2 font-display text-[clamp(1.75rem,4.5vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.02em]">
        Start with how you work.
      </h1>
      <p className="mt-3 max-w-[58ch] text-[15px] leading-relaxed text-ink-muted">
        Choose the role that best reflects what you&apos;ll do first. Landlords, agents,
        agencies, and hotel hosts can publish standard listings free of charge.
      </p>

      <div className="mt-10 border-t border-foundation-700/15">
        {ROLES.map((r, index) => {
          const Icon = r.icon;
          const active = state.role === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => pick(r.id)}
              className={`group grid w-full grid-cols-[2.5rem_2.75rem_1fr_auto] items-start gap-3 border-b border-foundation-700/15 py-5 text-left transition sm:grid-cols-[3rem_3rem_1fr_auto] sm:gap-5 ${
                active
                  ? "bg-cryola-100/45"
                  : "hover:bg-foundation-700/[0.035]"
              }`}
            >
              <span className="pt-1 font-mono text-[11px] font-semibold tracking-[0.12em] text-ink-faint">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={`grid h-9 w-9 place-items-center rounded-full border transition ${active ? "border-foundation-700 bg-foundation-700 text-cryola-300" : "border-foundation-700/15 text-foundation-700 group-hover:border-foundation-700/40"}`}>
                <Icon className="h-4 w-4" strokeWidth={2} />
              </span>
              <span className="pt-0.5">
                <span className="block text-[15.5px] font-semibold tracking-[-0.01em] text-foundation-700">
                  {r.title}
                </span>
                <span className="mt-1.5 block max-w-[48ch] text-[13.5px] leading-[1.55] text-ink-muted">
                  {r.body}
                </span>
              </span>
              <span className={`mt-1.5 hidden text-[12px] font-semibold sm:block ${active ? "text-foundation-700" : "text-ink-faint group-hover:text-foundation-700"}`}>{active ? "Selected" : "Choose →"}</span>
            </button>
          );
        })}
      </div>

      <p className="mt-10 text-[13px] text-ink-muted">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4"
        >
          Sign in
        </Link>
        .
      </p>
    </OnboardingShell>
  );
}
