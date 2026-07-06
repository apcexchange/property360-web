# WhatsApp Channel for the Platform Assistant

**Date:** 2026-07-06
**Status:** Approved
**Scope:** Backend only (webhook route, WhatsAppService, AssistantService, new agent tools). No mobile or web client changes.

## Problem

The platform assistant (AssistantService: an LLM tool-calling loop grounded in the user's own data) is only reachable inside the app and web dashboard. Landlords, property managers (agents), and tenants live on WhatsApp. They should be able to message Property360 on WhatsApp, ask questions about their own data ("who owes rent this month?", "when does my lease expire?"), and receive answers plus tap-able links into the app, without opening the app first.

## Decision

Build a thin WhatsApp channel adapter over the existing assistant using the Meta WhatsApp Cloud API directly: an inbound webhook, identity resolution by **verified WhatsApp** (the `whatsappVerified` flag, earned by completing phone verification over the WhatsApp channel per the 2026-07-06 WhatsApp-first OTP spec), the existing `AssistantService.ask()` loop, and free-form text replies inside Meta's 24-hour service window. v1 is read-only plus deep links, and serves all three roles (tenant, landlord, agent), which requires building the missing read-only agent toolset.

### Alternatives considered and rejected

1. **Two-way via a BSP (Termii or Sendchamp).** Both proxy Meta's API, their inbox products are weaker-documented, and inbound would bind us to a middleman's webhook shape. Meta is already the default outbound provider in `WhatsAppService`.
2. **Menu bot / WhatsApp Flows (no LLM).** Deterministic and cheap, but it is an IVR, not the assistant. May complement this later; not a substitute.
3. **Write actions in v1.** Rejected for now: money-adjacent writes from a chat channel need a stronger per-action auth step. v1 answers questions and links into the app for anything that changes state.

## Design

### 1. Inbound webhook

- `GET /webhooks/whatsapp`: Meta verification handshake. Echo `hub.challenge` when `hub.verify_token` matches `WHATSAPP_VERIFY_TOKEN`.
- `POST /webhooks/whatsapp`: mounted with the other webhooks in `backend/src/routes/index.ts` (bypasses JWT by design). Verify `X-Hub-Signature-256` (HMAC-SHA256 of the raw request body with the Meta app secret) in the handler before any processing; mismatch returns 401. Follow the same raw-body capture pattern the Paystack webhook uses.
- Return 200 immediately and process asynchronously in-process (acceptable on the single Render instance, consistent with existing patterns).
- Handle only `type: 'text'` messages in v1. Media, audio, location, and contacts get a static "I can only read text messages for now" reply. Delivery-status callbacks (`statuses`) are ignored.
- **Dedup:** Meta retries webhooks. Store processed `wamid`s in a small TTL collection (`WhatsAppInbound`, TTL ~7 days) and skip already-seen ids.

### 2. Identity resolution

Normalize the inbound `wa_id` to E.164 (reuse the existing phone normalization) and look up users where `phone` matches, `whatsappVerified: true`, `isActive: true`, and not soft-deleted.

| Match count | Behavior |
| --- | --- |
| Exactly 1 | Proceed as that user: `ToolContext { userId, role }` |
| 0, but the phone matches an account without `whatsappVerified` | Static reply (no LLM call): "verify your WhatsApp from the app to use the assistant", with a link to the in-app verification screen. Covers both unverified users and users who verified by SMS only |
| 0, no account matches at all | Static reply (no LLM call): this number is not linked to a Property360 account, with a signup link |
| 2+ | Static "please contact support" reply; log for ops (`User.phone` is not unique) |

Rationale: verifying WhatsApp is the explicit unlock for the assistant. WhatsApp authenticates that the sender controls the number in the moment; `whatsappVerified` proves the account holder completed a code delivered to that same WhatsApp (the OTP spec sets it only when the code went over the WhatsApp channel, never via the SMS fallback). `phoneVerified` alone is NOT sufficient. This is sound for read-only access and is one reason v1 stays read-only.

### 3. Assistant integration

- The adapter calls the existing non-streaming `AssistantService.ask()`.
- **Agent role support (new):** `backend/src/services/assistant/tools/agentTools.ts`, read-only. Tools resolve the agent's active `LandlordAgent` assignments and scope every query to assigned properties, honoring the per-assignment permission flags: payment queries require `canViewPayments`, report-style summaries require `canViewReports`, and so on. A tool that the agent lacks permission for returns a structured "not permitted" result the model can relay. The role gate in `prepareTurn` admits `UserRole.AGENT`, and the per-turn role marker covers the agent case. Side effect (intended): agents can then also use the assistant through the existing authenticated REST endpoints, even though no in-app agent assistant UI ships with this work.
- **Channel marker:** a per-turn system line (for example: `CHANNEL: whatsapp. Keep replies short, plain text, no markdown tables.`) added by the adapter so replies fit a chat bubble.
- **Shared history:** WhatsApp turns persist to the same `AssistantMessage` collection with a new optional `channel: 'app' | 'whatsapp'` field (default `'app'`). One conversation brain across surfaces; the channel field exists for analytics and debugging, not for partitioning history.

### 4. Outbound replies

- New `sendText(phoneE164DigitsOnly, text)` on `WhatsAppService`, implemented for the Meta provider only. Free-form text is permitted and free inside the 24-hour service window, which always applies here because the user messages first. If the configured template provider is Termii or Sendchamp, template notifications keep flowing through it; the assistant channel independently requires Meta credentials.
- **Actions:** the assistant's `[[action:key]]` output resolves through the existing `resolveActions()`; the adapter renders each action as a labeled absolute URL on its own line, `label: WEB_APP_BASE_URL + action.web`. WhatsApp auto-links URLs.
- Chunk replies at WhatsApp's 4096-character text limit (the channel marker should keep replies far below it).
- Nicety (should-have, not must-have): send mark-as-read plus a typing indicator on receipt.

### 5. Gating and cost control

- Master switch: `WHATSAPP_ASSISTANT_ENABLED` (default off). Independent of the notification master switch.
- The template gates (landlord subscription tier, tenant notification preferences) do NOT apply: those govern proactive notifications; this is a user-initiated conversation.
- Per-user rate limit enforced before any LLM call (defaults: 10/minute, 50/day, env-tunable). Over the limit: static reply. Inbound text truncated at 2000 characters.
- WhatsApp marginal cost is zero (service conversations); the only variable cost is LLM tokens.

### 6. Error handling

| Scenario | Behavior |
| --- | --- |
| Signature verification fails | 401, log, no processing |
| Duplicate `wamid` | 200, skip silently |
| LLM/tool loop throws | Static apology reply via sendText |
| sendText fails | Log, one retry, then give up (never crash the webhook path) |
| Unsupported message type | Static "text only" reply |
| Feature flag off | 200, ignore payload (webhook stays subscribed) |

### 7. Configuration

New env vars (added to `.env.example`, `.env.prod.example`, and render.yaml as `sync: false` where secret):

- `WHATSAPP_APP_SECRET`: Meta app secret for signature verification
- `WHATSAPP_VERIFY_TOKEN`: self-chosen handshake token
- `WHATSAPP_ASSISTANT_ENABLED`: master switch, default `false`
- `WEB_APP_BASE_URL`: absolute base for rendering action links
- Rate-limit tunables (optional, with code defaults)

Existing `config.whatsapp.meta.*` (phoneNumberId, accessToken, apiVersion) is reused for sends, but pointed at the assistant's dedicated number.

## Ops prerequisites (critical path, before implementation is testable)

1. Meta Business app with the WhatsApp product enabled and a permanent system-user access token.
2. A **dedicated assistant phone number** registered on the Cloud API. The Founding 50 click-to-WhatsApp sales number stays on the WhatsApp Business app for human chats: a number cannot be on both, and moving it would break the manual funnel.
3. Webhook subscription to the `messages` field pointing at `https://api.property360.africa/api/v1/webhooks/whatsapp`.
4. Confirm the display name / business verification status so the assistant number does not look like spam.

## Out of scope for v1

- Write actions of any kind (including "send reminder" style safe writes)
- Proactive, assistant-initiated conversations (requires approved templates and opt-in design)
- Media or voice-note understanding
- Menu-bot or WhatsApp Flows layer
- Streaming (WhatsApp has no incremental message editing)

## Testing

No test runner exists in the repo. Manual verification:

1. curl the `GET` handshake with a matching and a mismatching verify token.
2. curl simulated Meta `POST` payloads (valid signature, invalid signature, duplicate `wamid`, non-text type) against a dev deploy and check logs plus replies.
3. End to end from a real WhatsApp account whose number belongs to: a WhatsApp-verified tenant, a WhatsApp-verified landlord, a WhatsApp-verified agent (permission-gated queries both allowed and denied), a user verified by SMS only (must be guided to WhatsApp verification), an unverified user, and an unknown number.
4. Confirm an action-bearing reply renders as a working absolute web URL.
5. Confirm rate limiting with a burst of messages.
