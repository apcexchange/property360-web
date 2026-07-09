# WhatsApp Write Actions and Marketplace Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add two scripted write flows (add property, add tenant) and one read tool (marketplace search) to the live WhatsApp assistant, for registered users only, gated behind a flag.

**Architecture:** Marketplace search is a normal channel-scoped read tool wrapping `ListingService.getListings`. The two writes are deterministic state machines (a `WhatsAppFlow` state doc + `WhatsAppWriteFlowService`) mirroring the WhatsApp onboarding registration flow: the assistant LLM only detects the intent to start (via `start_add_property` / `start_add_tenant` tools) and may pre-fill fields; the state machine owns collection, validation, deterministic amount parsing, the summary-then-YES confirm gate, and commit through the existing services (`PropertyService.createProperty`, `TenantService.assignTenantToUnit`).

**Tech Stack:** Node/Express/TypeScript, Mongoose (TTL index), the existing assistant tool loop + WhatsApp orchestrator.

**Testing convention:** No test runner (`npm test` exits 1). Every task is verified by `cd backend && npm run build` (tsc) plus the listed manual checks. Do not add a test framework.

**Branch:** Backend nested repo `/Users/peter/Desktop/project/dev/property360/backend`, branch `feat/wallet-dva` (same as the onboarding commits). Commit only the specific files each task names, `--no-verify`, no em dashes. Do NOT push; deploy is user-gated.

**Spec:** `docs/superpowers/specs/2026-07-09-whatsapp-write-actions-design.md` — read it for the full design. This plan implements it.

---

## File Structure

**Create:**
- `backend/src/models/WhatsAppFlow.ts` — write-flow state doc (userId-keyed, TTL 30 min).
- `backend/src/services/WhatsAppWriteFlowService.ts` — the two state machines + parsing helpers + commit.
- `backend/src/services/assistant/tools/marketplaceTool.ts` — the `search_marketplace` read tool.
- `backend/src/services/assistant/tools/writeFlowTools.ts` — `start_add_property` / `start_add_tenant`.

**Modify:**
- `backend/src/models/index.ts` — export `WhatsAppFlow`.
- `backend/src/config/index.ts` — add `config.whatsapp.writeActionsEnabled`.
- `backend/src/services/assistant/tools/types.ts` — add optional `channel` to `ToolContext`.
- `backend/src/services/assistant/tools/index.ts` — channel-aware tool selection (add marketplace + start tools on the WhatsApp channel).
- `backend/src/services/AssistantService.ts` — thread `channel` into tool selection + dispatch; set `ctx.channel`.
- `backend/src/services/WhatsAppAssistantService.ts` — active-flow check + post-ask new-flow emission; set `ctx.channel='whatsapp'`.

---

## Task 1: `WhatsAppFlow` model

**Files:** Create `backend/src/models/WhatsAppFlow.ts`; Modify `backend/src/models/index.ts`.

- [ ] **Step 1: Write the model**

```ts
import { Schema, model, Document, Types } from 'mongoose';

/**
 * Server-side state for one active WhatsApp write flow (add property / add
 * tenant). Keyed by the acting userId (unique) because write flows only exist
 * for identified users and the start-tool handler that creates the doc has
 * ctx.userId. TTL 30 min from last activity (each step bumps expiresAt);
 * deleted on commit or cancel. `data` holds fields collected so far; its shape
 * depends on `type` and is validated step by step, so it is loosely typed.
 */
export type WriteFlowType = 'add_property' | 'add_tenant';

export interface IWhatsAppFlow extends Document {
  userId: Types.ObjectId;
  waId: string;
  type: WriteFlowType;
  step: string;
  landlordId?: Types.ObjectId;
  data: Record<string, unknown>;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const whatsAppFlowSchema = new Schema<IWhatsAppFlow>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    waId: { type: String, required: true },
    type: { type: String, required: true },
    step: { type: String, required: true },
    landlordId: { type: Schema.Types.ObjectId, ref: 'User' },
    data: { type: Schema.Types.Mixed, default: {} },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { timestamps: true }
);

export const WhatsAppFlow = model<IWhatsAppFlow>('WhatsAppFlow', whatsAppFlowSchema);
export default WhatsAppFlow;
```

