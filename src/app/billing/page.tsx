"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { billingApi } from "@/lib/billing-api";

/**
 * Thin redirect that preserves the old `/billing?handoff=…` URL the mobile
 * app sends users to ("Manage plan on the web"). We:
 *   1. Redeem the single-use handoff token here, before AppAuthGate sees
 *      the URL, if we tried this inside /app/* it would bounce to /login
 *      first because the gate has no concept of token redemption.
 *   2. Forward to /app/billing (the real billing UI, now inside the app
 *      shell). If redemption fails, AppAuthGate handles the bounce.
 *
 * Carries through `?tier=` and `?interval=` query params so marketing
 * /pricing CTAs that deep-link here for logged-in users keep prefilling
 * the right tier card.
 */
function LegacyBillingRedirectInner() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const handoff = params?.get("handoff");
    const tier = params?.get("tier");
    const interval = params?.get("interval");

    async function go() {
      if (handoff) {
        try {
          await billingApi.redeemHandoff(handoff);
        } catch {
          // Token expired / already used. Fall through, the
          // AppAuthGate at /app/billing will bounce to /login.
        }
      }
      const qs = new URLSearchParams();
      if (tier) qs.set("tier", tier);
      if (interval) qs.set("interval", interval);
      const next = qs.size ? `/app/billing?${qs}` : "/app/billing";
      router.replace(next);
    }

    void go();
  }, [params, router]);

  return (
    <div className="grid min-h-screen place-items-center text-sm text-foundation-500">
      Loading billing…
    </div>
  );
}

export default function LegacyBillingRedirect() {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center text-sm text-foundation-500">
          Loading billing…
        </div>
      }
    >
      <LegacyBillingRedirectInner />
    </Suspense>
  );
}
