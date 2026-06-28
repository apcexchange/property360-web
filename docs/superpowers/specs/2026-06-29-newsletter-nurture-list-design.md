# Newsletter / Prospect-Nurture List — Design

**Date:** 2026-06-29
**Status:** Approved (pending spec review)
**Branch context:** `feat/founding-50` (web uses the `web/src/` layout on this branch)

## Goal

Property360 has no general mailing list today — only transactional email (OTP,
demo-request confirmation, founding-waitlist capture) via Resend, and two
deduped Mongo collections (`DemoRequest`, `FoundingWaitlist`) that are not wired
to any broadcast tooling.

Build **one prospect-nurture email list**: capture emails from several spots on
the marketing site, single opt-in, send a welcome email, and **funnel the
existing demo-request and founding-waitlist emails into the same list** so
everyone who raised a hand gets nurtured. Campaigns are sent manually from the
Resend dashboard (Broadcasts).

### Decisions (locked)

| Decision | Choice |
| --- | --- |
| Audience / purpose | Prospect nurture, single list |
| Send tooling | Resend Broadcasts / Audiences (already wired for transactional) |
| Opt-in | Single opt-in + welcome email |
| Capture placement | Footer, end-of-landing block, guides pages (Phase 1); exit-intent (Phase 2) |
| Consolidation | Demo-request + founding-waitlist emails also added to the nurture audience, tagged by source |
| Welcome copy | Simple on-brand, nothing special |

## Architecture

Mongo `Subscriber` collection is the **system of record** (owns `source`,
status, timestamps — for segmentation/analytics and future ESP portability).
The Resend Audience is just the **send target**. This mirrors how
`FoundingWaitlist` already keeps its own deduped collection.

```
Footer/landing/guides form ─┐
demo-request submit ────────┼─► Mongo Subscriber (source of record, deduped)
founding waitlist ──────────┘            │
                                         └─► Resend Audience (send target)
                                                   │
                                         Resend Broadcasts (manual campaign send)
```

### Honest constraint

Resend's Contacts API only stores `email` / `firstName` / `lastName` /
`unsubscribed` — no custom `source` field. So **segmentation lives in our Mongo
`Subscriber` collection**, and Broadcasts send to the whole audience. Acceptable
for a single nurture list now; keeps the door open to a real ESP (Brevo /
ConvertKit) later without losing source data.

## Backend

### `Subscriber` model (`backend/src/models/Subscriber.ts`)

Mirrors `FoundingWaitlist`.

| Field | Type | Notes |
| --- | --- | --- |
| `email` | String | required, unique, lowercase, trim |
| `name` | String? | default null |
| `source` | String | `newsletter-footer` \| `newsletter-landing` \| `newsletter-guides` \| `demo-request` \| `founding-sold-out` |
| `status` | String | `subscribed` \| `unsubscribed`, default `subscribed` |
| `resendContactId` | String? | id returned by Resend `contacts.create`, for later updates |
| timestamps | — | `createdAt` / `updatedAt` |

Dedup by lowercase email (unique index). Re-subscribe of an existing email must
not send a second welcome email.

### `NewsletterService` (`backend/src/services/NewsletterService.ts`)

Same Resend-client construction pattern as `DemoRequestService` (lazy
`new Resend(apiKey)` when key present, else `null`; all email best-effort with
`.catch` logging).

- `subscribe(email, name?, source)`
  1. Validate email (reuse the existing regex pattern).
  2. Upsert into Mongo. Detect whether this is a **new** subscriber (so we only
     welcome once).
  3. `addToAudience(...)` (mirror to Resend, store `resendContactId`).
  4. If new: send welcome email (best-effort).
  5. Return `{ status: 'subscribed' }`.
- `addToAudience(email, name?, source)` — the **shared helper**. Upserts the
  Mongo row (for the demo/founding paths) and calls
  `resend.contacts.create({ audienceId, email, firstName, unsubscribed: false })`.
  No welcome email here. Best-effort; never throws into the caller.
- `unsubscribe(email)` — flip Mongo `status` to `unsubscribed` and
  `resend.contacts.update({ audienceId, id|email, unsubscribed: true })`.

### Consolidation wiring

- `DemoRequestService.submit` — after `DemoRequest.create`, also call
  `NewsletterService.addToAudience(email, fullName, 'demo-request')`
  (best-effort, alongside the existing sales/confirmation emails).