- [ ] **Step 2:** In `backend/src/models/index.ts`, add after the `WhatsAppOnboarding` export:
```ts
export { WhatsAppFlow } from './WhatsAppFlow';
```

- [ ] **Step 3: Build** `cd backend && npm run build` (exit 0).
- [ ] **Step 4: Commit** `git add src/models/WhatsAppFlow.ts src/models/index.ts && git commit --no-verify -m "feat(whatsapp-write): WhatsAppFlow state model"`

---

## Task 2: Config flag

**Files:** Modify `backend/src/config/index.ts`.

- [ ] **Step 1:** Inside the `whatsapp` object, next to the existing `onboarding` block, add:
```ts
    // Master switch for the two WhatsApp write flows (add property, add
    // tenant) and their start_* tools. Default off so marketplace search can
    // ship first and writes flip on independently. Marketplace search is
    // governed only by the assistant master switch.
    writeActionsEnabled:
      (process.env.WHATSAPP_WRITE_ACTIONS_ENABLED ?? 'false').toLowerCase() === 'true',
```
Match the surrounding indentation; ensure the sibling key has a trailing comma.

- [ ] **Step 2: Build** and confirm at runtime: `node -e "const {config}=require('./dist/config'); console.log(config.whatsapp.writeActionsEnabled)"` prints `false` (dotenv banner is fine).
- [ ] **Step 3: Commit** `git add src/config/index.ts && git commit --no-verify -m "feat(whatsapp-write): WHATSAPP_WRITE_ACTIONS_ENABLED flag"`

---

## Task 3: Channel-aware tools + `search_marketplace`

**Files:** Modify `types.ts`, `index.ts` (tools), `AssistantService.ts`; Create `marketplaceTool.ts`.

Context: `ToolContext` is `{ userId, role }`. `AssistantService.ask(ctx, text, channel)` already receives `channel` (`'app' | 'whatsapp'`). `toolDefinitionsForRole(role)` builds definitions; `dispatchTool(ctx, name, args)` resolves and runs a tool within the role's set (see current `tools/index.ts`). `ListingService.getListings(filters)` returns `{ listings: [{ id, listingTitle, bedrooms, rentAmount?, property: { name, address: { city, state }, propertyType } }], meta }` (read it to confirm exact field names before mapping). `config.web.baseUrl` is the web base.

- [ ] **Step 1: Add `channel` to `ToolContext`**

In `tools/types.ts`:
```ts
import type { AssistantChannel } from '../../AssistantService';
```
and add to the `ToolContext` interface:
```ts
  /** Surface the call came from. Some tools are WhatsApp-only. Defaults to app. */
  channel?: AssistantChannel;
```
If importing `AssistantChannel` from `AssistantService` creates a circular import that breaks tsc, instead define `export type AssistantChannel = 'app' | 'whatsapp';` locally in `types.ts` and have `AssistantService` import it from there. Pick whichever compiles; note which you did.

- [ ] **Step 2: Create the marketplace tool**

`backend/src/services/assistant/tools/marketplaceTool.ts`:
```ts
import type { AssistantTool } from './types';
import ListingService from '../../ListingService';
import { config } from '../../../config';

export const marketplaceTool: AssistantTool = {
  definition: {
    type: 'function',
    function: {
      name: 'search_marketplace',
      description:
        'Search the Property360 rental marketplace for available listings. All ' +
        'parameters are optional; combine them to narrow results. Returns up to 5 ' +
        'matches with a tappable link each.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          state: { type: 'string', description: 'Nigerian state, e.g. Lagos' },
          city: { type: 'string', description: 'City or area' },
          propertyType: {
            type: 'string',
            description: 'residential, apartment, house, hostel, shop, commercial, bungalow, or land',
          },
          minPrice: { type: 'number', description: 'Minimum yearly rent (NGN)' },
          maxPrice: { type: 'number', description: 'Maximum yearly rent (NGN)' },
          bedrooms: { type: 'number', description: 'Minimum bedrooms' },
          search: { type: 'string', description: 'Free-text keyword' },
        },
      },
    },
  },
  handler: async (_ctx, args) => {
    const res = await ListingService.getListings({
      state: args.state as string | undefined,
      city: args.city as string | undefined,
      propertyType: args.propertyType as string | undefined,
      minPrice: args.minPrice as number | undefined,
      maxPrice: args.maxPrice as number | undefined,
      bedrooms: args.bedrooms as number | undefined,
      search: args.search as string | undefined,
      page: 1,
      limit: 5,
    });
    // Map to a compact shape the model can relay. Read ListingService.getListings
    // for the exact listing field names and adjust the reads below to match.
    const results = (res.listings ?? []).map((l: any) => ({
      title: l.listingTitle ?? l.property?.name,
      location: [l.property?.address?.city, l.property?.address?.state].filter(Boolean).join(', '),
      rent: l.rentAmount,
      bedrooms: l.bedrooms,
      propertyType: l.property?.propertyType,
      url: `${config.web.baseUrl}/listings/${l.id}`,
    }));
    return {
      count: res.meta?.total ?? results.length,
      results,
      note: results.length === 0 ? 'No listings matched. Suggest broadening the search.' : undefined,
    };
  },
};
```

