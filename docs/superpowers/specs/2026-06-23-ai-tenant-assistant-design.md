# PRD — AI Assistant (v1: in-app, read-only, account-aware Q&A)

**Date:** 2026-06-23
**Status:** Draft for review
**Owner:** Peter
**Phase:** New "AI Assistant" capability — v1 is the quick win; complexity layers on later.

---

## 1. Summary

Add an AI assistant inside Property360 that answers tenants' and landlords'
questions about *their own account* in natural language — "What's my balance?",
"When is rent due?", "What's my lease fee breakdown?", "Show my arrears across
my units" — by calling the backend's existing services as tools and answering
from the live result.

v1 is deliberately small: **in-app chat only, read-only, account-aware Q&A, for
both tenants and landlords.** It ships no money-moving actions and no document
RAG. Those are explicitly deferred (Section 9).

This is the clearest differentiation gap found in research: no Nigerian
property-management competitor (Spleet, SmallSmall, Our Property NG, Kayapro360)
ships an LLM assistant today. It also reuses infrastructure Property360 already
runs, so it is genuinely a quick win.

---

## 2. Why this is a quick win (what already exists)

Research + a scan of the codebase confirmed the heavy lifting is already done:

- **LLM client + keys + provider abstraction already in the backend.**
  [backend/src/services/AIService.ts](../../../backend/src/services/AIService.ts)
  already imports `@anthropic-ai/sdk` and `@google/genai`, and
  [backend/src/config/index.ts](../../../backend/src/config/index.ts) exposes a
  pluggable `AI_PROVIDER` switch with per-provider model + key config. We extend
  this. **Gemini is dropped** for the assistant (free-tier reliability proved
  unacceptable for a customer-facing surface); v1 standardizes on
  OpenAI-compatible providers (DeepSeek primary, Groq + Kimi fallbacks) — see §5.3.
- **All the data the assistant needs is already behind services**: `LeaseService`,
  `InvoiceService`, `PaymentService`, `MaintenanceService`, `ReportsService`,
  `PropertyService`, `DashboardService`, etc. The assistant calls these as
  tools; it does not query Mongo directly.
- **The strict layering and the landlord-scoping invariant already exist** —
  routes → controllers → services, and `req.landlordId` (set by
  `checkAgentPermission`) is the scoping key. The assistant reuses both.
- **In-app chat UI already exists** (Socket.IO, `ChatService`,
  `Conversation`/`Message`), so the tenant/landlord-facing surface is mostly
  reuse.

### Prior art reviewed (so we don't rebuild solved problems)

| Need | What we use | Why |
|---|---|---|
| LLM API | One **OpenAI-compatible adapter** over the existing `AI_PROVIDER` switch | Groq / DeepSeek / Kimi are all OpenAI-SDK drop-ins (swap `baseURL`+`apiKey`+`model`); one code path, no per-vendor client |
| Function/tool calling | OpenAI-style `tools` via the adapter | All three providers support it; no new framework needed for structured-data Q&A |
| Orchestration framework (LangChain.js / LlamaIndex.TS) | **Not used in v1** | Overkill for tool-call-over-our-own-API; revisit only if/when we add RAG |
| Vector DB | **Not used in v1** | No RAG in v1. When added, MongoDB Atlas Vector Search (already on Atlas) avoids a new datastore |
| MCP servers | **Not used in v1** | The assistant calls our services in-process; MCP is an internal-ops option for later |

---

## 3. Goals & non-goals

**Goals**
- A tenant or landlord can open an "Assistant" chat in-app and get accurate,
  account-specific answers in natural language.
- Every answer is grounded in live data via tool calls — no hallucinated
  balances or dates.
- Strictly scoped to the authenticated user's own data; an agent acting for a
  landlord sees the landlord's data (via `req.landlordId`), never another
  landlord's.
- Runs on low-cost OpenAI-compatible providers (DeepSeek primary, Groq + Kimi
  fallbacks) with **automatic failover**, so a single provider outage or
  throttle never takes the assistant down — the lesson learned from Gemini's
  free-tier flakiness.
