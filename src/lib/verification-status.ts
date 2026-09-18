// Shared "overall verification" helper. phoneVerified and kyc.status stay as
// distinct backend signals (phone ownership is instant via OTP, identity is
// admin-reviewed and async). This derives the single, client-side overall
// status the UI presents as one journey, per the unified verify-account design.
//
// The payout gate is unchanged: it keys off kyc.status === "verified" only.

import { AdminUser } from "./session";

export type OverallVerificationKey =
  | "unverified"
  | "phone_verified"
  | "pending"
  | "verified"
  | "action_needed";

export type VerificationTone = "neutral" | "good" | "warn" | "bad" | "info";

export interface OverallVerification {
  key: OverallVerificationKey;
  /** Short label for the status badge next to the user's name. */
  label: string;
  /** Matches the StatusPill tone palette. */
  tone: VerificationTone;
  /** True only when kyc.status === "verified" (the payout gate). */
  isVerified: boolean;
  /** The verify-account banner shows for every state except Verified. */
  showBanner: boolean;
}

type UserLike =
  | (Pick<AdminUser, "phoneVerified"> & {
      kyc?: { status?: string | null } | null;
    })
  | null
  | undefined;

/**
 * Derives the overall verification status from the two live signals
 * (phoneVerified + kyc.status). The kyc lifecycle states (pending, verified,
 * rejected) dominate the phone signal, matching the design's status table.
 */
export function getOverallVerification(user: UserLike): OverallVerification {
  const kyc = user?.kyc?.status ?? "not_started";
  const phoneVerified = !!user?.phoneVerified;

  if (kyc === "verified") {
    return {
      key: "verified",
      label: "Verified",
      tone: "good",
      isVerified: true,
      showBanner: false,
    };
  }
  if (kyc === "rejected") {
    return {
      key: "action_needed",
      label: "Action needed",
      tone: "bad",
      isVerified: false,
      showBanner: true,
    };
  }
  if (kyc === "pending") {
    // Submitted and awaiting admin review: nothing for the user to do, so no
    // prompting banner. The "Pending review" status still shows on the profile.
    return {
      key: "pending",
      label: "Pending review",
      tone: "warn",
      isVerified: false,
      showBanner: false,
    };
  }
  // kyc not started (or an unknown value): phone verification is the only
  // signal that can be complete yet.
  if (phoneVerified) {
    return {
      key: "phone_verified",
      label: "Phone verified",
      tone: "info",
      isVerified: false,
      showBanner: true,
    };
  }
  return {
    key: "unverified",
    label: "Unverified",
    tone: "neutral",
    isVerified: false,
    showBanner: true,
  };
}