- [ ] **Step 3: Channel-aware selection in `tools/index.ts`**

Change `toolsForRole` to accept a channel and add the whatsapp-only marketplace tool, and thread it. Keep the existing role security boundary:
```ts
import { marketplaceTool } from './marketplaceTool';
import type { AssistantChannel } from '../../AssistantService';

function toolsForRole(role: UserRole, channel?: AssistantChannel): AssistantTool[] {
  const base =
    role === UserRole.LANDLORD ? [...landlordTools, helpTool]
    : role === UserRole.TENANT ? [...tenantTools, helpTool]
    : role === UserRole.AGENT ? [...agentTools, helpTool]
    : [helpTool];
  if (channel === 'whatsapp' && role !== UserRole.TENANT) {
    // marketplace search is for all three registered roles on WhatsApp
  }
  if (channel === 'whatsapp') base.push(marketplaceTool);
  return base;
}

export function toolDefinitionsForRole(role: UserRole, channel?: AssistantChannel): ChatCompletionTool[] {
  return toolsForRole(role, channel).map((t) => t.definition);
}
```
Update `dispatchTool` to resolve within `toolsForRole(ctx.role, ctx.channel)`:
```ts
  const tool = toolsForRole(ctx.role, ctx.channel).find(...);
```
(Remove the stray no-op `if` block above; it was only a comment marker. Marketplace search is added for every role on WhatsApp.)

- [ ] **Step 4: Thread channel in `AssistantService.ts`**

In `ask()`, pass the channel when building definitions and set it on the ctx used for dispatch. Find `const tools = toolDefinitionsForRole(ctx.role);` and change to `toolDefinitionsForRole(ctx.role, channel)`. Ensure the `ctx` passed to `dispatchTool` carries `channel`: build a local `const toolCtx = { ...ctx, channel };` and pass `toolCtx` to `dispatchTool`. (Confirm `AssistantChannel` is exported from `AssistantService`; it is: `export type AssistantChannel = 'app' | 'whatsapp';`.)

- [ ] **Step 5: Set channel in the orchestrator**

In `WhatsAppAssistantService.ts`, the `AssistantService.ask({ userId: String(user._id), role: user.role }, truncated, 'whatsapp')` call already passes `'whatsapp'` as the channel arg, so no change needed here for search. (The ctx channel is set inside `ask` via `toolCtx`.)

- [ ] **Step 6: Build** `cd backend && npm run build` (exit 0). Fix circular-import issues per Step 1's note if they arise.

- [ ] **Step 7: Manual check (optional, if a dev server is already running):** as a WhatsApp-verified landlord, message "show me 3-bedroom flats in Lagos" and confirm a results reply with listing links. Otherwise rely on the build.

- [ ] **Step 8: Commit** `git add src/services/assistant/tools/types.ts src/services/assistant/tools/marketplaceTool.ts src/services/assistant/tools/index.ts src/services/AssistantService.ts && git commit --no-verify -m "feat(whatsapp-write): channel-aware tools + search_marketplace"`

---

## Task 4: `WhatsAppWriteFlowService` + add-property flow

**Files:** Create `backend/src/services/WhatsAppWriteFlowService.ts`.

