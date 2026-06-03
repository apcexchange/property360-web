"use client";

import { useEffect, useState } from "react";
import { Phone, X } from "lucide-react";
import { session } from "@/lib/session";
import { PhoneVerifyModal } from "./PhoneVerifyModal";

const DISMISS_KEY = "p360_phone_verify_dismissed";

/**
 * Dismissible "verify your phone number" banner. Mounts at the top of every
 * /app/* page. Hidden when the user is already phoneVerified or has clicked
 * the X this session (banner reappears next browser session, until they
 * actually verify).
 */
export function PhoneVerifyBanner() {
  // Hydrate from session storage so SSR + client agree on first render.
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  // Re-read the user when the modal completes so the banner disappears.
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setMounted(true);
    try {
      setDismissed(
        window.sessionStorage.getItem(DISMISS_KEY) === "1"
      );
    } catch {}
  }, []);

  if (!mounted) return null;

  const user = session.getUser();
  // Tenants don't need a phone verify prompt — they're added by landlords
  // and the phone field isn't load-bearing for tenant-side features yet.
  if (!user || user.role === "tenant") return null;
  if (user.phoneVerified) return null;
  if (dismissed) return null;
  if (!user.phone) return null;

  function dismiss() {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  return (
    <>
      <div className="border-b border-foundation-700/10 bg-cryola-50/60 px-4 py-2.5 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cryola-300 text-foundation-700">
              <Phone className="h-4 w-4" />
            </span>
            <div className="min-w-0 text-[12.5px] leading-snug">
              <p className="font-semibold text-foundation-700">
                Verify your phone number
              </p>
              <p className="truncate text-ink-muted">
                Adds an extra layer of account security and lets us reach you
                if something needs attention.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-full bg-foundation-700 px-3.5 py-1.5 text-[12px] font-semibold text-paper transition hover:bg-foundation-800"
            >
              Verify
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

      <PhoneVerifyModal
        open={modalOpen}
        phone={user.phone}
        onClose={() => setModalOpen(false)}
        onVerified={() => {
          setModalOpen(false);
          // session.set inside authApi.verifyPhone has already mutated
          // localStorage; force a re-read by re-rendering.
          setTick((t) => t + 1);
        }}
      />
      {/* tick is referenced to silence the lint warning about it being set
          but never read; the re-render itself is the side effect we want. */}
      <span hidden>{tick}</span>
    </>
  );
}
