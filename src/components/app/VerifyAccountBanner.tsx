"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { session } from "@/lib/session";
import { getOverallVerification } from "@/lib/verification-status";
import { VerifyAccountModal } from "./VerifyAccountModal";

const DISMISS_KEY = "p360_verify_account_dismissed";

/**
 * Prominent "Verify your account" banner (mirrors the old phone-verify banner's
 * styling / placement). Shown to landlords and agents whenever the overall
 * verification status is not yet Verified. Clicking it opens the unified stepped
 * flow, which resumes at the first incomplete step. Copy adapts to the current
 * state (unverified / phone verified / pending review / action needed).
 */
export function VerifyAccountBanner() {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  // Bumped after the flow changes a signal so the banner re-reads the session.
  const [, setTick] = useState(0);

  useEffect(() => {
    // Hydration guard: session + sessionStorage only exist on the client, so we
    // defer the first render until after mount to avoid an SSR mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    try {
      setDismissed(window.sessionStorage.getItem(DISMISS_KEY) === "1");
    } catch {}
  }, []);

  if (!mounted) return null;

  const user = session.getUser();
  // Tenants are added by landlords and are not prompted to verify here.
  if (!user || user.role === "tenant") return null;
  if (!user.phone) return null;

  const overall = getOverallVerification(user);
  if (!overall.showBanner) return null;

  const copy = BANNER_COPY[overall.key];

  function dismiss() {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  const tint =
    overall.key === "action_needed"
      ? "border-red-200 bg-red-50"
      : "border-foundation-700/10 bg-cryola-50/60";

  return (
    <>
      {!dismissed && (
        <div className={`border-b px-4 py-2.5 sm:px-6 ${tint}`}>
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cryola-300 text-foundation-700">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div className="min-w-0 text-[12.5px] leading-snug">
                <p className="font-semibold text-foundation-700">
                  {copy.title}
                </p>
                <p className="truncate text-ink-muted">{copy.body}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="rounded-full bg-foundation-700 px-3.5 py-1.5 text-[12px] font-semibold text-paper transition hover:bg-foundation-800"
              >
                {copy.cta}
              </button>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Dismiss"
                className="grid h-7 w-7 place-items-center rounded-full text-ink-muted transition hover:bg-foundation-700/5 hover:text-foundation-700"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {modalOpen && (
        <VerifyAccountModal
          onClose={() => setModalOpen(false)}
          onChange={() => setTick((t) => t + 1)}
        />
      )}
    </>
  );
}

const BANNER_COPY: Record<
  string,
  { title: string; body: string; cta: string }
> = {
  unverified: {
    title: "Verify your account",
    body: "Confirm your phone and identity to build trust and unlock some payouts.",
    cta: "Verify",
  },
  phone_verified: {
    title: "Finish verifying your account",
    body: "Your phone is confirmed. Add your identity details to complete verification.",
    cta: "Continue",
  },
  pending: {
    title: "Verification under review",
    body: "We are reviewing your identity details. This usually takes a short while.",
    cta: "View status",
  },
  action_needed: {
    title: "Action needed on your verification",
    body: "Your details need another look. Reopen the flow to resubmit.",
    cta: "Fix now",
  },
};