- **Gated to Pro plan and above.** The assistant reuses the existing
  `requireAiAccess` middleware (`requireFeature('canUseAiTemplates',
  'AI_FEATURE_NOT_IN_PLAN')` in [backend/src/middleware/subscription.ts](../../../backend/src/middleware/subscription.ts)) —
  the same entitlement that already gates AI agreement drafting ("AI drafting is
  available on the Pro plan and above"). Behavior: **landlords require Pro+**;
  **tenants pass through ungated** (tenants carry no subscription in the
  landlord-only billing model). If tenants should also be gated, that's a
  follow-up — flagged in §10.

**Non-goals (v1)**
- No actions that change state (no payments, no logging maintenance, no
  renewals). Read-only.
- No RAG over the tenancy-agreement PDF.
- No WhatsApp channel.
- No cross-tenant / portfolio analytics beyond what `ReportsService` already
  computes.

---

## 4. Users & top intents

**Tenant** (highest volume): "What's my current balance / outstanding rent?",
"When is my next rent due and how much?", "What does my lease cost breakdown look
like (deposit, agent fee, service charge)?", "What's the status of my maintenance
request?", "How do I pay rent?" (how-to).

**Landlord / agent**: "How much rent is outstanding across my units?", "Which
tenants are in arrears?", "Show me this month's collected vs expected.", "Which
leases expire in the next 60 days?" Landlord queries respect the
agent-permission model.

---

## 5. Architecture

Follows existing layering: `routes/ → controllers/ → services/`.

```
Mobile/Web chat UI
      │  POST /api/v1/assistant/messages   (protect + checkAgentPermission-aware)
      ▼
AssistantController  ──►  AssistantService
                              │  (owns the tool-call loop)
                              ├─ builds system prompt + tool definitions
                              ├─ calls LLM via existing AI provider switch
                              ├─ on tool_use: dispatches to a scoped tool registry
                              │     └─ tools call existing services, scoped by
                              │        req.user (tenant) or req.landlordId (landlord/agent)
                              └─ returns grounded natural-language answer (streamed)
```

### 5.1 New components

- **`AssistantService`** (`backend/src/services/AssistantService.ts`) — owns the
  agentic loop: system prompt, tool definitions, the LLM call, the tool-dispatch
  loop, and final-answer assembly. Calls the LLM through a shared
  **OpenAI-compatible adapter** (the `openai` npm SDK with a swappable
  `baseURL`/`apiKey`/`model` triple and provider-failover order — see §5.3),
  extending the existing `AI_PROVIDER` config rather than instantiating its own
  per-vendor client.
- **Tool registry** (`backend/src/services/assistant/tools/`) — each tool is a
  thin, **read-only** wrapper over an existing service method, with a JSON
  schema and a handler that receives the resolved scope (`userId`/`role`/
  `landlordId`). One file per tool keeps each unit small and independently
  testable. v1 tools:
  - `get_my_lease_summary` (tenant) → `LeaseService`
  - `get_my_balance` / `get_my_invoices` (tenant) → `InvoiceService`/`PaymentService`
  - `get_my_maintenance_status` (tenant) → `MaintenanceService`
  - `get_arrears_summary` (landlord) → `ReportsService`
  - `get_expiring_leases` (landlord) → `LeaseService`
  - `get_collection_summary` (landlord) → `ReportsService`/`DashboardService`
  - `get_how_to` (both) → static curated help content (no service call)
- **`AssistantController`** + **`assistantRoutes`** — mounts under
  `${API_PREFIX}/${API_VERSION}/assistant`, behind `protect`, then
  `authorize(TENANT, LANDLORD)`, then **`requireAiAccess`** on the
  message-generating route (Pro+ for landlords; tenants pass through). Tools
  that touch landlord-scoped data resolve scope the same way the rest of the
  app does.
- **`AssistantConversation` persistence** — reuse the existing
  `Conversation`/`Message` models with a distinct type/flag (e.g.
  `kind: 'assistant'`) so history renders in the existing chat UI and is
  retained per user. (Confirm during planning whether to extend `Conversation`
  or add a lightweight sibling model — prefer extending if the schema allows a
  clean discriminator.)

### 5.2 Scope enforcement (the critical invariant)

The tool layer is where security lives, not the prompt:

- **Tenant tools** filter strictly by the authenticated tenant's `userId` and
  their active lease. A tenant can never request another tenant's data because
  the tool ignores any LLM-supplied identifier and uses the session identity.
- **Landlord/agent tools** scope by `req.landlordId` (set by
  `checkAgentPermission`), never `req.user._id`, so an agent sees the landlord's
  data and the existing per-permission flags (`canViewPayments`,
  `canViewReports`, …) gate which tools are even offered.
- **The LLM never receives raw identifiers it can manipulate.** Tool inputs are
  things like a date range or a status filter; identity is injected server-side
  from the session.

### 5.3 Model / provider choice

**Single OpenAI-compatible adapter, three interchangeable providers, automatic
failover.** Because Groq, DeepSeek, and Kimi (Moonshot) all expose an
OpenAI-compatible API, the assistant uses **one** client (the official `openai`
npm SDK) and selects a provider by swapping a `baseURL` + `apiKey` + `model`
triple. No per-vendor code path. Gemini is dropped.

Verified (live, June 2026 — re-confirm at build time; pricing/IDs move):

| Role | Provider | Model ID | Base URL | $/1M in→out | Why |
|---|---|---|---|---|---|
| **Primary** | DeepSeek | `deepseek-v4-flash` | `https://api.deepseek.com` | $0.14 → $0.28 (cached in $0.0028) | Cheapest by far (~7× under the others), solid OpenAI-style tool calling, 1M context, streaming. Keeps Founding-50 burn minimal. |
| **Fallback 1** | Groq | `moonshotai/kimi-k2-instruct-0905` | `https://api.groq.com/openai/v1` | $1.00 → $3.00 (cached in $0.50) | Independent infra (survives a DeepSeek outage), fastest by far (LPU), Kimi K2 tuned for reliable tool calling, 256K context. Doubles as the "fast path" for premium/interactive sessions. |
| **Fallback 2** | Kimi direct | `kimi-k2.5` (or `kimi-k2.6`) | `https://api.moonshot.ai/v1` | ~$0.60 → $2.50 (k2.5) | Third independent infra; same model family as the Groq fallback, so prompt/tool behavior carries over. |

**Failover logic:** try primary; on `429` / `5xx` / timeout, fall through to the
next provider in order. All three are the same OpenAI request shape, so failover
is a loop over the provider list, not three code paths. Surface the
active-provider in logs/metrics.

**Latency-first variant (optional flag):** route premium/interactive sessions to
Groq-Kimi (≈10× faster output) while keeping DeepSeek as the cheap default for
everything else — when a given session's UX matters more than cost.

Notes for the implementation plan:
- DeepSeek's legacy `deepseek-chat`/`deepseek-reasoner` aliases are deprecated
  (removal ~2026-07-24) — use the `deepseek-v4-*` IDs.
- DeepSeek `v4-pro` is under a temporary discount; re-check its rate before
  relying on it. Don't ship without re-confirming all three providers' current
  pricing, model IDs, and paid-tier rate limits in their consoles.
- All three support streaming via standard OpenAI SSE.

### 5.4 Streaming & UX

Stream responses (SSE from the API, or chunked over the existing Socket.IO chat
channel) so the assistant feels responsive. Show a typing indicator while tools
run. Keep `max_tokens` modest (answers are short).

---

## 6. Prompt design

- **System prompt** (frozen, cacheable): role = "Property360 assistant for
  Nigerian landlords/tenants"; NGN/₦ formatting, +234 phone norms; **must answer
  only from tool results**; if a tool returns nothing, say so plainly; never
  invent figures; never give legal/financial advice; defer money actions to "you
  can pay in the app" with a deep link rather than acting.
- **Tool definitions** are deterministic and ordered (stable for prompt
  caching). On the Anthropic path, cache the system prompt + tool block.
- Inject the user's role and (for landlords) the resolved `landlordId` context
  as server-side state used to *select which tools are offered*, not as
  free-text the user can override.

---

## 7. Success metrics

- **Grounding:** ≥95% of factual answers (balance, due date, fees) match the
  source service output on a hand-checked sample. (No silent hallucinated
  numbers.)
- **Containment:** % of assistant sessions resolved without the user falling
  back to human chat / support.
- **Adoption:** % of active tenants/landlords who open the assistant in the
  first 30 days post-launch.
- **Cost:** stays within the free Gemini tier at Founding-50 volume; tracked per
  message.

---

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Cross-account data leak | Identity injected server-side; tools ignore LLM-supplied IDs; landlord tools use `req.landlordId`; permission flags gate tool availability |
| Hallucinated figures | Read-only tool-grounding; system prompt forbids answering without a tool result; eval sample before launch |
| Single-provider outage / throttle (the Gemini lesson) | OpenAI-compatible adapter with automatic failover across Groq → DeepSeek → Kimi; per-user rate limit + backoff; active-provider surfaced in metrics |
| Prompt injection via user data (e.g. a malicious maintenance description) | Tool results are data, not instructions; system prompt instructs to treat tool content as untrusted data; no actions in v1 limits blast radius |
| Scope creep into actions/RAG | Explicit non-goals; those are separate phases |
| No test runner in repo | Manual eval script that runs the tool layer + a fixed question set against a seeded account before launch |

---

## 9. Future phases (deliberately out of v1)

1. **WhatsApp channel** — same `AssistantService`, new transport via Meta Cloud
   API utility templates (~₦10/msg; service-window replies free). Needs Meta
   Business verification + template approval.
2. **Lease-document RAG** — embed the tenancy-agreement PDF into MongoDB Atlas
   Vector Search (already on Atlas) so the assistant answers clause-level
   questions.
3. **Actions (agentic)** — initiate a payment, log a maintenance request, start a
   renewal — each gated, confirmed, and respecting `req.landlordId` + permission
   flags.
4. **Proactive / async** — push a "rent due in 3 days, ask me anything" nudge via
   Expo Push (free, SDK already shipped).

---

## 10. Open questions for planning

- Extend `Conversation` with a `kind: 'assistant'` discriminator vs. a separate
  lightweight model? (Prefer extending if clean.)
- Confirm `ReportsService` exposes arrears/collection summaries in a shape the
  landlord tools can wrap directly, or whether a thin read method is needed.
- Provider strategy resolved (§5.3): Groq/Kimi-K2 primary → DeepSeek → Kimi
  direct, via one OpenAI-compatible adapter with failover. Remaining check:
  re-confirm each provider's current pricing, model IDs, and paid-tier rate
  limits in-console before build.
- SSE endpoint vs. streaming over the existing Socket.IO chat channel for the
  in-app surface.
- Tenant gating: `requireAiAccess` passes tenants through ungated (the
  established AI-feature behavior). Confirm whether the assistant should be a
  pure Pro perk (gate tenants too) or remain free for tenants whose landlord is
  on Pro+. v1 assumes the existing pass-through behavior.
