# AI Sales Follow-up, Phase 1 (Landlords and Agents) Design

Date: 2026-09-24
Repos: backend, web
Depends on: backend PR #19 (tenant referral) merged, for `SubscriptionService.applyActivation`, the STOP/opt-out webhook pattern and `sendTemplateToPhone`; and PR #18 (security hotfix).
Phase: 1 of 3 (engine + landlord/agent playbooks). Phase 2 adds tenants (referral + local listings), Phase 3 adds website leads who never registered. Each later phase is a new playbook on this engine with its own spec.

## Goal

Turn registered landlords and agents who aren't paying into subscribers. Property360 proactively follows up on a capped schedule over WhatsApp and email, and when they reply, an AI sales assistant chats with them: answers questions, handles objections, helps them set up, sends a one-tap plan link, and hands hot leads to the sales team. Property360 never collects rent; the AI must never say or imply otherwise.

## Decisions

| Topic | Decision |
|---|---|
| Audience (phase 1) | Landlords and agents: trial (active or expired), cancelled, past_due; plus "signed up but not set up" steps |
| Channels | WhatsApp + email (no SMS) |
| WhatsApp number | Same number for now; code supports a separate sales number via `SALES_WHATSAPP_PHONE_NUMBER_ID`, falling back to the main number |
| AI capabilities | Sell, guide setup, plan link, human handoff, plus in-chat actions (start add property / add tenant flows) |
| Control | Admin page with pause, preview mode, per-step A/B testing, funnel stats, journey timelines |
| Win-back email consent | Respect `notificationPreferences.marketingEmails` (default off); welcome email offers opt-in |
| Architecture | Per-user `SalesJourney` state + a 15-minute cron evaluator, reusing node-cron, WhatsApp templates, Resend and the assistant LLM chain. No queue infra |

Rejected: per-message scheduled jobs (needs Redis/queue, hard to change cadence), an external marketing tool (AI context and actions would live outside the platform, monthly cost).

## Existing pieces reused

