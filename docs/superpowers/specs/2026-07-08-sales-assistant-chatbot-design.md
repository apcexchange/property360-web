# Sales Assistant Chatbot (Website AI Sales Agent)

**Date:** 2026-07-08
**Status:** Approved design, pending implementation plan
**Owner:** Peter

## Goal

A public AI sales agent on property360.africa that understands the product, answers visitor questions, handles objections, and converts visitors into signups. Primary conversion goal: direct signup (the Founding 50 offer is the current headline). Secondary goal: capture contact details from interested visitors who do not sign up in the chat, so no warm lead is lost.

Inspiration: lura.ng (a Nigerian "24/7 AI sales agent" SaaS). We are building our own instead of subscribing, reusing the in-house assistant stack. The build is Property360-first, but structured so the core (agent config, knowledge pack, lead store, lead CRM) could later be extracted into a standalone multi-tenant service if it proves itself.

## Decisions made during brainstorming

1. **Build our own** rather than subscribe to Lura. We already have an LLM client with provider failover, a tool-call loop, and action-button plumbing in the backend.
2. **Primary CTA is direct signup** on the web app (Founding 50 claim), measurable in PostHog.
3. **The widget replaces Smartsupp** as the single floating chat bubble on all public and marketing pages. `SmartsuppChat.tsx` is removed from the layout.
4. **Soft lead capture mid-chat**: the bot sells first, and asks for name plus WhatsApp number or email when interest is clear. No gate before chatting. (Superseded post-build, see Amendments.)
5. **Scope**: Property360 site only for v1. Clean module boundaries preserve the option to extract a Lura-style standalone product later. No multi-tenant work now.
6. **Architecture A**: a new, separate public sales module on the Express backend. Not a guest mode bolted onto the existing account-scoped `/assistant` routes, and not a parallel chat stack in Next.js.

## Backend design

New module, parallel to the existing assistant, under `backend/src/services/sales/` with its own models, routes, and controller. It reuses `services/assistant/llmClient.ts` (OpenAI-compatible chat completions with provider failover) unchanged.

### Models

**SalesLead** (one per visitor session)
- `sessionId: string` (unique index; opaque client-generated UUID)
- `name?: string`
- `phone?: string`
- `email?: string`
- `role?: 'landlord' | 'agent' | 'tenant' | 'other'`
- `portfolioSize?: string` (free text, e.g. "12 units")
- `quality?: 'hot' | 'warm' | 'cold'` (set by the LLM at capture time)
- `status: 'open' | 'captured' | 'converted' | 'dismissed'` (default `open`; `captured` once contact info lands; `converted` and `dismissed` are set manually in the admin CRM)
- `sourcePage?: string` (path where the chat started)
- `messageCount: number`
- `lastMessageAt: Date`
- timestamps

**SalesMessage**
- `sessionId: string` (indexed)
- `role: 'user' | 'assistant'`
- `content: string`
- timestamps

### Routes

Public routes mounted at `/api/v1/sales`, no JWT (same precedent as webhooks: protection lives in the handler).

- `POST /sales/messages` with `{ sessionId, text, page? }` returns JSON `{ reply, actions }`. Same non-streaming round-trip as the app assistant; replies are short and the widget shows a typing indicator. Streaming is a later upgrade (`askStream` already exists as a pattern).
- `GET /sales/messages?sessionId=` returns the session transcript so the widget restores on reload.

Admin routes on the existing authenticated `/admin` router:

- `GET /admin/sales/leads` (filter by status and quality, newest first)
- `GET /admin/sales/leads/:id` (lead plus full transcript)
- `PATCH /admin/sales/leads/:id` (update status)

### LLM behavior

- New `SALES_SYSTEM_PROMPT` in `services/sales/`, separate from the app assistant prompt. Contents:
  - **Persona**: a friendly, knowledgeable Nigerian property expert selling Property360. Concise, benefit-led, plain text only, Naira formatting, never pushy, never invents facts.
  - **Knowledge pack**: compiled at build time from real sources: product features (PROPERTY360_POC.md), pricing tiers (`web/src/components/marketing/pricingTiers.ts` content, restated in the prompt), the Founding 50 offer terms, and a Nigerian-market FAQ and objection-handling playbook (e.g. "my tenants pay cash", "I already use WhatsApp and Excel", "is my money safe", "what does it cost"). The playbook is authored as part of implementation and lives in a dedicated prompt file so it can be edited without touching logic.
  - **Sales rules**: qualify the visitor's role early (landlord, agent, tenant), always end with a concrete next step, surface the signup CTA when interest shows, ask for contact details when interest is clear or the visitor is leaving with unresolved objections, never quote prices not in the knowledge pack, no legal or financial advice.
- **One tool only**: `capture_lead(name, phone?, email?, role?, portfolioSize?, quality)`. It is the sole state-changing action. At least one of phone or email is required. It upserts the `SalesLead` for the session, sets `status: 'captured'`, subscribes a captured email to the existing Resend nurture audience, and emails an alert to the owner via Resend. Tool failures are logged and never break the chat reply.
- **Actions**: reuses the `[[action:KEY]]` tag convention with a sales-specific catalog: `signup` (primary, links to `/signup?src=salesbot`), `pricing` (pricing section), `whatsapp` (wa.me link to the business number). The widget renders these as buttons.
- Prompt-injection posture: no account data exists on this surface, the single tool writes only lead fields, and user text is treated as data.

