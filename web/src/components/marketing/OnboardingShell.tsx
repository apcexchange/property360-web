"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { Check } from "lucide-react";

export type OnboardingStep = "role" | "account" | "verify" | "plan" | "done";

interface StepDef {
  id: OnboardingStep;
  label: string;
}

const ALL_STEPS: StepDef[] = [
  { id: "role", label: "Role" },
  { id: "account", label: "Account" },
  { id: "verify", label: "Verify" },
  { id: "plan", label: "Plan" },
  { id: "done", label: "Done" },
];

export function OnboardingShell({
  currentStep,
  includesPlan = true,
  children,
}: {
  currentStep: OnboardingStep;
  /** Tenants/agents skip the plan step — pass false to hide it from the rail. */
  includesPlan?: boolean;
  children: ReactNode;
}) {
  const steps = includesPlan
    ? ALL_STEPS
    : ALL_STEPS.filter((s) => s.id !== "plan");
  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <header className="sticky top-0 z-30 border-b border-foundation-700/10 bg-paper/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-foundation-700 text-cryola-300">
              <span className="text-[12px] font-bold leading-none">P</span>
            </span>
            <span className="text-[14.5px] text-foundation-700">
              Property<span className="text-cryola-500">360</span>
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-[12px] text-ink-muted sm:inline">
              Step {Math.max(0, currentIndex) + 1} of {steps.length}
            </span>
            <Link
              href="/login"
              className="rounded-full border border-foundation-700/20 px-3.5 py-1.5 text-[12px] font-semibold text-foundation-700 transition hover:border-foundation-700/40 hover:bg-foundation-700/5"
            >
              Sign in
            </Link>
          </div>
        </div>
        <ol className="mx-auto flex max-w-4xl items-center gap-2 overflow-x-auto px-6 pb-4 text-[11.5px]">
          {steps.map((s, i) => {
            const status =
              i < currentIndex ? "done" : i === currentIndex ? "current" : "pending";
            return (
              <li key={s.id} className="flex items-center gap-2">
                <span
                  className={`grid h-5 w-5 place-items-center rounded-full text-[10px] font-semibold ${
                    status === "done"
                      ? "bg-foundation-700 text-cryola-300"
                      : status === "current"
                      ? "bg-cryola-300 text-foundation-700"
                      : "bg-foundation-700/10 text-foundation-700/50"
                  }`}
                >
                  {status === "done" ? (
                    <Check className="h-3 w-3" strokeWidth={3} />
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={`whitespace-nowrap ${
                    status === "current"
                      ? "font-semibold text-foundation-700"
                      : status === "done"
                      ? "text-foundation-700"
                      : "text-foundation-700/50"
                  }`}
                >
                  {s.label}
                </span>
                {i < steps.length - 1 && (
                  <span className="mx-1 h-px w-6 bg-foundation-700/15" />
                )}
              </li>
            );
          })}
        </ol>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">{children}</main>
    </div>
  );
}