This service owns both state machines and the shared parsing helpers. This task implements the scaffold, the helpers, and the **add-property** machine; Task 5 adds add-tenant. Model it on `WhatsAppOnboardingService` (read that file for the shape: `handle`/`advance` methods, `newExpiry`, save-on-each-step, never-throw). Commit for add-property is `PropertyService.createProperty(data)` where `data: { name, description?, address: { street, city, state, postalCode? }, propertyType, units }` (`units` may be a number). Read `PropertyService.createProperty` and its `CreatePropertyData` interface to confirm the exact field names before wiring the commit.

- [ ] **Step 1: Write the service scaffold + helpers + add-property machine**

Key elements (write complete code; abbreviated here to the load-bearing parts):

```ts
import { WhatsAppFlow, User } from '../models';
import type { IWhatsAppFlow, WriteFlowType } from '../models/WhatsAppFlow';
import { UserRole } from '../types';
import { config } from '../config';
import PropertyService from './PropertyService';

const FLOW_TTL_MS = 30 * 60 * 1000;
const PROPERTY_TYPES = ['residential', 'apartment', 'house', 'hostel', 'shop', 'commercial', 'bungalow', 'land'];
const FREQUENCIES = ['monthly', 'quarterly', 'annually'];

function newExpiry(): Date { return new Date(Date.now() + FLOW_TTL_MS); }

/** Parse "800k", "800,000", "₦800000", "1.2m" to an integer NGN, or null. */
export function parseAmount(text: string): number | null {
  const t = text.trim().toLowerCase().replace(/[₦,\s]/g, '');
  const m = t.match(/^(\d+(?:\.\d+)?)(k|m)?$/);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (m[2] === 'k') n *= 1_000;
  if (m[2] === 'm') n *= 1_000_000;
  return n > 0 ? Math.round(n) : null;
}

/** Parse dd/mm/yyyy or yyyy-mm-dd to a Date, or null. */
export function parseDate(text: string): Date | null {
  const t = text.trim();
  let m = t.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/); // dd/mm/yyyy
  if (m) { const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])); return isNaN(+d) ? null : d; }
  m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); // yyyy-mm-dd
  if (m) { const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); return isNaN(+d) ? null : d; }
  return null;
}

class WhatsAppWriteFlowService {
  /** Create a flow doc (called by the start_* tools). Returns nothing; the
   * orchestrator emits the first prompt via firstPrompt(). */
  async start(type: WriteFlowType, userId: string, waId: string, seed: Record<string, unknown> = {}): Promise<void> {
    const firstStep = type === 'add_property' ? 'name' : 'property';
    await WhatsAppFlow.findOneAndUpdate(
      { userId },
      { userId, waId, type, step: firstStep, data: seed, expiresAt: newExpiry() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  /** The prompt for a freshly-created flow's first step. */
  async firstPrompt(doc: IWhatsAppFlow): Promise<string> {
    return this.promptFor(doc);
  }

  /** Advance a flow by one message; returns the reply to send. Never throws. */
  async advance(doc: IWhatsAppFlow, text: string): Promise<string> {
    const trimmed = text.trim();
    if (trimmed.toUpperCase() === 'CANCEL') {
      await WhatsAppFlow.deleteOne({ _id: doc._id });
      return 'Okay, cancelled. Nothing was saved.';
    }
    doc.expiresAt = newExpiry();
    try {
      if (doc.type === 'add_property') return await this.advanceProperty(doc, trimmed);
      return await this.advanceTenant(doc, trimmed); // implemented in Task 5
    } catch (err) {
      console.error('[WhatsApp Write] advance failed:', err);
      await WhatsAppFlow.deleteOne({ _id: doc._id });
      return `Sorry, something went wrong and I stopped this. You can also do it in the app: ${config.web.baseUrl}/app`;
    }
  }

  /** Prompt text for the current step (used for first prompt + re-prompts). */
  private async promptFor(doc: IWhatsAppFlow): Promise<string> {
    // add_property prompts by step; add_tenant handled in Task 5.
    if (doc.type === 'add_property') {
      switch (doc.step) {
        case 'name': return "Let's add a property. What's the property name?";
        case 'street': return 'What is the street address?';
        case 'city': return 'Which city?';
        case 'state': return 'Which state?';
        case 'type': return `What type of property? Reply with a number:\n${PROPERTY_TYPES.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;
        case 'units': return 'How many units does it have?';
        case 'rent': return 'What is the default yearly rent per unit? (e.g. 800k). You can fine-tune per unit later.';
        case 'confirm': return this.propertySummary(doc);
      }
    }
    return 'Please continue.';
  }

  private async advanceProperty(doc: IWhatsAppFlow, text: string): Promise<string> {
    const d = doc.data as Record<string, any>;
    switch (doc.step) {
      case 'name':
        if (!text) return this.promptFor(doc);
        d.name = text; doc.step = 'street'; doc.markModified('data'); await doc.save();
        return this.promptFor(doc);
      case 'street':
        d.street = text; doc.step = 'city'; doc.markModified('data'); await doc.save();
        return this.promptFor(doc);
      case 'city':
        d.city = text; doc.step = 'state'; doc.markModified('data'); await doc.save();
        return this.promptFor(doc);
      case 'state':
        d.state = text; doc.step = 'type'; doc.markModified('data'); await doc.save();
        return this.promptFor(doc);
      case 'type': {
        const idx = parseInt(text, 10) - 1;
        const chosen = PROPERTY_TYPES[idx] ?? PROPERTY_TYPES.find((t) => t === text.toLowerCase());
        if (!chosen) { await doc.save(); return this.promptFor(doc); }
        d.propertyType = chosen; doc.step = 'units'; doc.markModified('data'); await doc.save();
        return this.promptFor(doc);
      }
      case 'units': {
        const n = parseInt(text.replace(/\D/g, ''), 10);
        if (!n || n < 1) { await doc.save(); return 'Please enter a whole number of units (at least 1).'; }
        d.units = n; doc.step = 'rent'; doc.markModified('data'); await doc.save();
        return this.promptFor(doc);
      }
      case 'rent': {
        const amt = parseAmount(text);
        if (!amt) { await doc.save(); return 'Please enter a valid amount, e.g. 800k or 800,000.'; }
        d.rent = amt; doc.step = 'confirm'; doc.markModified('data'); await doc.save();
        return this.promptFor(doc);
      }
      case 'confirm': {
        if (text.toUpperCase() !== 'YES') { await doc.save(); return 'Reply YES to create it, or CANCEL to stop.'; }
        // Commit. Read PropertyService.createProperty + CreatePropertyData for exact fields.
        const property = await PropertyService.createProperty({
          name: d.name,
          address: { street: d.street, city: d.city, state: d.state },
          propertyType: d.propertyType,
          units: d.units,
          owner: String(doc.userId), // confirm the owner field name in CreatePropertyData
        } as any);
        // If createProperty does not set per-unit rent, the default rent (d.rent)
        // should be applied to the created units — verify how createProperty
        // handles unit rent and, if needed, set it here via the unit API.
        await WhatsAppFlow.deleteOne({ _id: doc._id });
        return `Done. "${d.name}" was created with ${d.units} unit(s). Add photos and fine-tune each unit here:\n${config.web.baseUrl}/app/properties/${(property as any)._id}`;
      }
    }
    return this.promptFor(doc);
  }

  private propertySummary(doc: IWhatsAppFlow): string {
    const d = doc.data as Record<string, any>;
    return (
      'Ready to create:\n' +
      `• ${d.name}\n` +
      `• ${d.street}, ${d.city}, ${d.state}\n` +
      `• Type: ${d.propertyType}\n` +
      `• ${d.units} unit(s), default rent ${d.rent.toLocaleString()}/yr\n\n` +
      'Reply YES to create, or CANCEL to stop.'
    );
  }

  private async advanceTenant(_doc: IWhatsAppFlow, _text: string): Promise<string> {
    // Implemented in Task 5.
    return 'Tenant flow not available yet.';
  }
}

