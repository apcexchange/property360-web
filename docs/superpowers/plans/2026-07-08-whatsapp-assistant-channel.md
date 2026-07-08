# WhatsApp Assistant Channel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let tenants, landlords, and agents chat with the existing platform assistant over WhatsApp: inbound Meta Cloud API webhook, identity by `whatsappVerified` phone, read-only answers plus web links.

**Architecture:** A thin channel adapter over the existing `AssistantService` tool-calling loop. Meta posts inbound messages to `/webhooks/whatsapp` (signature-verified against the raw body); a new `WhatsAppAssistantService` resolves the sender to a User by verified WhatsApp number, applies rate limits and the landlord AI-plan gate, runs `AssistantService.ask()` with a WhatsApp channel marker, renders `[[action:key]]` results as absolute web URLs, and replies with free-form text via a new Meta-only `sendWhatsAppText`. Agents become a supported assistant role via a new read-only `agentTools.ts` scoped by `LandlordAgent` assignments. Spec: `docs/superpowers/specs/2026-07-06-whatsapp-assistant-channel-design.md`.

**Tech Stack:** Express 5 + TypeScript + Mongoose (backend only; no mobile/web changes), Meta WhatsApp Cloud API (Graph `v25.0`), existing OpenAI-compatible assistant loop.

**Testing convention:** This repo has NO test runner (CLAUDE.md convention, overrides TDD). Every task verifies with `npm run build` in `backend/` (tsc; `npm run lint` is broken repo-wide, skip it). Task 8 is the mandatory manual end-to-end pass.

**Repo/branch:** `backend/` is its own nested git repo, currently on `feat/wallet-dva`. Run git from inside `backend/`, commit ONLY the files each task lists, with `--no-verify`.

**Style:** No em dashes or en dashes in any new comment, string, or user-facing copy; use commas, colons, or parentheses.

**Live values already available (from the 2026-07-08 Meta setup):** production number +234 902 778 8838, `META_WHATSAPP_PHONE_NUMBER_ID=1120489487821812`, permanent token and `META_WHATSAPP_API_VERSION=v25.0` in `backend/.env.dev`. The webhook secrets (`WHATSAPP_APP_SECRET` from the app dashboard, self-chosen `WHATSAPP_VERIFY_TOKEN`) are set during Task 8.

---

## File Structure

| File | Change | Responsibility |
| --- | --- | --- |
| `src/config/index.ts` | Modify | `whatsapp.assistant` config block (flag, secrets, rate limits) |
| `.env.example`, `.env.prod.example` | Modify | Document new env vars |
| `render.yaml` (repo root of backend repo if present; else skip) | Modify | Declare non-secret vars, `sync: false` for secrets |
| `src/models/WhatsAppInbound.ts` | Create | Webhook dedup record (wamid, TTL) |
| `src/models/AssistantMessage.ts` | Modify | Optional `channel` field |
| `src/models/index.ts` | Modify | Export WhatsAppInbound |
| `src/services/WhatsAppService.ts` | Modify | `sendWhatsAppText` + `markWhatsAppMessageRead` (Meta only) + chunking |
| `src/services/assistant/tools/agentTools.ts` | Create | Read-only agent toolset, assignment-scoped |
| `src/services/assistant/tools/index.ts` | Modify | Register agent tools for `UserRole.AGENT` |
| `src/services/AssistantService.ts` | Modify | Admit AGENT, per-turn channel marker, persist channel |
| `src/routes/assistant.ts` | Modify | Admit AGENT on the existing REST endpoints |
| `src/services/WhatsAppAssistantService.ts` | Create | Orchestrator: identity, dedup, rate limit, gate, ask, render, send |
| `src/controllers/WhatsAppWebhookController.ts` | Create | GET verify handshake + POST signature check and dispatch |
| `src/app.ts` | Modify | Capture raw request body for signature verification |
| `src/routes/index.ts` | Modify | Mount `/webhooks/whatsapp` |

---

### Task 1: Config and env plumbing

**Files:**
- Modify: `backend/src/config/index.ts` (inside the existing `whatsapp` block, after `dryRun`)
- Modify: `backend/.env.example`
- Modify: `backend/.env.prod.example`

- [ ] **Step 1: Add the assistant config block**

In `backend/src/config/index.ts`, find:

```ts
    enabled: (process.env.WHATSAPP_ENABLED ?? 'true').toLowerCase() === 'true',
    dryRun: (process.env.WHATSAPP_DRY_RUN ?? 'true').toLowerCase() === 'true',
```

Replace with:

```ts
    enabled: (process.env.WHATSAPP_ENABLED ?? 'true').toLowerCase() === 'true',
    dryRun: (process.env.WHATSAPP_DRY_RUN ?? 'true').toLowerCase() === 'true',
    // Two-way WhatsApp assistant channel (Meta Cloud API webhook adapter).
    // Independent of the template-notification pipeline above: the assistant
    // replies inside the 24h service window (free), so tier/pref gates for
    // templates do not apply here.
    assistant: {
      enabled:
        (process.env.WHATSAPP_ASSISTANT_ENABLED ?? 'false').toLowerCase() === 'true',
      // Meta app secret: verifies X-Hub-Signature-256 on inbound webhooks.
      appSecret: process.env.WHATSAPP_APP_SECRET || '',
      // Self-chosen token echoed back during Meta's GET subscribe handshake.
      verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
      // Per-user inbound rate limits: the only variable cost is LLM tokens.
      maxPerMinute: parseInt(process.env.WHATSAPP_ASSISTANT_MAX_PER_MINUTE || '10', 10),
      maxPerDay: parseInt(process.env.WHATSAPP_ASSISTANT_MAX_PER_DAY || '50', 10),
    },
```

- [ ] **Step 2: Document env vars**

Append to `backend/.env.example` (and the same block to `backend/.env.prod.example`):