### Abuse and cost controls

This is a public endpoint that costs money per message. Controls, all enforced server-side:

- Per-IP rate limit: 20 messages per 10 minutes (express-rate-limit, keyed by `req.ip`; `trust proxy` is already set).
- Per-session cap: 40 messages per day (counted from `SalesMessage`).
- Message length cap: 1,000 characters.
- History window: last 10 turns, matching the app assistant.
- Global daily budget: a max number of assistant turns per UTC day (env-tunable, default 1,000). Over budget, the endpoint returns a canned reply pointing to signup and WhatsApp instead of calling the LLM.
- `SALES_ASSISTANT_ENABLED` env flag as a kill switch; when off, the API returns the canned reply and the web widget hides itself (it probes with the history GET, which returns an `enabled` flag).

### Notifications

On lead capture: one alert email to the owner (via Resend, already integrated for the newsletter) containing name, contact, role, quality, and a link to the admin lead page. WhatsApp alerts to the owner's phone are a later upgrade (business-initiated WhatsApp needs an approved template).

## Web design

### SalesChatWidget

New client component in `web/src/components/sales/`, mounted where `SmartsuppChat` is today, on public and marketing pages only. Excluded from `/app`, `/me`, and `/admin` (logged-in areas keep the existing account assistant). `SmartsuppChat.tsx` and its mount are removed.

- Floating bubble, bottom right, brand-styled. Opens a chat panel.
- Panel contents: short greeting from the bot, three suggested quick questions ("What does Property360 cost?", "How does rent collection work?", "I manage properties for landlords, what's in it for me?"), message list, typing indicator, input box.
- Action tags render as buttons under the reply (Sign up, See pricing, Chat on WhatsApp).
- Session: UUID generated client-side, stored in localStorage together with nothing else (transcript is restored from the API, not localStorage).
- Errors: on API failure the widget shows a retry affordance and a WhatsApp fallback link; it never dead-ends.

### Admin lead CRM

One new page in the existing admin app: a leads table (name, contact, role, quality, status, message count, last activity), a transcript drawer or detail view per lead, status updates (converted, dismissed), and a prefilled wa.me follow-up link per lead ("Hi {name}, following up on your chat with our assistant"). No CSV export in v1.

### Analytics

PostHog events forming the funnel: `salesbot_opened`, `salesbot_message_sent`, `salesbot_lead_captured` (fired when a reply's lead-capture succeeds; the API response includes a `leadCaptured` flag), `salesbot_signup_clicked`. Existing PostHog wiring on web is reused.

## Rollout

- Built on `feat/founding-50` (current branch, `web/src` layout). Ships to production via the established port to main (path remap `web/src` to `src`). Backend ships via main to Render.
- No new secrets: reuses the configured AI provider chain and Resend. New non-secret env vars: `SALES_ASSISTANT_ENABLED`, `SALES_ASSISTANT_DAILY_BUDGET`; declared in render.yaml and `.env.example` files.
- Manual verification (no test runner in this repo): curl the sales endpoint through the rate-limit and budget paths, run a full conversation on the local web widget including lead capture, confirm the Resend email and nurture subscription, and check the admin CRM view.

## Error handling summary

- LLM provider failures: existing failover chain; if all providers fail, the canned fallback reply with signup and WhatsApp links.
- `capture_lead` side-effect failures (Resend down): lead is still saved; email and subscription failures are logged, not surfaced to the visitor.
- Rate limit and budget exhaustion: polite canned replies, never raw 429 text in the widget.
- Widget API failures: retry plus WhatsApp fallback link.

## Out of scope for v1 (future)

- Multi-tenant standalone service (the Lura competitor). The module boundary (`services/sales/`, own models, own prompt file) is the extraction seam.
- Streaming replies, WhatsApp owner alerts, CSV export, hot-lead auto-routing to WhatsApp, per-page context awareness beyond `sourcePage`.

## Amendments

**2026-07-08 (post-build, user decision): pre-chat lead gate replaces soft mid-chat capture.** Matching the Lura UX: the visitor's first message appears in the thread, then a "Let's get started" form overlay collects name (required) plus WhatsApp number or email (at least one required, email optional) before the first answer is delivered. Implementation: public `POST /sales/leads` (validated, rate-limited to 5 per IP per 10 minutes since each capture can email the owner), `leadCaptured` flag added to the history response so returning captured visitors skip the gate (also cached in localStorage), and the chat prompt now receives a per-session VISITOR PROFILE system line so the bot greets the visitor by first name and never re-asks for known details. The `capture_lead` LLM tool remains as an enrichment path (role, portfolio size, quality, corrections).

## Success criteria

- The bot answers product, pricing, and Founding 50 questions accurately from the knowledge pack, in plain text, with working CTA buttons.
- A visitor can be taken from question to signup click; the PostHog funnel records each step.
- Interested visitors who share contact details appear in the admin CRM within seconds, with an owner alert email delivered.
- The endpoint survives abuse: rate limits and the daily budget hold, and the kill switch hides the widget end to end.