export default new WhatsAppWriteFlowService();
```

Implementer notes:
- Confirm `CreatePropertyData`'s owner field name (it may be `owner` or the service may take ownerId separately). Read `PropertyService.createProperty` and match exactly.
- If `createProperty` does not apply `d.rent` to the created units, apply it (the property design says default rent per unit). Check the unit-creation path inside `createProperty` and set `rentAmount` on the created units, or pass unit drafts if the signature supports it (`CreatePropertyData.units` can be a number OR `UnitDraft[]`). Prefer passing `UnitDraft[]` of length `d.units` each with `rentAmount: d.rent` if that path exists.

- [ ] **Step 2: Build** `cd backend && npm run build` (exit 0).
- [ ] **Step 3: Commit** `git add src/services/WhatsAppWriteFlowService.ts && git commit --no-verify -m "feat(whatsapp-write): write-flow service + add-property state machine"`

---

## Task 5: Add-tenant state machine

**Files:** Modify `backend/src/services/WhatsAppWriteFlowService.ts`.

Implement `advanceTenant` and its prompts, plus the property/unit listing. Read these first: `PropertyService.getProperties(ownerId, query, role?)` (returns a paginated result; find the array key), `PropertyService.getUnits(propertyId, ownerId, role?)` (returns Unit docs; filter `isOccupied === false` for vacant), and `TenantService.assignTenantToUnit(data: AssignTenantData)` (read the full `AssignTenantData` interface for exact field names).

Steps and semantics (store selections in `doc.data`; `markModified('data')` + save each step; bump TTL via `advance`):

1. `property`: list the user's properties (`getProperties(String(doc.userId), { page: 1, limit: 50 }, doc.type-role)` — for the acting user's role). Number them; store the chosen property `_id` and its `owner` as `doc.landlordId` (this resolves the landlord for both landlords and agents). If the user is an AGENT, verify they have `canAddTenant` for that property's landlord/property before proceeding (reuse the agent-permission resolution used in `agentTools.ts` / the `checkAgentPermission` logic; read those for the exact helper). If not permitted, end with a clear message.
2. `unit`: list vacant units (`getUnits(...)` filtered to `!isOccupied`). If none, say so and offer to pick another property (`back`) or CANCEL. Store chosen unit `_id`.
3. `firstName` then `lastName` (or one "full name" prompt split on first space; match onboarding's name handling).
4. `contact`: accept a phone (`+234…` / `0…`) and/or email; require at least one. Store `tenantPhone` and/or `tenantEmail`.
5. `rent`: `parseAmount`; then `frequency` (numbered: monthly/quarterly/annually, default annually).
6. `startDate` (`parseDate`), then `endDate` (`parseDate`; offer "reply OK for <start + 1 year>").
7. `fees`: one compound prompt — accept `SKIP`, or a list like `security 200k, agent 100k`. Parse tokens to the fee fields (`securityDeposit`, `cautionFee`, `agentFee`, `agreementFee`, `legalFee`, `serviceCharge`, `otherFee`). Validate each amount with `parseAmount`; unrecognized categories re-prompt.
8. `moveIn`: YES → `activateImmediately = true`; NO → invitation (`activateImmediately = false`).
9. `payment`: only if `moveIn` YES — accept `SKIP` or a list of paid items (`rent, security, ...`) mapped to `payment.paidItems` with `payment.method = 'bank_transfer'`.
10. `confirm`: full summary; `YES` commits via `TenantService.assignTenantToUnit({ unitId, landlordId: String(doc.landlordId), assignedById: String(doc.userId), tenantFirstName, tenantLastName, tenantEmail, tenantPhone, leaseStartDate, leaseEndDate, rentAmount, paymentFrequency, ...fees, activateImmediately, payment? })`. Delete the flow. Reply with a success message + deep link to the lease/tenant in the app.

- [ ] **Step 1:** Implement `advanceTenant` + the tenant branch of `promptFor` (mirror the add-property structure). Write complete code; validate every field; keep money parsing via `parseAmount`.
- [ ] **Step 2: Build** `cd backend && npm run build` (exit 0). Match all `AssignTenantData` field names exactly.
- [ ] **Step 3: Commit** `git add src/services/WhatsAppWriteFlowService.ts && git commit --no-verify -m "feat(whatsapp-write): add-tenant state machine"`

---

## Task 6: `start_add_property` / `start_add_tenant` tools

**Files:** Create `backend/src/services/assistant/tools/writeFlowTools.ts`; Modify `backend/src/services/assistant/tools/index.ts`.

The start tools create a flow via `WhatsAppWriteFlowService.start(...)` and return a small marker. They need `ctx.userId` and the wa_id. `ctx` currently lacks `waId`; add `waId?: string` to `ToolContext` (like `channel` in Task 3) and set it in the orchestrator's ctx (Task 7). The tools are added ONLY on the WhatsApp channel AND only when `config.whatsapp.writeActionsEnabled` is true; `start_add_property` for landlords only, `start_add_tenant` for landlords and agents.

- [ ] **Step 1: Add `waId` to `ToolContext`** in `tools/types.ts`:
```ts
  /** The WhatsApp number for channel === 'whatsapp'; used to start write flows. */
  waId?: string;