```
# WhatsApp assistant channel (Meta Cloud API webhook adapter)
# Master switch: keep false until the webhook is configured in the Meta app.
WHATSAPP_ASSISTANT_ENABLED=false
# App dashboard > Settings > Basic > App secret. Verifies webhook signatures.
WHATSAPP_APP_SECRET=
# Self-chosen random string; must match the value entered in the Meta app's
# webhook configuration screen.
WHATSAPP_VERIFY_TOKEN=
# Optional rate-limit overrides (defaults 10/min, 50/day per user).
# WHATSAPP_ASSISTANT_MAX_PER_MINUTE=10
# WHATSAPP_ASSISTANT_MAX_PER_DAY=50
```

- [ ] **Step 3: Build**

Run: `cd /Users/peter/Desktop/project/dev/property360/backend && npm run build`
Expected: success.

- [ ] **Step 4: Commit (from inside backend/)**

```bash
git add src/config/index.ts .env.example .env.prod.example
git commit -m "feat(whatsapp-assistant): config and env plumbing" --no-verify
```

---

### Task 2: Models (WhatsAppInbound dedup + AssistantMessage channel)

**Files:**
- Create: `backend/src/models/WhatsAppInbound.ts`
- Modify: `backend/src/models/AssistantMessage.ts`
- Modify: `backend/src/models/index.ts`

- [ ] **Step 1: Create the dedup model**

Create `backend/src/models/WhatsAppInbound.ts`:

```ts
import { Schema, model, Document } from 'mongoose';

/**
 * One row per processed inbound WhatsApp message. Meta retries webhook
 * deliveries, so the unique index on `wamid` is the dedup mechanism: the
 * processor INSERTs first and treats a duplicate-key error as "already
 * handled, skip". Rows expire after 7 days (far beyond Meta's retry window).
 */
export interface IWhatsAppInbound extends Document {
  wamid: string; // Meta's globally-unique inbound message id
  waId: string; // sender's WhatsApp number, digits-only E.164
  receivedAt: Date;
}

const whatsAppInboundSchema = new Schema<IWhatsAppInbound>({
  wamid: { type: String, required: true, unique: true },
  waId: { type: String, required: true },
  receivedAt: { type: Date, required: true, default: Date.now },
});

whatsAppInboundSchema.index(
  { receivedAt: 1 },
  { expireAfterSeconds: 7 * 24 * 60 * 60 }
);

export const WhatsAppInbound = model<IWhatsAppInbound>(
  'WhatsAppInbound',
  whatsAppInboundSchema
);
export default WhatsAppInbound;
```

- [ ] **Step 2: Add `channel` to AssistantMessage**

In `backend/src/models/AssistantMessage.ts`, in the interface, find:

```ts
  // Navigable actions surfaced under an assistant reply (buttons / deep links).
  actions?: IAssistantAction[];
```

Replace with:

```ts
  // Navigable actions surfaced under an assistant reply (buttons / deep links).
  actions?: IAssistantAction[];
  // Which surface the turn happened on. Undefined means 'app' (pre-existing
  // rows). History is shared across surfaces; this field is for analytics.
  channel?: 'app' | 'whatsapp';
```

And in the schema, find:

```ts
    actions: { type: [assistantActionSchema], default: undefined },
```

Replace with:

```ts
    actions: { type: [assistantActionSchema], default: undefined },
    channel: { type: String, enum: ['app', 'whatsapp'] },
```

- [ ] **Step 3: Export from the models index**

In `backend/src/models/index.ts`, add alongside the existing exports:

```ts
export { WhatsAppInbound } from './WhatsAppInbound';
```

- [ ] **Step 4: Build**

Run: `cd /Users/peter/Desktop/project/dev/property360/backend && npm run build`
Expected: success.

- [ ] **Step 5: Commit**

```bash
git add src/models/WhatsAppInbound.ts src/models/AssistantMessage.ts src/models/index.ts
git commit -m "feat(whatsapp-assistant): inbound dedup model and message channel field" --no-verify
```

---

### Task 3: Free-form Meta sends (sendWhatsAppText, markWhatsAppMessageRead)

**Files:**
- Modify: `backend/src/services/WhatsAppService.ts`

These are standalone exported functions, NOT part of the provider abstraction: the assistant channel is Meta-only by spec, regardless of which provider sends notification templates.

- [ ] **Step 1: Add the functions**

In `backend/src/services/WhatsAppService.ts`, after the existing provider classes and before the main service class (or at the end of the file if that reads cleaner), add:

