# Portfolio Site Design — Akam Peter Chinedu

**Date:** 2026-06-02
**Status:** Approved (pending spec review)
**Author:** Akam Peter Chinedu (with Claude)

## Goal

Ship a personal portfolio site whose single job is to help Akam Peter land a
**senior remote React Native / mobile engineering role** (international or local).
The audience is recruiters and hiring managers who skim in seconds, then click
through to verify claims. Success = a recruiter understands "senior mobile
engineer, fintech specialist, ships to both stores" within ~5 seconds, and has
working links to prove it.

## Positioning

Senior React Native Engineer, 7+ years, **fintech & payments specialist** who
builds secure, high-performance apps shipped to both the App Store and Google
Play across African markets.

## Stack & Hosting

- **Next.js 16 (App Router) + Tailwind 4 + TypeScript**
- Single-page scrolling site (anchor-based nav)
- **New standalone repo** — separate from Property360
- Deployed free to **Vercel** (`*.vercel.app` initially; custom domain wired later)
- **No backend.** Contact is `mailto:` + social links only
- Résumé delivered as a static PDF in `/public`, linked from hero and contact
- Light mode only (no dark-mode toggle in v1)

## Visual Style — "C1 Airy White"

Chosen from three explored directions (dark/technical, editorial/minimal,
product-led/bold). User picked product-led, then refined to a white base.

- **Base:** pure white, generous whitespace, soft shadows
- **Accent:** single brand green — `#0a6e4f` (deep) and `#1dd88f` (bright).
  Green used only on buttons, accents, small highlights, and the footer.
- **Dark footer:** deep green-black (`#0a1f17`) for the closing contact section
- **Type:** modern sans-serif; bold, confident headlines; App-Store-premium feel
- **Motion:** subtle scroll-in / fade-up animations; nothing heavy
- **Responsive:** mobile-first; must look excellent on a phone (it's a mobile
  engineer's portfolio — the irony of a broken mobile layout is fatal)

## Page Structure (top → bottom)

1. **Nav** — name wordmark + anchor links (Work / Experience / About / Contact).
   Sticky on scroll. Collapses to a simple menu on mobile.
2. **Hero**
   - Availability badge: "Available for remote roles"
   - Headline: "Shipped 15+ apps to App Store & Google Play."
   - Subline: "Senior React Native Engineer · fintech & payments · 7+ yrs · iOS & Android"
   - CTAs: **See the apps** (scrolls to Work) + **Download résumé** (PDF)
   - Visual: phone mockup
3. **Stats strip** — 7+ years · 15+ apps · both stores · Fintech domain
4. **Featured work** (centerpiece)
   - Responsive grid of app cards. Each card: app icon/color, name, one-line
     description, tech tags, and store badges (**App Store** and/or **Google
     Play**) linking to the live listing.
   - Confirmed apps (both App Store + Google Play links provided):
     - **V by VFD**
       - iOS: https://apps.apple.com/ng/app/v-by-vfd/id1462870303
       - Android: https://play.google.com/store/apps/details?id=com.vfd.app
     - **Switch by Sterling**
       - iOS: https://apps.apple.com/ng/app/switch-by-sterling/id1494153941
       - Android: https://play.google.com/store/apps/details?id=ng.sterling.sterlingswitch
     - **Finna Stablecoin Wallet**
       - iOS: https://apps.apple.com/ng/app/finna-stablecoin-wallet/id6483920894
       - Android: https://play.google.com/store/apps/details?id=com.finna.protocol
     - **Wowzi for Creators**
       - iOS: https://apps.apple.com/ng/app/wowzi-for-creators/id1635743764
       - Android: https://play.google.com/store/apps/details?id=co.threewin.wowzi.app
     - **AbbeyMobile**
       - iOS: https://apps.apple.com/ng/app/abbeymobile/id1604213434
       - Android: https://play.google.com/store/apps/details?id=com.abbey.app
     - **Property360** — in-progress (own project; link to repo/landing or mark "coming soon")
   - Grid closes with a "+ more" note (covers the rest of the 15+ that are not
     individually linked).
5. **About** — 2–3 line bio derived from CV professional summary, paired with
   the **headshot** (rounded, soft shadow, beside the text). A small avatar
   version also appears in the footer. Headshot file lives in `/public`.
6. **Skills** — grouped tag clusters:
   - Languages: React Native, TypeScript, JavaScript
   - State/Data: Redux Toolkit, Redux-Saga, React Query
   - Mobile/Architecture: offline-first, performance optimization, secure storage,
     biometric login, WebSocket
   - Payments/Fintech: Paystack, Flutterwave, mobile money, KYC/identity, OTP, JWT
   - Delivery: Fastlane, CI/CD, Firebase, Crashlytics
7. **Experience** — vertical timeline:
   - Wowzi — Senior Mobile Engineer (Dec 2023 – present)
   - Sterling Bank / Uridium Technologies — Senior Software Engineer (Feb 2021 – Nov 2023)
   - Rocket Global — Mobile Engineer, React Native (Feb 2019 – Oct 2021)
   - Plus Education (BSc Mathematics & Computer Science, Ebonyi State University)
     and Certifications (Scrum Fundamentals 2021, Google Africa Developer
     Scholarship 2021).
8. **Contact** — dark green footer:
   - "Let's build something." + "Open to senior remote mobile roles, worldwide."
   - **Email me** (mailto:peterchinedupeter@gmail.com)
   - **LinkedIn** — https://www.linkedin.com/in/akam-peter/
   - **GitHub** — https://github.com/apcexchange

## Data Model

Content is data-driven so the layout never has to change to add content:

- `lib/apps.ts` — array of `App { name, slug, description, tags[], icon/color,
  appStoreUrl?, playStoreUrl?, comingSoon? }`
- `lib/experience.ts` — array of `Role { company, title, location, start, end,
  bullets[] }`
- `lib/skills.ts` — grouped skill clusters
- `lib/profile.ts` — name, headline, subline, email, social links, résumé path

Components render from these arrays. Adding the remaining apps = appending to
`apps.ts`.

## Component Breakdown

Each section is a self-contained component under `components/`:
`Nav`, `Hero`, `StatsStrip`, `FeaturedWork` (+ `AppCard`, `StoreBadge`),
`About`, `Skills`, `Experience` (+ `TimelineItem`), `Contact`. Page composes
them in `app/page.tsx`. Reusable bits: `StoreBadge`, `Tag`, `SectionHeading`.

## Accuracy / Truthfulness Note

The "15+ apps" claim is the user's own assertion of their record. Because the
audience verifies, the featured grid links real, live listings wherever
possible; unlinked apps are absorbed by "+ more" rather than fabricated as
cards. No invented metrics, employers, or app names.

## Out of Scope (v1, YAGNI)

- Blog / CMS
- Dark mode toggle
- Contact-form backend (Resend/Formspree)
- Testimonials section
- Per-app case-study detail pages
- Custom domain wiring (done post-launch)
- Analytics (can add Vercel Analytics later in one line)

The data-driven structure leaves room to add any of these later without rework.

## Open Inputs Needed Before/During Build

- Play Store URLs per app (optional; cards work with App Store only)
- Final résumé PDF to drop into `/public`
- One-line description + accent color per app (can draft from CV, user confirms)
- Optional: a headshot (design works without one)
