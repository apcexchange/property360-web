# WhatsApp Assistant: Write Actions and Marketplace Search

**Date:** 2026-07-09
**Status:** Approved
**Scope:** Backend only (WhatsApp orchestrator, a new write-flow model + service, two new assistant tools). Builds on the live read-only WhatsApp assistant channel and reuses the scripted state-machine pattern from the WhatsApp onboarding work.

## Problem

The WhatsApp assistant (live) is read-only: it answers questions and deep-links into the app for anything that changes state. Landlords and property managers want to *do* the common jobs from WhatsApp without opening the app: add a property, add a tenant. Everyone with an account also wants to search the rental marketplace from chat. This spec adds two write flows (add property, add tenant) and one read tool (marketplace search) to the WhatsApp channel.

## Decision

- **Marketplace search** is a normal read-only assistant tool (`search_marketplace`) wrapping the existing `ListingService.getListings`, available on the WhatsApp channel to the three registered roles (tenant, landlord, agent). It is NOT available to guests: an unregistered number never reaches it and continues to get the existing guest reply that directs it to register (in WhatsApp, on the web, or in the app).
- **Add property** and **add tenant** are **scripted state machines** (deterministic field collection, per-field validation, deterministic amount parsing, an explicit summary-then-YES confirmation gate, commit through the existing services). This mirrors the WhatsApp onboarding registration flow. The assistant LLM only *detects the intent to start* a flow (and may pre-fill fields it clearly heard); it never generates flow prompts and never parses money amounts.
- **Full fidelity in chat**: every field the app forms collect is reachable from WhatsApp, but optional fee collection uses one compound "type amounts or SKIP" prompt rather than one question per fee, so flows stay short.
- Writes are gated behind a new `WHATSAPP_WRITE_ACTIONS_ENABLED` flag (default off) so marketplace search can ship first and writes flip on independently.

### Roles and permissions

| Feature | Who | Notes |
| --- | --- | --- |
| `search_marketplace` | tenant, landlord, agent (registered, WhatsApp-verified) | Read-only; not plan-gated; not for guests |
| add property | landlord only | Agents do not own properties |
| add tenant | landlord, or agent with `canAddTenant` | Agent flow is scoped to the acting landlord and their assigned properties; `landlordId` is the agent's landlord, never the agent |

Landlord write flows additionally require an AI-capable plan, mirroring the assistant's existing landlord plan gate. Agents pass ungated (consistent with the assistant's route-local agent bypass).

### Alternatives considered and rejected

1. **LLM write-tools with a confirm step** (the model gathers fields in free conversation, shows a draft, commits on YES). Rejected for money-adjacent writes: the model would parse rents and fees from free text, and the validation + confirm gate are harder to guarantee. Chosen approach keeps amount parsing and the commit gate deterministic.
2. **Hybrid** (LLM gathers, deterministic commit service). More moving parts than the scripted machine for no added safety.
3. **Guests can search the marketplace.** Rejected per product decision: unregistered numbers are directed to register first; they do not use assistant features.

## Design

### 1. Data: `WhatsAppFlow` model

A server-side state document for one active write flow, keyed by the acting `userId` (unique), TTL 30 minutes from last activity (each step bumps `expiresAt`), deleted on commit or `cancel`. It is keyed by `userId` rather than `waId` because write flows only exist for identified users and the `start_*` tool handler that creates the doc has `ctx.userId` (not the raw `waId`).