```ts
// ─── Assistant channel: free-form sends (Meta Cloud API only) ─────────────

const WHATSAPP_TEXT_LIMIT = 4096;

/**
 * Split a reply at WhatsApp's 4096-char text limit, preferring paragraph
 * boundaries so chunks read naturally. The channel marker keeps replies far
 * below the limit; this is a safety net, not a formatting feature.
 */
export function chunkWhatsAppText(text: string): string[] {
  const trimmed = text.trim();
  if (trimmed.length <= WHATSAPP_TEXT_LIMIT) return [trimmed];
  const chunks: string[] = [];
  let rest = trimmed;
  while (rest.length > WHATSAPP_TEXT_LIMIT) {
    let cut = rest.lastIndexOf('\n\n', WHATSAPP_TEXT_LIMIT);
    if (cut < WHATSAPP_TEXT_LIMIT / 2) cut = rest.lastIndexOf('\n', WHATSAPP_TEXT_LIMIT);
    if (cut < WHATSAPP_TEXT_LIMIT / 2) cut = rest.lastIndexOf(' ', WHATSAPP_TEXT_LIMIT);
    if (cut < WHATSAPP_TEXT_LIMIT / 2) cut = WHATSAPP_TEXT_LIMIT;
    chunks.push(rest.slice(0, cut).trim());
    rest = rest.slice(cut).trim();
  }
  if (rest) chunks.push(rest);
  return chunks;
}

/**
 * Send free-form text from the business number. Only permitted inside Meta's
 * 24h customer service window, which always applies for assistant replies
 * because the user messages first. Service messages are free.
 */
export async function sendWhatsAppText(
  phoneE164DigitsOnly: string,
  text: string
): Promise<{ ok: boolean; reason?: string }> {
  const { phoneNumberId, accessToken, apiVersion } = config.whatsapp.meta;
  if (!phoneNumberId || !accessToken) {
    console.warn('[WhatsApp Assistant] Meta credentials missing, cannot send.');
    return { ok: false, reason: 'meta_not_configured' };
  }
  const url = `${META_GRAPH_BASE}/${apiVersion}/${phoneNumberId}/messages`;
  try {
    for (const body of chunkWhatsAppText(text)) {
      await axios.post(
        url,
        { messaging_product: 'whatsapp', to: phoneE164DigitsOnly, type: 'text', text: { body } },
        {
          timeout: 10_000,
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    }
    return { ok: true };
  } catch (err) {
    const ax = err as AxiosError<{ error?: { message?: string } }>;
    console.error(
      '[WhatsApp Assistant] sendText failed:',
      ax.response?.status,
      ax.response?.data ?? ax.message
    );
    return { ok: false, reason: ax.response?.data?.error?.message || ax.message };
  }
}

/**
 * Best-effort mark-as-read plus typing indicator on the inbound message.
 * Pure UX nicety: failures are logged and swallowed.
 */
export async function markWhatsAppMessageRead(wamid: string): Promise<void> {
  const { phoneNumberId, accessToken, apiVersion } = config.whatsapp.meta;
  if (!phoneNumberId || !accessToken) return;
  const url = `${META_GRAPH_BASE}/${apiVersion}/${phoneNumberId}/messages`;
  try {
    await axios.post(
      url,
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: wamid,
        typing_indicator: { type: 'text' },
      },
      {
        timeout: 10_000,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    const ax = err as AxiosError;
    console.warn('[WhatsApp Assistant] mark-read failed:', ax.response?.status ?? ax.message);
  }
}
```

Notes for the implementer: `config`, `axios`, `AxiosError`, and `META_GRAPH_BASE` are already imported/defined at the top of this file. If the `typing_indicator` field is rejected by the API version in use, remove ONLY that field and keep `status: 'read'`; do not fail the flow over it.

- [ ] **Step 2: Build**

Run: `cd /Users/peter/Desktop/project/dev/property360/backend && npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/services/WhatsAppService.ts
git commit -m "feat(whatsapp-assistant): free-form Meta text sends with chunking" --no-verify
```

---

### Task 4: Agent toolset (read-only, assignment-scoped)

**Files:**
- Create: `backend/src/services/assistant/tools/agentTools.ts`

Design rules baked into every handler: identity comes from `ctx` only; every query is scoped to properties inside the agent's ACTIVE, ACCEPTED `LandlordAgent` assignments; permission-gated tools return a structured `notPermitted` result (never throw) so the model can relay it politely.

- [ ] **Step 1: Create the file**

Create `backend/src/services/assistant/tools/agentTools.ts`:

```ts
import { Types } from 'mongoose';
import type { AssistantTool, ToolContext } from './types';
import { AgentInvitationStatus } from '../../../types';
import { LandlordAgent, Property, Unit, Lease, Invoice, Transaction } from '../../../models';

/**
 * Read-only tools for property managers (agents). Scope model: an agent may
 * only see data for properties listed on an ACTIVE + ACCEPTED LandlordAgent
 * assignment, and payment-flavored tools additionally require the
 * assignment's canViewPayments flag. Mirrors checkAgentPermission semantics
 * (see src/middleware/agentPermission.ts) in read-only form.
 */

interface AssignmentScope {
  landlordName: string;
  landlordId: string;
  propertyIds: Types.ObjectId[];
  permissions: Record<string, boolean>;
}

async function activeAssignments(ctx: ToolContext): Promise<AssignmentScope[]> {
  const assignments = await LandlordAgent.find({
    agent: ctx.userId,
    status: AgentInvitationStatus.ACCEPTED,
    isActive: true,
  })
    .populate('landlord', 'firstName lastName')
    .lean();
  return assignments.map((a) => {
    const landlord = a.landlord as unknown as {
      _id: Types.ObjectId;
      firstName?: string;
      lastName?: string;
    };
    return {
      landlordName: `${landlord?.firstName ?? ''} ${landlord?.lastName ?? ''}`.trim() || 'Landlord',
      landlordId: String(landlord?._id ?? ''),
      propertyIds: (a.properties ?? []) as Types.ObjectId[],
      permissions: (a.permissions ?? {}) as unknown as Record<string, boolean>,
    };
  });
}

/** All property ids the agent manages, optionally requiring a permission flag. */
function scopedPropertyIds(scopes: AssignmentScope[], flag?: string): Types.ObjectId[] {
  return scopes
    .filter((s) => (flag ? s.permissions[flag] === true : true))
    .flatMap((s) => s.propertyIds);
}

const NOT_PERMITTED = {
  notPermitted: true,
  message:
    'The landlord has not granted you this permission on any assigned property. Ask them to update your manager permissions.',
};

const NO_ASSIGNMENTS = {
  noAssignments: true,
  message: 'You have no active property assignments yet.',
};

const myAssignmentsTool: AssistantTool = {
  definition: {
    type: 'function',
    function: {
      name: 'get_my_assignments',
      description:
        'List the landlords this manager works for, the properties assigned, and which permissions each landlord granted (view payments, view reports, add tenant, record payment, manage maintenance, etc.).',
      parameters: { type: 'object', additionalProperties: false, properties: {} },
    },
  },
  handler: async (ctx) => {
    const scopes = await activeAssignments(ctx);
    if (scopes.length === 0) return NO_ASSIGNMENTS;
    const withNames = await Promise.all(
      scopes.map(async (s) => {
        const props = await Property.find({ _id: { $in: s.propertyIds } })
          .select('name address.city')
          .lean();
        return {
          landlord: s.landlordName,
          permissions: s.permissions,
          properties: props.map((p) => ({ id: String(p._id), name: p.name, city: p.address?.city })),
        };
      })
    );
    return { count: withNames.length, assignments: withNames };
  },
};

const managedPropertiesTool: AssistantTool = {
  definition: {
    type: 'function',
    function: {
      name: 'list_managed_properties',
      description:
        'List all properties this manager is assigned to, with unit counts and occupancy. Use the returned id with the other tools.',
      parameters: { type: 'object', additionalProperties: false, properties: {} },
    },
  },
  handler: async (ctx) => {
    const scopes = await activeAssignments(ctx);
    if (scopes.length === 0) return NO_ASSIGNMENTS;
    const ids = scopedPropertyIds(scopes);
    const props = await Property.find({ _id: { $in: ids }, isActive: true })
      .select('name address propertyType')
      .lean();
    const result = await Promise.all(
      props.map(async (p) => {
        const [total, occupied] = await Promise.all([
          Unit.countDocuments({ property: p._id }),
          Unit.countDocuments({ property: p._id, isOccupied: true }),
        ]);
        return {
          id: String(p._id),
          name: p.name,
          address: `${p.address?.street ?? ''}, ${p.address?.city ?? ''}`.replace(/^, /, ''),
          type: p.propertyType,
          totalUnits: total,
          occupiedUnits: occupied,
          vacantUnits: total - occupied,
        };
      })
    );
    return { count: result.length, properties: result };
  },
};

const managedTenantsTool: AssistantTool = {
  definition: {
    type: 'function',
    function: {
      name: 'list_managed_tenants',
      description:
        'List active tenants (name, unit, rent, lease end date) on the properties this manager is assigned to. Optionally filter to one property by id.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          propertyId: {
            type: 'string',
            description: 'Optional property id from list_managed_properties.',
          },
        },
      },
    },
  },
  handler: async (ctx, args) => {
    const scopes = await activeAssignments(ctx);
    if (scopes.length === 0) return NO_ASSIGNMENTS;
    let ids = scopedPropertyIds(scopes).map(String);
    const filter = typeof args.propertyId === 'string' ? args.propertyId : undefined;
    if (filter) {
      if (!ids.includes(filter)) {
        return { error: 'That property is not in your assignments.' };
      }
      ids = [filter];
    }
    const leases = await Lease.find({ property: { $in: ids }, status: 'active' })
      .populate('tenant', 'firstName lastName phone')
      .populate('unit', 'unitNumber')
      .populate('property', 'name')
      .sort({ endDate: 1 })
      .limit(50)
      .lean();
    return {
      count: leases.length,
      tenants: leases.map((l) => {
        const tenant = l.tenant as unknown as { firstName?: string; lastName?: string };
        const unit = l.unit as unknown as { unitNumber?: string };
        const property = l.property as unknown as { name?: string };
        return {
          tenant: `${tenant?.firstName ?? ''} ${tenant?.lastName ?? ''}`.trim(),
          property: property?.name,
          unit: unit?.unitNumber,
          rentAmount: l.rentAmount,
          paymentFrequency: l.paymentFrequency,
          leaseEnds: l.endDate,
        };
      }),
    };
  },
};

const managedPaymentsTool: AssistantTool = {
  definition: {
    type: 'function',
    function: {
      name: 'list_managed_payments',
      description:
        'Recent completed payments on properties where the landlord granted the view-payments permission. Optionally filter to one property by id.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          propertyId: {
            type: 'string',
            description: 'Optional property id from list_managed_properties.',
          },
          limit: { type: 'integer', description: 'How many payments (1-50, default 15).' },
        },
      },
    },
  },
  handler: async (ctx, args) => {
    const scopes = await activeAssignments(ctx);
    if (scopes.length === 0) return NO_ASSIGNMENTS;
    let ids = scopedPropertyIds(scopes, 'canViewPayments').map(String);
    if (ids.length === 0) return NOT_PERMITTED;
    const filter = typeof args.propertyId === 'string' ? args.propertyId : undefined;
    if (filter) {
      if (!ids.includes(filter)) {
        return { error: 'That property is not in your view-payments assignments.' };
      }
      ids = [filter];
    }
    const limit = Math.min(Math.max(Number(args.limit) || 15, 1), 50);
    const leases = await Lease.find({ property: { $in: ids } }).select('_id').lean();
    const txns = await Transaction.find({
      lease: { $in: leases.map((l) => l._id) },
      status: 'completed',
    })
      .populate('tenant', 'firstName lastName')
      .sort({ paymentDate: -1 })
      .limit(limit)
      .lean();
    return {
      count: txns.length,
      payments: txns.map((t) => {
        const tenant = t.tenant as unknown as { firstName?: string; lastName?: string };
        return {
          tenant: `${tenant?.firstName ?? ''} ${tenant?.lastName ?? ''}`.trim(),
          amount: t.amount,
          type: t.type,
          method: t.paymentMethod,
          paidAt: t.paymentDate,
        };
      }),
    };
  },
};

const managedArrearsTool: AssistantTool = {
  definition: {
    type: 'function',
    function: {
      name: 'get_managed_arrears',
      description:
        'Outstanding (sent, partially paid, or overdue) invoices on properties where the landlord granted the view-payments permission: who owes what, per property.',
      parameters: { type: 'object', additionalProperties: false, properties: {} },
    },
  },
  handler: async (ctx) => {
    const scopes = await activeAssignments(ctx);
    if (scopes.length === 0) return NO_ASSIGNMENTS;
    const ids = scopedPropertyIds(scopes, 'canViewPayments');
    if (ids.length === 0) return NOT_PERMITTED;
    const invoices = await Invoice.find({
      property: { $in: ids },
      status: { $in: ['sent', 'partially_paid', 'overdue'] },
    })
      .populate('tenant', 'firstName lastName')
      .populate('property', 'name')
      .sort({ dueDate: 1 })
      .limit(50)
      .lean();
    const totalOutstanding = invoices.reduce((sum, i) => sum + (i.amountDue ?? 0), 0);
    return {
      count: invoices.length,
      totalOutstanding,
      invoices: invoices.map((i) => {
        const tenant = i.tenant as unknown as { firstName?: string; lastName?: string };
        const property = i.property as unknown as { name?: string };
        return {
          tenant: `${tenant?.firstName ?? ''} ${tenant?.lastName ?? ''}`.trim(),
          property: property?.name,
          status: i.status,
          amountDue: i.amountDue,
          dueDate: i.dueDate,
        };
      }),
    };
  },
};

export const agentTools: AssistantTool[] = [
  myAssignmentsTool,
  managedPropertiesTool,
  managedTenantsTool,
  managedPaymentsTool,
  managedArrearsTool,
];
```

