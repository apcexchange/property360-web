// "The Founding 50" launch offer, single source of truth.
//
// This is a launch-only construct, NOT a standing pricing tier (those live in
// pricingTiers.ts). Keep the headline numbers here so the announcement bar,
// the landing section, and the pricing section never drift apart.
//
// `normalAnnualNgn` mirrors the Pro tier's annual price in pricingTiers.ts, // keep them in sync if Pro pricing changes.

export const FOUNDING = {
  /** Tier the founding price applies to. */
  tier: "Pro",
  /** Total founding slots. The scarcity lever, keep it honest. */
  slots: 50,
  /**
   * Slots claimed so far. Bump this manually as founding landlords sign up
   * (or wire it to a real count later). When 0, the UI shows "50 slots" with
   * no "claimed" framing so we never display a fabricated number.
   */
  claimed: 0,
  /** Founding price, locked for these landlords forever. */
  foundingAnnualNgn: 65000,
  /** Normal Pro annual price (mirror of pricingTiers.ts Pro.annualNgn). */
  normalAnnualNgn: 81600,
  /** Where the CTA sends people. */
  ctaHref: "/onboarding",
  /**
   * The owned launch community: a broadcast-only WhatsApp Channel
   * ("Property360, Founding Landlords"). Fill in once created
   * (format: https://whatsapp.com/channel/<id>). Empty = not created yet;
   * content should leave a "[WhatsApp channel link]" placeholder, not guess.
   */
  whatsappChannelUrl: "https://whatsapp.com/channel/0029VbCuWPVGZNCpzfWMan1G",
  perks: [
    "Pro plan at ₦65,000/year, locked at that price forever",
    "Free done-for-you setup: we load your properties, units & tenants",
    "A “Founding Landlord” badge on your account",
    "A direct line to the founder for your first 60 days",
  ],
} as const;

/** Naira amount → "₦65,000". */
export function naira(n: number): string {
  return `₦${n.toLocaleString("en-NG")}`;
}

/** Whole-naira yearly saving vs. the normal Pro annual price. */
export const foundingSaving = FOUNDING.normalAnnualNgn - FOUNDING.foundingAnnualNgn;

/** Remaining founding slots, never negative. */
export const foundingRemaining = Math.max(FOUNDING.slots - FOUNDING.claimed, 0);