Fields:
- `userId: ObjectId` (the acting user; unique, indexed)
- `waId: string` (the number to reply on)
- `type: 'add_property' | 'add_tenant'`
- `step: string` (flow-specific step key)
- `landlordId: ObjectId` (owner context; equals `userId` for landlords, the agent's landlord for agents)
- `data: Mixed` (collected fields so far; shape depends on `type`)
- `expiresAt: Date` (TTL index)
- timestamps

A user can have at most one active write flow. A `WhatsAppFlow` and a `WhatsAppOnboarding` doc never coexist for the same person: onboarding is only for unregistered numbers, write flows only for identified users.

### 2. Service: `WhatsAppWriteFlowService`

Owns the two state machines, mirroring `WhatsAppOnboardingService`. Responsibilities:
- `start(type, ctx, seed?)`: create the flow doc (seeded with any LLM-parsed fields), return the first prompt.
- `advance(doc, text)`: validate the current step's answer, store it, return the next prompt; on the confirm step, commit and return the success message (or a validation re-prompt / error message). Never throws for expected outcomes.
- Deterministic helpers: `parseAmount` ("800k", "800,000", "₦800000", "1.2m" → integer NGN), `parseDate` (natural date → Date, with a default offered), numbered-list selection ("reply 1-N").
- Commit via existing services: `PropertyService.createProperty`, `TenantService.assignTenantToUnit`. All existing validation, invoice/receipt generation, and notifications fire unchanged.

`cancel` (case-insensitive) at any step deletes the doc and confirms. Unknown/invalid answers re-prompt without advancing (and still bump `expiresAt`).

### 3. Orchestrator integration (`WhatsAppAssistantService`)

For an identified, eligible user, `processInbound` gains a check that runs **after identity resolution** (write flows are for identified users) and **before** the landlord plan gate and the normal assistant call:

1. `WhatsAppFlow.findOne({ userId })` — if an active write flow exists, `WhatsAppWriteFlowService.advance()` consumes the message; send its reply; return. (The assistant LLM and the plan gate are bypassed while a flow is active; the landlord already passed the plan gate when starting the flow, and re-charging it per turn would be wrong.)
2. Otherwise, run the normal assistant loop. On the WhatsApp channel, the landlord/agent tool set includes `start_add_property` (landlord only) and `start_add_tenant` (landlord, or agent with `canAddTenant`), plus `search_marketplace` for all three roles.
3. A `start_*` tool handler creates the flow doc (seeded with any confidently-parsed args) and signals a flow start. After the assistant call returns, the orchestrator re-checks for a newly-created flow doc; if present, it sends that flow's first prompt **verbatim from `WhatsAppWriteFlowService`** (not the LLM's paraphrase) and returns. This keeps flow prompts deterministic while letting the LLM own natural-language intent detection.

The write-flow branch is skipped entirely when `WHATSAPP_WRITE_ACTIONS_ENABLED` is false; the `start_*` tools are not added to the tool set in that case, so the assistant simply answers read-only as today.

Flow turns count against the existing assistant rate limiter.

### 4. Add-property flow (state machine)

Landlord only. Steps (each validated; `cancel` aborts):

1. **name** — non-empty property name.
2. **address** — street, then city, then state (three short prompts; postal code skipped, editable in app).
3. **type** — numbered pick from `residential, apartment, house, hostel, shop, commercial, bungalow, land` (the `Property.propertyType` enum).
4. **units** — integer number of units (>= 1).
5. **rent** — default rent per unit + frequency (`monthly | quarterly | annually`), applied to all units as a starting value.
6. **confirm** — full summary; `YES` commits via `PropertyService.createProperty` (bulk-creating the units with the default rent), anything else re-prompts or `cancel` aborts.
7. **done** — success message with a deep link to the property in the app to add photos, amenities, and per-unit rent tweaks: `${config.web.baseUrl}/app/properties/<id>`.

### 5. Add-tenant flow (state machine)

Landlord, or agent with `canAddTenant` (flow scoped to the landlord's properties; `landlordId` = the agent's landlord). Prerequisite: the landlord has at least one vacant unit.

Steps:

1. **property** — numbered list of the landlord's properties (`PropertyService.getProperties`); pick one.
2. **unit** — numbered list of vacant units in that property (`PropertyService.getUnits`, filtered to unoccupied); pick one. If none are vacant, say so and offer to pick another property or start add-property.
3. **tenant name** — first and last (split on first space, remainder is last name; reject empty).
4. **contact** — phone (`+234…`) and/or email; at least one required (used to invite/notify the tenant).
5. **rent** — amount + frequency (default `annually`, acceptable in one tap).
6. **lease dates** — start date, then end date (default end = start + 1 year, offered as the default to accept).
7. **fees** — one compound prompt: "Any one-time fees? e.g. `security 200k, agent 100k, agreement 50k` (categories: security deposit, caution, agent, agreement, legal, service charge, other), or reply SKIP." Parsed into the corresponding `AssignTenantData` fee fields; each amount validated; unrecognized categories re-prompt.
8. **move-in** — "Has the tenant already moved in / paid? YES creates an active lease now; NO sends them an invitation to accept." Maps to `activateImmediately`.
9. **upfront payment** — only if move-in = YES: "Record an upfront payment now? List paid items (e.g. `rent, security`) or SKIP." Builds the optional `payment.paidItems` (method defaults to `bank_transfer`, editable later), which the service turns into completed transactions + receipts.
10. **confirm** — full summary (property, unit, tenant, rent, dates, fees, active-vs-invite, payment); `YES` commits via `TenantService.assignTenantToUnit`.
11. **done** — success message with a deep link to the lease/tenant in the app.