Implementer checkpoint: before building, confirm against the actual model files that `Invoice` has `amountDue`, `dueDate`, `status` values `sent | partially_paid | overdue`, `Transaction` has `paymentDate`, `paymentMethod`, `status: 'completed'`, and `LandlordAgent` has `properties`, `permissions`, `status`, `isActive` (all verified against `src/types/index.ts` at planning time; adjust only if the models drifted). If `Invoice.dueDate` does not exist at the top level, check the interface and use the actual due-date field.

- [ ] **Step 2: Build**

Run: `cd /Users/peter/Desktop/project/dev/property360/backend && npm run build`
Expected: success. (The file is not imported anywhere yet; that is Task 5.)

- [ ] **Step 3: Commit**

```bash
git add src/services/assistant/tools/agentTools.ts
git commit -m "feat(assistant): read-only agent toolset scoped by assignments" --no-verify
```

---

### Task 5: Assistant core wiring (admit agents, channel marker, persist channel)

**Files:**
- Modify: `backend/src/services/assistant/tools/index.ts`
- Modify: `backend/src/services/AssistantService.ts`
- Modify: `backend/src/routes/assistant.ts`

- [ ] **Step 1: Register agent tools**

In `backend/src/services/assistant/tools/index.ts`, add the import:

```ts
import { agentTools } from './agentTools';
```

and in `toolsForRole`, find:

```ts
  if (role === UserRole.LANDLORD) return [...landlordTools, helpTool];
  if (role === UserRole.TENANT) return [...tenantTools, helpTool];
  return [helpTool];
```

Replace with:

```ts
  if (role === UserRole.LANDLORD) return [...landlordTools, helpTool];
  if (role === UserRole.TENANT) return [...tenantTools, helpTool];
  if (role === UserRole.AGENT) return [...agentTools, helpTool];
  return [helpTool];
```

- [ ] **Step 2: AssistantService: admit agents, add channel**

In `backend/src/services/AssistantService.ts`:

2a. Add the channel type near the top (after the `AssistantReply` interface):

```ts
export type AssistantChannel = 'app' | 'whatsapp';
```

2b. Change `prepareTurn`'s signature and role gate. Find:

```ts
  private async prepareTurn(
    ctx: ToolContext,
    userText: string
  ): Promise<{ text: string; messages: ChatCompletionMessageParam[] }> {
    const text = userText?.trim();
    if (!text) throw new AppError('Message text is required', 400);
    if (ctx.role !== UserRole.TENANT && ctx.role !== UserRole.LANDLORD) {
      throw new AppError('The assistant is available to tenants and landlords', 403);
    }

    await AssistantMessage.create({ user: ctx.userId, role: 'user', content: text });
```

Replace with:

```ts
  private async prepareTurn(
    ctx: ToolContext,
    userText: string,
    channel: AssistantChannel = 'app'
  ): Promise<{ text: string; messages: ChatCompletionMessageParam[] }> {
    const text = userText?.trim();
    if (!text) throw new AppError('Message text is required', 400);
    if (
      ctx.role !== UserRole.TENANT &&
      ctx.role !== UserRole.LANDLORD &&
      ctx.role !== UserRole.AGENT
    ) {
      throw new AppError(
        'The assistant is available to tenants, landlords, and managers',
        403
      );
    }

    await AssistantMessage.create({ user: ctx.userId, role: 'user', content: text, channel });
```

2c. Update the per-turn system markers. Find:

```ts
      // Per-turn role marker (kept out of the cached prefix). Tells the model
      // which action keys it may emit and whether to use /app or /me paths.
      { role: 'system', content: `CURRENT USER ROLE: ${ctx.role}. Only use ${ctx.role} action keys.` },
```

Replace with:

```ts
      // Per-turn role + channel markers (kept out of the cached prefix).
      {
        role: 'system',
        content:
          ctx.role === UserRole.AGENT
            ? 'CURRENT USER ROLE: agent (property manager acting for landlords). ' +
              'No action keys exist for agents: never emit [[action:...]] tags. ' +
              'Only answer from agent tools; permissions are per landlord assignment.'
            : `CURRENT USER ROLE: ${ctx.role}. Only use ${ctx.role} action keys.`,
      },
      ...(channel === 'whatsapp'
        ? [
            {
              role: 'system' as const,
              content:
                'CHANNEL: whatsapp. Keep replies short (under 600 characters when possible), ' +
                'plain text only, no tables. Links you are given render as tappable URLs.',
            },
          ]
        : []),
```

2d. Thread the channel through `ask` and persist it on the assistant turn. Change the `ask` signature from:

```ts
  async ask(ctx: ToolContext, userText: string): Promise<AssistantReply> {
    const { messages } = await this.prepareTurn(ctx, userText);
```

to:

```ts
  async ask(
    ctx: ToolContext,
    userText: string,
    channel: AssistantChannel = 'app'
  ): Promise<AssistantReply> {
    const { messages } = await this.prepareTurn(ctx, userText, channel);
```

and at the end of `ask`, find:

```ts
    await AssistantMessage.create({
      user: ctx.userId,
      role: 'assistant',
      content: clean,
      actions: actions.length ? actions : undefined,
    });
```

Replace with:

```ts
    await AssistantMessage.create({
      user: ctx.userId,
      role: 'assistant',
      content: clean,
      actions: actions.length ? actions : undefined,
      channel,
    });
```

