"use client";

import { X, ShieldCheck } from "lucide-react";
import { PhoneVerifyStep } from "./PhoneVerifyStep";

interface Props {
  open: boolean;
  phone: string;
  onClose: () => void;
  onVerified: () => void;
}

/**
 * In-app phone verification dialog. Modal chrome around the shared
 * PhoneVerifyStep, which sends a WhatsApp-first OTP on mount (backend may fall
 * back to SMS), collects the 6-digit code, offers a channel switch, and shows a
 * live resend countdown. On success it flips phoneVerified (and whatsappVerified
 * when the code arrived on WhatsApp) via authApi.verifyPhone.
 */
export function PhoneVerifyModal({ open, phone, onClose, onVerified }: Props) {
  // Rendering the step only while open means it mounts fresh each time (fresh
  // OTP send, reset code + cooldown) without any manual reset bookkeeping.
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foundation-900/50 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-paper p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-cryola-300 text-foundation-700">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-[18px] font-extrabold tracking-tight text-foundation-700">
                Verify your phone
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-full text-ink-muted transition hover:bg-foundation-700/5 hover:text-foundation-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6">
          <PhoneVerifyStep phone={phone} onVerified={onVerified} />
        </div>
      </div>
    </div>
  );
}