```

- [ ] **Step 2: Create `writeFlowTools.ts`**:
```ts
import type { AssistantTool } from './types';
import WhatsAppWriteFlowService from '../../WhatsAppWriteFlowService';

const startAddPropertyTool: AssistantTool = {
  definition: {
    type: 'function',
    function: {
      name: 'start_add_property',
      description:
        'Begin the guided flow to add a new property. Call this ONLY when the ' +
        'landlord wants to create/add a property. Do not ask for details yourself; ' +
        'the flow collects them. Optionally pass any name you already heard.',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: { name: { type: 'string', description: 'Property name if clearly stated' } },
      },
    },
  },
  handler: async (ctx, args) => {
    if (!ctx.waId) return { error: 'Write flows are only available on WhatsApp.' };
    const seed = args.name ? { name: String(args.name), step: 'street' } : {};
    await WhatsAppWriteFlowService.start('add_property', ctx.userId, ctx.waId, seed);
    return { started: 'add_property' };
  },
};

const startAddTenantTool: AssistantTool = {
  definition: {
    type: 'function',
    function: {
      name: 'start_add_tenant',
      description:
        'Begin the guided flow to add a tenant to a unit. Call this ONLY when the ' +
        'user wants to add/assign a tenant. The flow collects all details.',
      parameters: { type: 'object', additionalProperties: false, properties: {} },
    },
  },
  handler: async (ctx, args) => {
    if (!ctx.waId) return { error: 'Write flows are only available on WhatsApp.' };
    await WhatsAppWriteFlowService.start('add_tenant', ctx.userId, ctx.waId, {});
    return { started: 'add_tenant' };
  },
};