(`askStream` stays app-only: leave its `prepareTurn(ctx, userText)` call and its final `AssistantMessage.create` untouched; the default parameter keeps both compiling with `channel: 'app'` semantics.)

- [ ] **Step 3: Admit agents on the existing REST routes**

In `backend/src/routes/assistant.ts`, find both:

```ts
  authorize(UserRole.TENANT, UserRole.LANDLORD),
```

Replace both occurrences with:

```ts
  authorize(UserRole.TENANT, UserRole.LANDLORD, UserRole.AGENT),
```

and update the comment above the routes from "Tenants and landlords only (agents deferred to a later phase)." to:

```ts
// Tenants, landlords, and agents. requireAiAccess gates message generation
// to Pro+ for landlords; tenants and agents pass through ungated (agents act
// across multiple landlords, so no single subscription owns their session).
```

- [ ] **Step 4: Build**

Run: `cd /Users/peter/Desktop/project/dev/property360/backend && npm run build`
Expected: success. Note: `resolveActions(keys, UserRole.AGENT)` already returns `[]` (defsForRole has no agent branch), so agent replies simply carry no actions; no change needed in `actions.ts`.

- [ ] **Step 5: Commit**

```bash
git add src/services/assistant/tools/index.ts src/services/AssistantService.ts src/routes/assistant.ts
git commit -m "feat(assistant): admit agent role and channel-aware turns" --no-verify
```

---

### Task 6: WhatsAppAssistantService (the orchestrator)

**Files:**
- Create: `backend/src/services/WhatsAppAssistantService.ts`

- [ ] **Step 1: Create the service**

Create `backend/src/services/WhatsAppAssistantService.ts`:

```ts
import { config } from '../config';
import { User, WhatsAppInbound } from '../models';
import { UserRole, IUser } from '../types';
import AssistantService from './AssistantService';
import SubscriptionService from './SubscriptionService';
import { sendWhatsAppText, markWhatsAppMessageRead } from './WhatsAppService';

/**
 * Orchestrates one inbound WhatsApp message end to end: dedup, identity,
 * rate limit, plan gate, assistant call, reply rendering, send. Invoked
 * fire-and-forget from the webhook controller AFTER the 200 has been sent,
 * so nothing here may throw uncaught: every failure path replies (or logs)
 * and returns.
 */

const REPLY_UNKNOWN_NUMBER =
  'Hi! This number is not linked to a Property360 account. ' +
  `Create one at ${config.web.baseUrl} and verify your WhatsApp in the app, ` +
  'then message me here for instant answers about your properties or tenancy.';

const REPLY_NOT_WHATSAPP_VERIFIED =
  'Hi! For your security, verify your WhatsApp in the Property360 app first: ' +
  'open the app, go to your profile, choose Verify phone, and pick WhatsApp. ' +
  'Once verified, message me here and I can answer questions about your account.';

const REPLY_MULTIPLE_ACCOUNTS =
  'This number is linked to more than one Property360 account, so I cannot ' +
  'tell who is asking. Please contact support at hello@property360.africa.';

const REPLY_RATE_LIMITED =
  'You have sent quite a few messages in a short time. Please wait a bit and try again.';

const REPLY_TEXT_ONLY =
  'I can only read text messages for now. Please type your question.';

const REPLY_ERROR =
  "Sorry, I could not finish that. Please try rephrasing, or check the app.";

const REPLY_NEEDS_PLAN =
  'The AI assistant needs an active Pro plan or above. Manage your plan at ' +
  `${config.web.baseUrl}/billing and message me again afterwards.`;

// ─── In-memory sliding-window rate limiter ────────────────────────────────
// Single Render instance by deployment invariant (see CLAUDE.md), so
// in-memory is fine; a restart resetting counters is acceptable.
const sendTimestamps = new Map<string, number[]>();

function isRateLimited(waId: string): boolean {
  const now = Date.now();
  const dayAgo = now - 24 * 60 * 60 * 1000;
  const minuteAgo = now - 60 * 1000;
  const stamps = (sendTimestamps.get(waId) ?? []).filter((t) => t > dayAgo);
  const lastMinute = stamps.filter((t) => t > minuteAgo).length;
  const limited =
    lastMinute >= config.whatsapp.assistant.maxPerMinute ||
    stamps.length >= config.whatsapp.assistant.maxPerDay;
  if (!limited) stamps.push(now);
  sendTimestamps.set(waId, stamps);
  return limited;
}

/** Normalize a digits-only wa_id (e.g. 2348012345678) to the stored-phone variants. */
function phoneVariants(waId: string): string[] {
  const digits = waId.replace(/\D/g, '');
  const variants = [`+${digits}`, digits];
  if (digits.startsWith('234')) variants.push(`0${digits.slice(3)}`);
  return variants;
}

class WhatsAppAssistantService {
  /**
   * Process one inbound message. `type` is Meta's message type; anything
   * that is not 'text' gets a static reply. Never throws.
   */
  async processInbound(
    waId: string,
    wamid: string,
    type: string,
    text: string | undefined
  ): Promise<void> {
    try {
      // Dedup FIRST: Meta retries deliveries. The unique index makes the
      // insert atomic; a duplicate key means another delivery already won.
      try {
        await WhatsAppInbound.create({ wamid, waId });
      } catch (err) {
        if ((err as { code?: number }).code === 11000) return;
        throw err;
      }

      void markWhatsAppMessageRead(wamid);

      if (type !== 'text' || !text?.trim()) {
        await sendWhatsAppText(waId, REPLY_TEXT_ONLY);
        return;
      }

      const user = await this.resolveUser(waId);
      if (typeof user === 'string') {
        // Static routing outcome: reply and stop, no LLM call.
        await sendWhatsAppText(waId, user);
        return;
      }

      if (isRateLimited(waId)) {
        await sendWhatsAppText(waId, REPLY_RATE_LIMITED);
        return;
      }

      // Landlords need an AI-capable plan, mirroring requireAiAccess on the
      // in-app route. Tenants and agents pass ungated (same as the route).
      if (user.role === UserRole.LANDLORD) {
        const view = await SubscriptionService.getView(String(user._id));
        if (!view.isEntitled || !view.config.canUseAiTemplates) {
          await sendWhatsAppText(waId, REPLY_NEEDS_PLAN);
          return;
        }
      }

      const truncated = text.trim().slice(0, 2000);
      let replyText: string;
      let actionLines = '';
      try {
        const result = await AssistantService.ask(
          { userId: String(user._id), role: user.role },
          truncated,
          'whatsapp'
        );
        replyText = result.reply;
        if (result.actions.length > 0) {
          actionLines =
            '\n\n' +
            result.actions
              .map((a) => `${a.label}: ${config.web.baseUrl}${a.web}`)
              .join('\n');
        }
      } catch (err) {
        console.error('[WhatsApp Assistant] ask() failed:', (err as Error).message);
        replyText = REPLY_ERROR;
      }

      const sent = await sendWhatsAppText(waId, `${replyText}${actionLines}`);
      if (!sent.ok) {
        // One retry, then give up quietly (never crash the webhook path).
        await sendWhatsAppText(waId, `${replyText}${actionLines}`);
      }
    } catch (err) {
      console.error('[WhatsApp Assistant] processInbound failed:', (err as Error).message);
    }
  }

  /**
   * Map a wa_id to exactly one WhatsApp-verified user, or a static reply
   * string describing why not.
   */
  private async resolveUser(waId: string): Promise<IUser | string> {
    const variants = phoneVariants(waId);
    const verified = await User.find({
      phone: { $in: variants },
      whatsappVerified: true,
      isActive: true,
      isDeleted: { $ne: true },
    }).limit(2);

    if (verified.length === 1) return verified[0];
    if (verified.length > 1) {
      console.warn(`[WhatsApp Assistant] multiple verified users for ${waId}`);
      return REPLY_MULTIPLE_ACCOUNTS;
    }

    // No verified match: distinguish "has an account, not WhatsApp-verified"
    // (including SMS-only verification) from "unknown number" for better copy.
    const unverified = await User.exists({
      phone: { $in: variants },
      isActive: true,
      isDeleted: { $ne: true },
    });
    return unverified ? REPLY_NOT_WHATSAPP_VERIFIED : REPLY_UNKNOWN_NUMBER;
  }
}

export default new WhatsAppAssistantService();
```

