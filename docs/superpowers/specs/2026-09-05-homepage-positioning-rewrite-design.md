# Homepage positioning rewrite — design

**Date:** 2026-09-05
**Status:** Approved, awaiting spec review
**Scope:** Web marketing homepage only (`web/src/app/page.tsx`)
**Out of scope:** Backend, mobile app, `/landlord`, `/tenant`, `/for-agencies`, analytics event names

## Goal

Replace the generic "all-in-one app for Nigerian landlords, tenants, and agents" framing on `/` with one positioning line, and make the landlord the default path instead of one of three equal roles. Tenant and agent discoverability is preserved through the nav and a single secondary CTA, not through a dedicated section on the homepage.

## Positioning statement (verbatim, the spine of the page)

> **Property360 is the only Nigerian rent platform that gives you proof, not just payment — an audit trail, a P&L, and a signed agreement for every naira that moves through your properties.**

This statement is used, in this order:

1. As the hero subtitle (under the display headline).
2. As the page `<title>` description suffix and the OG description.
3. As the FinalCta's headline inspiration (compressed to two lines).

## Section order (new)

```
FoundingBar → Nav → Hero → Stats (re-themed as proof strip) →
PainPoints → HowItWorks → Features (reframed) → Founding50 →
TrustStrip → Faq → Newsletter → FinalCta (rewritten) → Footer
```

`RoleSplit` and `Marketplace` are removed from the homepage only. Both component files stay in `web/src/components/landing/` and remain available for other pages.

## Per-section edits

### Hero (existing `web/src/components/landing/Hero.tsx`)

- **Eyebrow:** `Built for Nigerian landlords`
- **Headline:** `Proof, not just payment.`
- **Subline:** the full positioning statement above
- **Primary CTA:** `Create free account →` → `/onboarding`
- **Secondary CTA:** `I'm a tenant or agent →` → `/tenant` (small, lower-emphasis text link)

The Hero component is edited to accept these as props so the homepage can supply them. Other pages that use Hero (none currently do — verify during plan) keep the existing copy as a default fallback if props are not provided.

### Stats-as-proof-strip (existing `web/src/components/landing/Stats.tsx`)

Repositioned to render directly under the Hero. The 4 stat items are replaced with the four pillars:

| Value | Suffix | Label |
|---|---|---|
| 100 | % | **Proof** — every payment has a receipt, every invoice has an audit trail |
| 1 | | **Signed agreement** — uploaded, signed, stored against each lease |
| 1 | | **P&L** — pick a date range, export it for your accountant |
| 4 naira | | **Audited** — every naira in, every naira out, attributed to the right unit |

The component's `data` array is converted from a module-level constant to a `data` prop with the same shape: `Array<{ value: number | string; suffix?: string; label: string; static?: boolean }>`. The default array (used by any caller that doesn't pass one) keeps the current "by the numbers" copy so other pages are unaffected.

### PainPoints (no change)

Keeps the existing empathetic dark anchor. "That all ends the day you install Property360" stays as the closer.

### HowItWorks (no change)

Already landlord-first. Step 3 ("Set the lease, set the rent schedule") covers the agreement pillar implicitly.

### Features (existing `web/src/components/landing/Features.tsx`)

Reword 4 of the 9 cards so each one explicitly leads with one of the four pillars. The other 5 stay verbatim.

| Current title | New title | Anchor |
|---|---|---|
| Auto-invoicing | Proof, not just receipts | proof / audit trail |
| Tenancy agreements, in-app | (kept) | signed agreement |
| Reports landlords actually use | P&L, balance sheet, cash flow, ready for your accountant | P&L |
| KYC for every account | An audit trail for every naira | audit trail |
| Wallet & instant payouts | (kept) | — |
| In-app chat | (kept) | — |
| Maintenance with photos | (kept) | — |
| Multi-property, multi-agent | (kept) | — |
| Smart notifications | (kept) | — |

The component file is not edited; only the `features` array literals inside it change. The icon set stays the same (Receipt, FileSignature, ChartBar, ShieldCheck remain a 1:1 mapping to the four pillars).

### Founding50 (no change)

Founding 50 promo is a separate campaign, not part of the positioning line. Untouched.

### TrustStrip (no change)

Marquee of capabilities. Untouched.

### Faq (no change)