export const writeFlowTools = { startAddPropertyTool, startAddTenantTool };
```
Note: if `start()` seeds a `step` inside `seed`, ensure `start()` respects a seeded `step` (adjust `start` to use `seed.step ?? firstStep`). Keep seeding simple; if it complicates `start`, drop the pre-fill and always begin at the first step (the design allows pre-fill but does not require it).

- [ ] **Step 3: Register in `tools/index.ts`** (whatsapp + flag gated):
```ts
import { writeFlowTools } from './writeFlowTools';
import { config } from '../../../config';

// inside toolsForRole, after adding marketplaceTool:
if (channel === 'whatsapp' && config.whatsapp.writeActionsEnabled) {
  if (role === UserRole.LANDLORD) base.push(writeFlowTools.startAddPropertyTool);
  if (role === UserRole.LANDLORD || role === UserRole.AGENT) base.push(writeFlowTools.startAddTenantTool);
}
```

- [ ] **Step 4: Build** (exit 0).
- [ ] **Step 5: Commit** `git add src/services/assistant/tools/types.ts src/services/assistant/tools/writeFlowTools.ts src/services/assistant/tools/index.ts && git commit --no-verify -m "feat(whatsapp-write): start_add_property / start_add_tenant tools"`

---

## Task 7: Orchestrator integration

**Files:** Modify `backend/src/services/WhatsAppAssistantService.ts`, `backend/src/services/AssistantService.ts`.

- [ ] **Step 1: Pass `waId` into the tool ctx**

In `AssistantService.ask`, the `toolCtx` built in Task 3 (`{ ...ctx, channel }`) must also carry `waId`. So the orchestrator must include `waId` in the ctx it passes to `ask`. Change `ask`'s signature is unnecessary — `ctx` already flows through. In the orchestrator (`WhatsAppAssistantService`), change the `ask` call's ctx to include `waId`:
```ts
const result = await AssistantService.ask(
  { userId: String(user._id), role: user.role, waId },
  truncated,
  'whatsapp'
);
```
And ensure `toolCtx = { ...ctx, channel }` in `ask` preserves `waId` (spread already does). Confirm `ToolContext` now has `waId?` and `channel?` (Tasks 3 + 6).

- [ ] **Step 2: Active write-flow check (after identity, before plan gate)**

In `processInbound`, after `resolveUser` returns an `IUser` (the non-string branch), and BEFORE the landlord plan gate, insert:
```ts
      // An active write flow consumes the message deterministically (LLM + plan
      // gate bypassed; the landlord passed the plan gate when starting it).
      const activeFlow = await WhatsAppFlow.findOne({ userId: user._id });
      if (activeFlow) {
        const reply = await WhatsAppWriteFlowService.advance(activeFlow, text as string);
        await sendWhatsAppText(waId, toWhatsAppFormatting(reply));
        return;
      }