Implementer checkpoint: confirm `SubscriptionService.getView(ownerId)` returns `{ isEntitled, config: { canUseAiTemplates } }` (it does at planning time, see `src/middleware/subscription.ts:239-248`); if the shape differs, mirror whatever `requireAiAccess` actually checks.

- [ ] **Step 2: Build**

Run: `cd /Users/peter/Desktop/project/dev/property360/backend && npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/services/WhatsAppAssistantService.ts
git commit -m "feat(whatsapp-assistant): inbound orchestrator with identity and gates" --no-verify
```

---

### Task 7: Webhook controller, raw body capture, route

**Files:**
- Modify: `backend/src/app.ts` (line ~61)
- Create: `backend/src/controllers/WhatsAppWebhookController.ts`
- Modify: `backend/src/routes/index.ts`

- [ ] **Step 1: Capture the raw body**

Meta signs the RAW request bytes; re-serializing parsed JSON is not reliable. In `backend/src/app.ts`, find:

```ts
app.use(express.json({ limit: '10mb' }));
```

Replace with:

```ts
app.use(
  express.json({
    limit: '10mb',
    // Keep the raw bytes so webhook handlers (Meta X-Hub-Signature-256) can
    // verify signatures over exactly what was sent, not a re-serialization.
    verify: (req, _res, buf) => {
      (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
    },
  })
);
```

- [ ] **Step 2: Create the controller**

Create `backend/src/controllers/WhatsAppWebhookController.ts`:

```ts
import { Request, Response } from 'express';
import crypto from 'crypto';
import { config } from '../config';
import WhatsAppAssistantService from '../services/WhatsAppAssistantService';

type RawBodyRequest = Request & { rawBody?: Buffer };

/** Shape of the parts of Meta's webhook payload we consume. */
interface MetaWebhookMessage {
  id: string;
  from: string;
  type: string;
  text?: { body?: string };
}

interface MetaWebhookBody {
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: { messages?: MetaWebhookMessage[] };
    }>;
  }>;
}

/**
 * Meta WhatsApp webhook. Mounted on the unauthenticated webhook router (like
 * the Paystack handlers): the signature IS the auth. Two invariants:
 *  - Always answer fast: 200 goes out before any processing.
 *  - Never trust an unsigned payload: bad signature is a 401, full stop.
 */
class WhatsAppWebhookController {
  /** GET /webhooks/whatsapp: Meta's subscribe handshake. */
  verifyWebhook(req: Request, res: Response): void {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (
      mode === 'subscribe' &&
      typeof token === 'string' &&
      config.whatsapp.assistant.verifyToken &&
      token === config.whatsapp.assistant.verifyToken
    ) {
      res.status(200).send(challenge);
      return;
    }
    res.sendStatus(403);
  }

  /** POST /webhooks/whatsapp: inbound messages and status callbacks. */
  handleWebhook(req: RawBodyRequest, res: Response): void {
    const signature = req.headers['x-hub-signature-256'];
    if (!this.signatureValid(req.rawBody, signature)) {
      console.warn('[WhatsApp Webhook] invalid or missing signature');
      res.sendStatus(401);
      return;
    }

    // Ack immediately: Meta retries on slow or non-200 responses.
    res.status(200).json({ received: true });

    if (!config.whatsapp.assistant.enabled) return;

    const body = req.body as MetaWebhookBody;
    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') continue;
        for (const msg of change.value?.messages ?? []) {
          if (!msg?.id || !msg?.from) continue;
          // Fire-and-forget: processInbound never throws. Status callbacks
          // (value.statuses) carry no messages array and are skipped here.
          void WhatsAppAssistantService.processInbound(
            msg.from,
            msg.id,
            msg.type,
            msg.text?.body
          );
        }
      }
    }
  }

  private signatureValid(
    rawBody: Buffer | undefined,
    header: string | string[] | undefined
  ): boolean {
    const secret = config.whatsapp.assistant.appSecret;
    if (!secret || !rawBody || typeof header !== 'string') return false;
    const expected =
      'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(expected);
    const b = Buffer.from(header);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
}

export default new WhatsAppWebhookController();
```