Untouched.

### Newsletter (no change)

Untouched.

### FinalCta (existing `web/src/components/landing/FinalCta.tsx`)

Headline rewritten to mirror the positioning line, kept in the same two-line draw-underline style:

> **Your next rent payment should be the last one you chase. The next one, the easiest.**

Subtitle: `Property360 turns the cycle into proof you can hand to your accountant. Free for your first property. No card.`

Primary and secondary CTAs, app-store links, and the magnetic hover effect stay.

### Footer (no change)

Untouched.

## File-level changes

| File | Change |
|---|---|
| `web/src/app/page.tsx` | Import list updated (drop `RoleSplit`, `Marketplace`; add `Stats`). Section order updated. New copy passed to `<Hero>`. `<Stats data={PROOF_PILLARS} />` rendered directly under `<Hero />`. Metadata `description`, `openGraph.title`, `openGraph.description` rewritten around the positioning line. |
| `web/src/components/landing/Hero.tsx` | Convert from hardcoded copy to a props-driven component with `eyebrow`, `headline`, `subline`, `primaryCta`, `secondaryCta` props. Provide the current copy as defaults so no other callers break. |
| `web/src/components/landing/Stats.tsx` | Convert `stats` constant from module-level to a `data` prop. Provide the current copy as the default so other callers are unaffected. |
| `web/src/components/landing/Features.tsx` | Rewrite 4 of the 9 entries in the `features` array. Body text of those 4 may also be re-tuned to land the pillar word ("proof", "audit trail", "P&L", "signed agreement") within the first 12 words. |

**No new files. No file deletions.**

## Metadata changes (SEO)

- `<title>`: `Property management with proof, not just payment, for Nigerian landlords`
- `description`: `Property360 is the only Nigerian rent platform that gives you proof, not just payment: an audit trail, a P&L, and a signed agreement for every naira that moves through your properties.`
- OG title: `Property360, proof, not just payment, for Nigerian landlords`
- OG description: `The only Nigerian rent platform that gives you proof, not just payment, audit trail, P&L, and signed agreement for every naira.`

`alternates.canonical` and OG `url` stay at `/` and `https://property360.africa/`.

## Risks and mitigations

1. **Marketplace removal may dent organic inbound.** Listings SEO lives at `/listings` (separate route), so impact should be limited. The `Marketplace` component file is retained for re-use on other pages if needed.
2. **"I'm a tenant or agent" secondary CTA** introduces a small tension with the landlord-first brief. It is justified because `RoleSplit` was the only path for non-landlords on the homepage. If the user prefers to drop it, the tenant/agent discoverability still exists through the Nav.
3. **The new Hero subtitle is long (~300 chars).** Visual mitigation: cap at `max-w-2xl` with `text-[clamp(1rem,1.6vw,1.2rem)]` so it reads as one paragraph on desktop, and accept a 3-4 line wrap on mobile.
4. **Stats repurposing changes meaning of numerals.** The "100%" and "1" values are decorative — they reinforce the pillar label rather than report real metrics. The existing component already mixes aspirational numbers ("0 spreadsheets required") so this stays in the same spirit.

## Out of scope

- Backend changes
- Mobile app changes
- `/landlord`, `/tenant`, `/for-agencies` page changes
- Analytics event renaming
- New components
- File deletions
- Navigation structure beyond the single secondary CTA

## Acceptance criteria

- [ ] Hero shows the positioning statement verbatim, with the eyebrow `Built for Nigerian landlords` and the headline `Proof, not just payment.`
- [ ] Stats-as-proof-strip renders 4 pillars directly under the Hero, replacing the existing "by the numbers" copy.
- [ ] `RoleSplit` and `Marketplace` components are no longer imported or rendered in `web/src/app/page.tsx`.
- [ ] Four Features cards are reworded to lead with one of the four pillars (proof, audit trail, P&L, signed agreement).
- [ ] FinalCta headline and subtitle rewritten to mirror the positioning line.
- [ ] Page metadata (title, description, OG) all reflect the new positioning.
- [ ] No new component files. `Hero` and `Stats` accept props with sensible defaults; other pages that use them are unaffected.
- [ ] Build (`npm run build` in `web/`) succeeds with no type or lint errors.
- [ ] `web dev` renders correctly at `/` with the new section order and copy.
