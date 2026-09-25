import type { SalesJourneyStatus, SalesTrack } from "@/lib/admin";

/** Human labels for the backend's schedule keys (backend: src/utils/salesFollowUp/schedule.ts). */
export const TRACK_LABELS: Record<SalesTrack, string> = {
  trial: "Trial",
  post_trial: "After trial",
  cancelled: "Cancelled",
  past_due: "Payment failed",
};

const STEP_LABELS: Record<string, string> = {
  trial_d0_welcome: "Day 0: welcome",
  trial_d1_setup: "Day 1: setup nudge",
  trial_d3_value: "Day 3: value email",
  trial_d4_ending: "Trial ending (day 4)",
  trial_d7_ended: "Day 7: trial ended",
  post_trial_d3: "Day 10: win-back email",
  post_trial_d7: "Day 14: win-back WhatsApp",
  post_trial_d14: "Day 21: win-back email",
  post_trial_d23: "Day 30: win-back WhatsApp",
  post_trial_m1: "Month 2 email",
  post_trial_m2: "Month 3 email",
  post_trial_m3: "Month 4 email",
  post_trial_m4: "Month 5 email",
  post_trial_m5: "Month 6 email",
  post_trial_m6: "Month 7 email",
  past_due_d0: "Day 0: payment failed",
  past_due_d3: "Day 3: payment reminder",
  cancelled_d7: "Day 7: win-back",
  cancelled_d30: "Day 30: win-back",
};

export function stepLabel(key: string): string {
  return STEP_LABELS[key] ?? key.replace(/_/g, " ");
}

export const STATUS_LABELS: Record<SalesJourneyStatus, string> = {
  active: "Active",
  paused_reply: "Paused (replied)",
  converted: "Subscribed",
  stopped: "Stopped",
  completed: "Completed",
};

export const STOP_REASON_LABELS: Record<string, string> = {
  subscribed: "Subscribed",
  opt_out: "Replied STOP",
  not_interested: "Not interested",
  undeliverable: "Undeliverable",
  admin: "Stopped by admin",
  deleted: "Account deleted",
};

export const SKIP_REASON_LABELS: Record<string, string> = {
  condition: "Condition not met",
  no_phone: "No phone",
  whatsapp_disabled: "WhatsApp disabled (failures)",
  whatsapp_opted_out: "WhatsApp updates off",
  whatsapp_cap: "WhatsApp cap reached",
  no_template: "Template not approved yet",
  email_not_configured: "Email not configured",
  email_unverified: "Email not verified",
  email_unsubscribed: "Unsubscribed from emails",
  no_marketing_consent: "No marketing consent",
  provider_error: "Provider error",
  delivery_failed: "Delivery failed",
  master_switch_off: "WhatsApp switched off",
  provider_not_configured: "WhatsApp not configured",
  no_template_id: "Template not configured",
};

export function pct(part: number, whole: number): string {
  if (!whole) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}