- [ ] **Step 3: Mount the route**

In `backend/src/routes/index.ts`, add the import near the other controller imports:

```ts
import WhatsAppWebhookController from '../controllers/WhatsAppWebhookController';
```

and after the existing Paystack webhook lines, add:

```ts
// Meta WhatsApp assistant webhook. GET is Meta's subscribe handshake; POST
// carries inbound messages, signature-verified in the handler (no JWT).
router.get('/webhooks/whatsapp', (req, res) =>
  WhatsAppWebhookController.verifyWebhook(req, res)
);
router.post('/webhooks/whatsapp', (req, res) =>
  WhatsAppWebhookController.handleWebhook(req, res)
);
```

(The arrow wrappers preserve `this` on the controller's private method; the Paystack handlers use bare references but have no `this` usage.)

- [ ] **Step 4: Build + local handshake smoke test**

Run: `cd /Users/peter/Desktop/project/dev/property360/backend && npm run build`
Expected: success.

Then with the dev server running and `WHATSAPP_VERIFY_TOKEN=testtoken` in `.env.dev`:

```bash
curl -s "http://localhost:5001/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=testtoken&hub.challenge=12345"
```

Expected: `12345`.

```bash
curl -s "http://localhost:5001/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=WRONG&hub.challenge=12345" -o /dev/null -w "%{http_code}"
```

Expected: `403`.

```bash
curl -s -X POST "http://localhost:5001/api/v1/webhooks/whatsapp" -H "Content-Type: application/json" -d '{}' -o /dev/null -w "%{http_code}"
```

Expected: `401` (no signature).

- [ ] **Step 5: Commit**

```bash
git add src/app.ts src/controllers/WhatsAppWebhookController.ts src/routes/index.ts
git commit -m "feat(whatsapp-assistant): signed webhook endpoint and dispatch" --no-verify
```

---

### Task 8: Deploy, Meta webhook config, manual end-to-end

**Prerequisites:** backend deployed with the new code; `WHATSAPP_APP_SECRET` (Meta app dashboard > Settings > Basic), `WHATSAPP_VERIFY_TOKEN` (self-chosen), `META_WHATSAPP_*` values, and `WHATSAPP_ASSISTANT_ENABLED=true` set in the target environment. Real WhatsApp accounts for: a WhatsApp-verified tenant, a WhatsApp-verified landlord (Pro plan), a WhatsApp-verified agent with assignments, a user verified by SMS only, and an unknown number.

- [ ] **Step 1: Configure the webhook in the Meta app.** App dashboard > WhatsApp > Configuration: callback URL `https://api.property360.africa/api/v1/webhooks/whatsapp`, verify token = `WHATSAPP_VERIFY_TOKEN` value. Meta fires the GET handshake; it must succeed. Subscribe to the `messages` field only.
- [ ] **Step 2: Publish the app** (App Mode: Live). Unpublished apps only receive test webhooks.
- [ ] **Step 3: Identity matrix.** From each real account, message the assistant number (+234 902 778 8838) and confirm: verified tenant gets a data-grounded answer; verified landlord (Pro) gets one; landlord without Pro gets the plan message with the billing link; agent gets assignment-scoped answers (ask "who are my landlords" then "show payments" with and without `canViewPayments`); SMS-only-verified user gets the verify-your-WhatsApp reply; unknown number gets the signup reply.
- [ ] **Step 4: Actions render.** As a landlord ask something navigational ("where do I add a tenant"); confirm the reply ends with a working absolute URL line.
- [ ] **Step 5: Non-text.** Send a voice note and an image; expect the text-only reply once each.
- [ ] **Step 6: Rate limit.** Send 11 rapid messages; expect the rate-limit reply on the 11th.
- [ ] **Step 7: Dedup.** In the Meta app dashboard's webhook screen, use "Test" to resend a sample or watch Render logs for a retried delivery; confirm no duplicate replies (log line only).
- [ ] **Step 8: History sharing.** After a WhatsApp exchange, open the in-app assistant as the same user and confirm the WhatsApp turns appear in history.
- [ ] **Step 9: Flag off.** Set `WHATSAPP_ASSISTANT_ENABLED=false`, redeploy or restart, message the number: expect silence (webhook 200s, no processing), and the Meta webhook stays subscribed.
- [ ] **Step 10: Commit any fixes found, one commit per fix.**

---

## Self-Review Notes

- Spec coverage: webhook + handshake + signature + async + dedup (Task 7 + Task 2), identity table incl. SMS-only distinction (Task 6 `resolveUser`), agent tools with permission scoping (Task 4), role gate + channel marker + shared history with channel field (Task 5 + Task 2), action links via `config.web.baseUrl` (Task 6), chunking + mark-read/typing nicety (Task 3), master flag + rate limits + input truncation (Tasks 1 and 6), error table (Task 6 constants + Task 7 401/200 paths), ops prerequisites + publish caveat (Task 8).
- Additions beyond spec, both deliberate: the landlord Pro-plan gate mirrors the in-app `requireAiAccess` so WhatsApp cannot bypass monetization, and REST routes admit agents (the spec's documented side effect made explicit).
- Type consistency: `processInbound(waId, wamid, type, text)` matches the controller call; `sendWhatsAppText`/`markWhatsAppMessageRead` names match between Tasks 3 and 6; `AssistantChannel` matches `AssistantMessage.channel`; `agentTools` export name matches the Task 5 import.
- The spec's "one retry" for failed sends is implemented as a single immediate re-send in Task 6.