- Website sales assistant: `src/services/sales/*` (`SALES_SYSTEM_PROMPT`, objection playbook, pricing and Founding 50 copy, human handoff number `2348130416934`).
- WhatsApp assistant: `WhatsAppAssistantService.processInbound` (dedup, rate limits, user resolution, write flows) and `AssistantService.ask` with the OpenAI-compatible provider chain in `src/services/assistant/llmClient.ts`. Today an unentitled landlord gets `REPLY_NEEDS_PLAN`; phase 1 replaces that with sales mode.
- `WhatsAppService` templates (Meta/Termii/Sendchamp, `dryRun`), `sendWhatsAppText` for free-form replies inside the 24h window, Meta delivery-status webhook, Resend email.
- STOP handling pattern from the tenant referral work (PR #19).
- Subscription lifecycle: `SubscriptionStatus` trialing/active/past_due/cancelled/expired, 7-day trial, `TIER_CONFIG` prices.

## 1. Data model

### `SalesJourney` (one per landlord/agent)
| Field | Notes |
|---|---|
| `user` | unique ref User |
| `track` | `trial`, `post_trial`, `cancelled`, `past_due` |
| `trackStartedAt` | day offsets are relative to this |
| `stepIndex`, `nextStepAt` | position in the track's schedule; indexed with `status` |
| `variant` | `A` or `B`, assigned randomly at creation, sticky |
| `whatsappUnpromptedCount`, `lastWhatsappAt`, `lastEmailAt` | caps |
| `consecutiveWhatsappFailures`, `whatsappDisabled` | undeliverable handling |
| `lastUserReplyAt` | 48h pause and 24h reply window |
| `status` | `active`, `paused_reply`, `converted`, `stopped`, `completed` |
| `stopReason` | `subscribed`, `opt_out`, `not_interested`, `undeliverable`, `admin`, `deleted` |
| `hot` | set on human handoff |
| `lockedUntil` | per-journey processing lock |
| `convertedAt`, `attributedStep`, `attributedToChat` | attribution |
| timestamps | |

### `SalesTouch` (one per send/skip)
`journey`, `user`, `track`, `stepKey`, `channel` (`whatsapp`|`email`), `variant`, `templateOrEmailKey`, `status` (`sent`|`delivered`|`failed`|`skipped`|`dry_run`), `skipReason`, `providerMessageId` (indexed, for delivery webhooks), timestamps.

### `SalesFollowUpSettings` (singleton document)
`paused` (bool), `previewMode` (bool, default true), `stepVariants: { [stepKey]: 'ab' | 'A' | 'B' }`.

### Journey lifecycle
- Created at landlord/agent signup (`AuthService.register`, `WhatsAppOnboardingService.createAccount`) and by a one-time backfill for existing non-paying landlords/agents.
- Trial expiry without payment: `trial` -> `post_trial`.
- Paid activation (the `applyActivation` hook in `SubscriptionService`): `converted`, with attribution.
- `subscription.disable`/`not_renew` -> `cancelled` track; `invoice.payment_failed` -> `past_due` track (reopens a converted/completed journey; never reopens `stopped`).
- Account deletion -> `stopped`/`deleted`.
- `stopped` is terminal except admin restart.

### Schedule definition (in code)
A typed list per track: `{ key, dayOffset, channel: 'whatsapp' | 'email' | 'both', emailFallback?: boolean, condition?: (ctx) => boolean, templateKey?, emailKey?, marketing: boolean }`. Variants are per step (template name or email builder for A and B).

| Track | Steps |
|---|---|
| trial | d0 welcome (both), d1 setup nudge (whatsapp, condition: no property), d3 value email, d4 trial ending (whatsapp, skipped if the trial already ended), d7 trial ended (both) |
| post_trial | d3 email (= day 10 overall), d7 whatsapp (= day 14), d14 email (= day 21), d23 whatsapp (= day 30), then monthly email for 6 months |
| past_due | d0 payment failed (both), d3 payment failed reminder (whatsapp) |
| cancelled | d7 win-back (both), d30 win-back (both) |

`marketing: true` steps: trial ending, trial ended, all post_trial, cancelled win-backs. Marketing email steps require `marketingEmails === true`; marketing WhatsApp steps require not opted out and `whatsappUpdates !== false`.

## 2. Evaluator

`SalesFollowUpService.runDue()` every 15 minutes (node-cron), skipped entirely when `paused`. Processes up to 200 `active` journeys with `nextStepAt <= now`, oldest first, each under a lock (`findOneAndUpdate` on `lockedUntil`). Per journey:

1. Refresh state: paid subscription -> `converted`; deleted/inactive -> `stopped`; opted out -> `stopped`.
2. Timing gates (reschedule, don't skip): quiet hours 21:00-08:00 Africa/Lagos -> next 08:00; `lastUserReplyAt` within 48h -> reply + 48h; MARKETING WhatsApp step with a MARKETING WhatsApp sent within 3 days -> that + 3 days (UTILITY templates, i.e. welcome, setup nudge, payment failed, are exempt from spacing).
3. Step `condition` false -> `SalesTouch` skipped, advance.
4. Channel eligibility: WhatsApp needs phone, not `whatsappDisabled`, template configured, and for MARKETING templates fewer than 6 marketing WhatsApp sends so far (UTILITY sends don't count toward or get blocked by the cap); otherwise email if the step allows (`both` or `emailFallback`), else skip. Email needs a verified email and, for marketing steps, `marketingEmails === true`.
5. Send (or `dry_run` in preview mode): WhatsApp via new `WhatsAppService.sendSalesTemplate(phone, key, vars)` using the sales phone number id when set; email via Resend with a signed unsubscribe link. Log `SalesTouch`.
6. Advance `stepIndex`/`nextStepAt` (from `trackStartedAt + dayOffset`); mark `completed` when the track ends.

Backfill: each existing user starts at the step matching their current state; past-dated steps are not sent; first sends are spread randomly over 3 days.

Delivery status: Meta status webhook updates `SalesTouch` by `providerMessageId`; 2 consecutive WhatsApp failures -> `whatsappDisabled` (email continues).

## 3. AI sales conversation

Routing when a landlord or agent messages:
- Trialing and entitled: normal assistant plus a short sales context note (days left, may suggest plans when relevant).
- Expired, cancelled or past_due (today `REPLY_NEEDS_PLAN`): sales mode.
- Any message to the sales phone number: sales mode.
- STOP / UNSUBSCRIBE before the AI: journey `stopped`/`opt_out`, confirmation reply. START / SUBSCRIBE re-enables (clears opt-out, journey resumes on its current step).

Sales mode = `AssistantService.ask` with a new sales-mode prompt (adapted from `SALES_SYSTEM_PROMPT` for existing users) plus a profile block: name, role, track, trial days left or days since expiry, properties/tenants count, last plan viewed, recent turns.

Tools: `get_how_to`, `start_add_property`, `start_add_tenant` (reused), `send_plan_link(tier, interval)` -> `${web}/app/billing?plan=&interval=`, `handoff_to_sales_team(summary)` -> team WhatsApp link + owner email + `hot = true`, `mark_not_interested(reason)` -> journey `stopped`/`not_interested` (only on a clear statement).

Rules: free-form replies only after the user messaged (24h window); existing rate limits; `AssistantMessage` gains `mode: 'sales'`; every inbound sets `lastUserReplyAt`; prices and Founding 50 terms come from `TIER_CONFIG` only, no invented discounts; never claim Property360 collects rent.

## 4. Content

WhatsApp templates (variant B optional per template; fallback to A):

| Template | Step | Category |
|---|---|---|
| `sales_trial_welcome` | trial d0 | UTILITY |
| `sales_setup_nudge` | trial d1 | UTILITY |
| `sales_trial_ending` | trial d4 | MARKETING |
| `sales_trial_ended` | trial d7 | MARKETING |
| `sales_winback` | post_trial whatsapp steps | MARKETING |
| `sales_payment_failed` | past_due | UTILITY |
| `sales_cancel_winback` | cancelled | MARKETING |

Each ends with a reply prompt ("Reply YES and I'll show you", "What's holding you back?"). Marketing templates carry a "Reply STOP to opt out" footer. Bodies must not start or end with a variable. A registration script submits them.

Emails: simple branded HTML builders in code, one per step and variant, each with a one-click signed unsubscribe link (no login) that stops sales emails for that user. The welcome email includes a "Keep me posted with tips and offers" button that sets `marketingEmails = true`.

## 5. Admin, attribution, web

Admin "Sales follow-up" page (Growth): pause and preview toggles; per-step variant control; funnel per track/step/variant (sent, delivered, replied, opted out, subscribed within 7 days); totals (active journeys, conversions this month, revenue from conversions); journey list with search, timeline, stop/restart, hot badge.

Attribution: a paid activation within 7 days of a touch or sales-mode chat is attributed to the most recent touch, and flagged `attributedToChat` if a sales-mode exchange occurred in that window.

Endpoints: `GET /admin/sales-followup/stats`, `GET /admin/sales-followup/journeys`, `GET /admin/sales-followup/journeys/:id`, `PATCH /admin/sales-followup/settings`, `POST /admin/sales-followup/journeys/:id/stop`, `POST /admin/sales-followup/journeys/:id/restart`, public `GET /email/unsubscribe?token=` and `GET /email/opt-in?token=`.

Web: admin page; billing page reads `?plan=&interval=` to preselect; unsubscribe and opt-in confirmation pages.

## Error handling

All sends best-effort and logged; a failure never stops the batch. AI failure falls back to a canned reply with the plan link. Per-journey lock prevents double sends across instances. Hooks into signup, activation and Paystack events are fire-and-forget and never block those flows.

## Testing

Unit tests (`node:test`) for pure logic: next-step computation, quiet hours, caps, 48h pause, conditions, channel selection and fallback, marketing consent gating, A/B assignment and forced variants, attribution window. Manual preview-mode run against real data before going live.

## Rollout

1. Deploy with `previewMode: true`.
2. Submit templates.
3. Review a week of preview touches in admin.
4. Go live: email + approved UTILITY templates first, MARKETING templates as they're approved.
5. Switch to a dedicated sales number by setting `SALES_WHATSAPP_PHONE_NUMBER_ID`.

## Out of scope (phase 1)

Tenants (phase 2), website leads who never registered (phase 3), SMS, automatic winner selection for A/B tests, multi-language copy.