- `FoundingService.joinWaitlist` — after the `FoundingWaitlist` upsert, call
  `NewsletterService.addToAudience(email, name, 'founding-sold-out')`.

> Dependency direction: `DemoRequestService` and `FoundingService` import
> `NewsletterService`, not the reverse — no cycle. `NewsletterService` imports
> only the `Subscriber` model and config.

### Config (`backend/src/config/index.ts`)

Add to the existing `resend` block:

```ts
resend: {
  apiKey: process.env.RESEND_API_KEY || '',
  fromEmail: process.env.RESEND_FROM_EMAIL || '',
  audienceId: process.env.RESEND_AUDIENCE_ID || '', // newsletter nurture audience
},
```

Document `RESEND_AUDIENCE_ID` in `.env.example` / `.env.prod.example`. When
empty, audience mirroring is skipped (Mongo capture still works) — same
fail-soft posture as `fromEmail`.

### Routes (`backend/src/routes/index.ts`)

Public (no auth), in the same neighborhood as `POST /demo-requests`:

- `POST /newsletter/subscribe` — body `{ email, name?, source? }` (source
  defaults to `newsletter-footer`). Capture IP/userAgent like demo-requests.
- `POST /newsletter/unsubscribe` — body `{ email }`.

Admin — add to the existing admin router (`backend/src/routes/admin.ts`), which
is already gated by `protect, authorize(UserRole.ADMIN)`:

- `GET /admin/subscribers` — list newest-first, filter by `source`/`status`,
  paginated.

Controller (`NewsletterController`) mirrors `DemoRequestController` shape; the
admin list handler is wired into `AdminController`-style mounting on the admin
router.

## Web (`web/src/` layout on `feat/founding-50`)

### `lib/newsletter-api.ts`

Copied from `lib/demo-api.ts`: public `subscribe(payload)` using a plain
`fetch` against `${API_BASE_URL}/newsletter/subscribe`, **never throws**,
resolves `{ ok: boolean; message?: string }`.

### `components/marketing/NewsletterForm.tsx`

One reusable client component:

- Props: `source: string`, `variant: 'footer' | 'block'`.
- Email input + submit button, inline success / error state, disabled-while-
  submitting. A hidden honeypot field for basic spam defense.
- `footer` variant: slim, single-line, fits the footer column styling.
- `block` variant: headline + subcopy + form, for the landing section and
  guides pages. Uses existing Tailwind tokens (`bg-paper`, `text-foundation-700`,
  `cryola` accents) to match the surrounding marketing design.

### Placements

1. **Footer** — `footer` variant added to `components/landing/Footer.tsx`
   (`source="newsletter-footer"`).
2. **End of landing** — `block` variant section in `app/page.tsx`, placed after
   `<Faq />` and before `<FinalCta />` (`source="newsletter-landing"`).
3. **Guides** — `block` variant at the end of the guides content
   (`source="newsletter-guides"`).
4. **Exit-intent** — **Phase 2.** A mouse-leave wrapper reusing the same form.
   Deferred; the only placement with annoyance/UX trade-offs worth a separate
   pass.

### `/unsubscribe` page (`web/src/app/unsubscribe/page.tsx`)

Reads `?email=`, calls `POST /newsletter/unsubscribe`, shows confirmation.
Linked from the welcome-email footer and a `List-Unsubscribe` header.

### Welcome email

Short, on-brand HTML + text (same structure as the demo confirmation email):
thanks for subscribing, one line on what they'll get (Nigerian landlord/tenant
tips + product updates), a link to browse listings or get started, and the
unsubscribe link. Nothing fancy.

## Scope guardrails (YAGNI — explicitly out of Phase 1)

- Drip automations / sequences
- Segmented sends (single audience for now; source kept in Mongo for later)
- Double opt-in
- Subscriber analytics dashboard (beyond the admin list)
- Exit-intent popup (Phase 2)

## Manual verification (no test runner in this repo)

- `POST /newsletter/subscribe` with a new email → Mongo row created, Resend
  contact created (if `RESEND_AUDIENCE_ID` set), welcome email received.
- Re-submit same email → no duplicate row, no second welcome email.
- Submit a demo request → email appears in `Subscriber` with
  `source: 'demo-request'`.
- Join founding waitlist (sold-out path) → email appears with
  `source: 'founding-sold-out'`.
- `/unsubscribe?email=...` → Mongo status flips, Resend contact marked
  unsubscribed.
- Footer / landing / guides forms each submit successfully and show inline
  success; failure path shows a retry message (never a thrown error).
