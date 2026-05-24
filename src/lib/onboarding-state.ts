"use client";

import { useEffect, useState, useCallback } from "react";
import { UserRole } from "./auth-api";

/**
 * Wizard scratch state. Lives in sessionStorage so it survives page navigation
 * and refresh within the tab, but doesn't leak across browser sessions or to
 * other tabs. The access token, once registration succeeds, lives in the
 * regular `session` module (localStorage) — not here.
 */
export interface OnboardingState {
  role?: UserRole;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  // Whether we've registered (created the user). Token is in session module.
  registered?: boolean;
  // Whether phone OTP was verified during onboarding.
  phoneVerified?: boolean;
  // Referral code stashed from the initial /onboarding?ref=… URL hit, then
  // forwarded to /auth/register. Backend silently drops invalid codes.
  referralCode?: string;
}

const KEY = "p360_onboarding";

function read(): OnboardingState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as OnboardingState) : {};
  } catch {
    return {};
  }
}

function write(state: OnboardingState): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(KEY, JSON.stringify(state));
}

export function clearOnboardingState(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(KEY);
}

export function useOnboardingState(): {
  state: OnboardingState;
  update: (patch: Partial<OnboardingState>) => void;
  reset: () => void;
  ready: boolean;
} {
  // Hydrate from sessionStorage on mount only — server render uses {} so
  // the hook is SSR-safe even though pages are "use client".
  const [state, setState] = useState<OnboardingState>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(read());
    setReady(true);
  }, []);

  const update = useCallback((patch: Partial<OnboardingState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      write(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    clearOnboardingState();
    setState({});
  }, []);

  return { state, update, reset, ready };
}