### 6. Marketplace search tool (`search_marketplace`)

Read-only tool for tenant, landlord, and agent on the WhatsApp channel. Parameters (all optional): `state`, `city`, `propertyType`, `minPrice`, `maxPrice`, `bedrooms`, `search` (keyword). Handler calls `ListingService.getListings(filters)` with `limit: 5`, returns the top matches as structured data (listing title, property name, location, rent, bedrooms, and the listing URL `${config.web.baseUrl}/listings/<id>`). The assistant renders each as a short line with a tappable link. If nothing matches, it says so and suggests broadening the search.

### 7. Amount and date parsing (deterministic)

- Amounts: strip `₦`, commas, and spaces; support `k`/`m` suffixes (`800k` → 800000, `1.2m` → 1200000); reject non-numeric; enforce sensible bounds (> 0). Never sourced from the LLM.
- Dates: accept `dd/mm/yyyy`, `yyyy-mm-dd`, and common phrasings; when ambiguous, re-prompt with the expected format. The end-date step offers "reply OK for <default>".

### 8. Error handling

| Scenario | Behavior |
| --- | --- |
| Invalid field answer | Re-prompt the same step (bump TTL); no advance |
| `cancel` at any step | Delete flow, confirm cancellation |
| Flow TTL expired | Doc auto-removed; a later message starts fresh (assistant answers normally) |
| Commit service throws (e.g. validation, race) | Catch, delete or keep flow as appropriate, reply with a graceful message + app link; never crash the webhook path |
| `WHATSAPP_WRITE_ACTIONS_ENABLED` false | `start_*` tools absent; assistant stays read-only |
| Landlord without AI plan starts a write | Static needs-plan reply (same as the assistant gate) before the flow starts |

### 9. Configuration

- `WHATSAPP_WRITE_ACTIONS_ENABLED` (default `false`): master switch for the two write flows and the `start_*` tools. Marketplace search is governed only by `WHATSAPP_ASSISTANT_ENABLED`.
- Reuses `config.web.baseUrl`, the Meta send path, and the existing assistant rate limiter and plan gate.

## Out of scope for v1

- Editing or deleting properties, units, tenants, or leases from chat (create only).
- Bulk operations (adding many units/tenants in one flow beyond the unit count).
- Per-unit distinct rents at property creation (one default rent; tweak per unit in the app).
- Write actions for tenants (tenants get marketplace search and the existing read tools only).
- Guests using search or writes (registered users only).
- Recording arbitrary standalone payments or issuing invoices from chat (only the add-tenant upfront-payment path).

## Testing (manual, no test runner)

1. Marketplace search: as each registered role, search by state/city/type/price/bedrooms/keyword; confirm top-5 results with working listing links; confirm an unregistered number does NOT get the tool (still gets the register reply).
2. Add property happy path: full flow to a created property with the right unit count and default rent; confirm the deep link opens it; confirm nothing is created until YES.
3. Add property validation: bad unit count, bad amount, `cancel` mid-flow, TTL expiry.
4. Add tenant happy path (landlord): property/unit pick, contact, rent, dates (accept default end), fees compound prompt, active-now with an upfront payment; confirm the lease, invoice/receipt, and notification all fire; confirm the deep link.
5. Add tenant as an agent: `canAddTenant` agent sees only the landlord's properties/units and the lease is created under the landlord; an agent without `canAddTenant` cannot start the flow.
6. Add tenant edge: no vacant units; invitation path (move-in = NO); SKIP fees; SKIP payment.
7. Confirm-before-commit: replying anything other than YES at the summary never writes.
8. Flag off: `WHATSAPP_WRITE_ACTIONS_ENABLED=false` leaves the assistant read-only; search still works.
9. Amount parsing: `800k`, `800,000`, `₦800000`, `1.2m` all parse identically; garbage re-prompts.
