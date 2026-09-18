"use client";

import { useState } from "react";
import { X, ShieldCheck, Check, Clock } from "lucide-react";
import { session } from "@/lib/session";
import { PhoneVerifyStep } from "./PhoneVerifyStep";
import { KycDetailsStep } from "./KycDetailsStep";

type Step = "phone" | "details" | "pending";

interface Props {
  onClose: () => void;
  /** Fired after any signal changes (phone verified, details submitted) so the
   *  banner / badge can re-read the session and update. */
  onChange?: () => void;
}

/**
 * Resolves the first incomplete step from the live signals, so the flow never
 * re-asks for what is already done and resumes correctly across sessions:
 * - kyc pending  -> the pending-review state (nothing to do)
 * - kyc rejected -> details (resubmit, with the reason shown)
 * - phone not verified -> phone
 * - otherwise -> details
 */
function firstIncompleteStep(): Step {
  const user = session.getUser();
  const kyc = user?.kyc?.status ?? "not_started";
  if (kyc === "pending") return "pending";
  if (kyc === "rejected") return "details";
  if (!user?.phoneVerified) return "phone";
  return "details";
}

/** Marks kyc.status = pending on the local session after a successful submit so
 *  the banner and badge reflect it without waiting for a re-login. */
function markKycPending() {
  const token = session.getToken();
  const user = session.getUser();
  if (!token || !user) return;
  session.set(token, {
    ...user,
    kyc: { ...(user.kyc ?? {}), status: "pending" },
  });
}

/**
 * The unified "Verify your account" flow. One prominent modal with two steps
 * (phone, then details) plus a terminal pending-review state. Mounted only while
 * open (by the banner), so it initializes at the first incomplete step from the
 * live signals and advances automatically once phone is verified.
 */
export function VerifyAccountModal({ onClose, onChange }: Props) {
  const [step, setStep] = useState<Step>(() => firstIncompleteStep());

  const user = session.getUser();
  const phone = user?.phone ?? "";
  const phoneDone = !!user?.phoneVerified;
  const rejectionReason =
    user?.kyc?.status === "rejected" ? user?.kyc?.rejectionReason : undefined;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foundation-900/50 px-4 py-6 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-paper p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-cryola-300 text-foundation-700">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-display text-[18px] font-extrabold tracking-tight text-foundation-700">
                Verify your account
              </h2>
              <p className="mt-0.5 text-[12.5px] text-ink-muted">
                {step === "pending"
                  ? "Your details are being reviewed."
                  : "Confirm your phone and identity."}
              </p>
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

        {step !== "pending" && (
          <Stepper current={step} phoneDone={phoneDone} />
        )}

        <div className="mt-5">
          {step === "phone" && (
            <PhoneVerifyStep
              phone={phone}
              onVerified={() => {
                // phoneVerified is now true on the session; advance to details.
                setStep("details");
                onChange?.();
              }}
            />
          )}
          {step === "details" && (
            <KycDetailsStep
              rejectionReason={rejectionReason}
              onSubmitted={() => {
                markKycPending();
                setStep("pending");
                onChange?.();
              }}
            />
          )}
          {step === "pending" && <PendingState onDone={onClose} />}
        </div>
      </div>
    </div>
  );
}

function Stepper({
  current,
  phoneDone,
}: {
  current: Step;
  phoneDone: boolean;
}) {
  const steps: { key: Step; label: string; done: boolean }[] = [
    { key: "phone", label: "Phone", done: phoneDone },
    { key: "details", label: "Details", done: false },
  ];
  return (
    <div className="mt-5 flex items-center gap-2">
      {steps.map((s, i) => {
        const active = current === s.key;
        return (
          <div key={s.key} className="flex flex-1 items-center gap-2">
            <span
              className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                s.done
                  ? "bg-emerald-100 text-emerald-700"
                  : active
                    ? "bg-foundation-700 text-paper"
                    : "bg-foundation-700/10 text-ink-muted"
              }`}
            >
              {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span
              className={`text-[12px] font-semibold ${
                active || s.done ? "text-foundation-700" : "text-ink-muted"
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <span className="h-px flex-1 bg-foundation-700/10" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function PendingState({ onDone }: { onDone: () => void }) {
  return (
    <div className="text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-amber-100 text-amber-700">
        <Clock className="h-6 w-6" />
      </span>
      <p className="mt-3 font-display text-[16px] font-bold text-foundation-700">
        Submitted for review
      </p>
      <p className="mx-auto mt-1 max-w-xs text-[12.5px] text-ink-muted">
        Thanks. Our team is reviewing your details. We will let you know once
        your account is verified. This usually takes a short while.
      </p>
      <button
        type="button"
        onClick={onDone}
        className="mt-5 inline-flex items-center rounded-full bg-foundation-700 px-5 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800"
      >
        Done
      </button>
    </div>
  );
}