```
Add imports: `WhatsAppFlow` to the models import, and `import WhatsAppWriteFlowService from './WhatsAppWriteFlowService';`.

- [ ] **Step 3: Post-ask new-flow emission**

The normal path calls `AssistantService.ask(...)` and sends `result.reply`. A `start_*` tool called during that turn creates a flow doc but the model's own reply is not the flow's first prompt. After the `ask` result is obtained and BEFORE sending it, check whether a flow was just created and, if so, send the flow's first prompt instead:
```ts
      // If the assistant just started a write flow this turn, emit that flow's
      // first prompt verbatim instead of the model's reply.
      const startedFlow = await WhatsAppFlow.findOne({ userId: user._id });
      if (startedFlow) {
        const prompt = await WhatsAppWriteFlowService.firstPrompt(startedFlow);
        await sendWhatsAppText(waId, toWhatsAppFormatting(prompt));
        return;
      }
```
Place this right after the `try { const result = await AssistantService.ask(...) ... }` block resolves `replyText`/`actionLines` but before the final `sendWhatsAppText`. (It is safe: we already established there was no active flow before `ask`, so any flow found now is new.)

- [ ] **Step 4: Build** `cd backend && npm run build` (exit 0).

- [ ] **Step 5: Manual smoke (if dev server running):** as a WhatsApp-verified landlord with `WHATSAPP_WRITE_ACTIONS_ENABLED=true`, message "add a property" → expect the name prompt; complete the flow → property created; confirm nothing created until YES. With the flag false, "add a property" should get a normal read-only reply (no flow). Otherwise rely on the build.

- [ ] **Step 6: Commit** `git add src/services/WhatsAppAssistantService.ts src/services/AssistantService.ts && git commit --no-verify -m "feat(whatsapp-write): orchestrator routes write flows + emits first prompt"`

---

## Task 8: Docs addendum + manual E2E

**Files:** Modify `docs/superpowers/specs/2026-07-09-whatsapp-write-actions-design.md` (monorepo root repo, feat/founding-50).

- [ ] **Step 1:** Append an `## As-built notes (2026-07-09)` section recording deviations: flow keyed by userId; agent landlordId resolved from the selected property's owner (not up-front); flow-start detected by LLM `start_*` tools with deterministic first-prompt emission by the orchestrator; write tools gated on `channel === 'whatsapp' && config.whatsapp.writeActionsEnabled`.
- [ ] **Step 2:** Run the spec's Testing matrix against a dev deploy with the flag on (search as each role; add-property happy path + validation + cancel; add-tenant landlord + agent-permission + no-vacancy + invite + SKIP fees/payment; confirm-before-commit; flag-off leaves read-only; amount parsing variants).
- [ ] **Step 3: Commit** (monorepo root) `git add docs/superpowers/specs/2026-07-09-whatsapp-write-actions-design.md && git commit --no-verify -m "docs: WhatsApp write actions as-built notes"`

---

## Deploy (user-gated)

Backend commits sit on `feat/wallet-dva`. To deploy: cherry-pick onto `main`, build, `git push origin HEAD:main` (Render auto-deploys). Set `WHATSAPP_WRITE_ACTIONS_ENABLED=true` in Render only when ready to enable writes; marketplace search ships as soon as the code is live (governed by the assistant switch). Get explicit user approval before any production push.
