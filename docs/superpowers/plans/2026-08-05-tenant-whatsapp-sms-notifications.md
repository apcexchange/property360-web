# Tenant WhatsApp + SMS Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a prioritized set of tenant lifecycle events over WhatsApp with an SMS fallback, on top of the existing in-app notification, gated by the landlord's tier and opt-out (default on) tenant preferences.

**Architecture:** A single `TenantMessagingService` orchestrator is called from each eligible event site. It attempts a WhatsApp template via the existing `WhatsAppService` provider abstraction, records the attempt in a new `NotificationDelivery` collection, and sends SMS via `OtpService.sendSms` when WhatsApp fails synchronously. A Meta delivery-status webhook drives asynchronous SMS fallback idempotently via the recorded `providerMessageId`. Everything ships dark behind `TENANT_MESSAGING_ENABLED`.

**Tech Stack:** Node.js / Express 5 / TypeScript, Mongoose (MongoDB), node-cron, Meta Cloud API / Termii / Sendchamp (WhatsApp), Termii / VTpass (SMS).

**Repo note:** All backend paths are relative to `backend/` in the property360 monorepo, which pushes to `property360.git`. The mobile task is in `mobile/` (`property360-mobile.git`).

**Testing note:** This repo has **no test runner** (`npm test` exits 1; CLAUDE.md: "manually exercise the affected flow"). Each task therefore verifies by build + manual exercise (`npm run build`, dry-run logs, DB inspection, curl), not automated tests. Run `npm run build` from `backend/` after each code task; "Expected: compiles with no errors" is the baseline gate.

---

## File Structure

New files:
- `backend/src/models/NotificationDelivery.ts` — per-attempt WhatsApp delivery record (drives idempotent async SMS fallback).
- `backend/src/services/TenantMessagingService.ts` — the orchestrator (WhatsApp -> record -> SMS ladder + webhook status handling).

Modified files:
- `backend/src/config/index.ts` — 3 new template keys per provider; new `tenantMessaging.enabled` flag.
- `backend/src/types/index.ts` — 2 new preference keys; `INotificationDelivery` interface.
- `backend/src/models/User.ts` — 2 new `notificationPreferences` fields (default true).
- `backend/src/models/Lease.ts` — `expiryRemindersSent` field (dedupe the sweep).
- `backend/src/models/index.ts` — export `NotificationDelivery`.
- `backend/src/services/WhatsAppService.ts` — 3 new template keys; unified opt-out pref check; 3 new template wrappers.
- `backend/src/controllers/WhatsAppWebhookController.ts` — consume `value.statuses`.
- `backend/src/services/TenantService.ts` — wire tenant-invite; consolidate payment reminder.
- `backend/src/services/LeaseExpirationService.ts` — `checkExpiringSoon()` sweep.
- `backend/src/server.ts` — call the sweep on startup + daily cron.
- `backend/src/services/InvoiceService.ts` — route invoice via orchestrator.
- `backend/src/services/ReceiptService.ts` — route receipt via orchestrator.
- `backend/src/services/MaintenanceService.ts` — wire maintenance status change.
- `backend/.env.example` — document new env vars.
- `mobile/src/screens/**/NotificationSettingsScreen*` — swap 3 old toggles for 2 new ones.

---

## Task 1: Config — template keys + master flag

**Files:**
- Modify: `backend/src/config/index.ts` (blocks at lines 90-94, 178-183, 210-216, and after the `whatsapp` block ~218)

- [ ] **Step 1: Add 3 template keys to the Termii template map**

In `termii.whatsappTemplates` (currently lines 90-94), add three entries so the block reads:

```ts
    whatsappTemplates: {
      paymentReminder: process.env.TERMII_WHATSAPP_TEMPLATE_PAYMENT_REMINDER || '',
      invoiceSent: process.env.TERMII_WHATSAPP_TEMPLATE_INVOICE_SENT || '',
      receiptIssued: process.env.TERMII_WHATSAPP_TEMPLATE_RECEIPT_ISSUED || '',
      tenantInvited: process.env.TERMII_WHATSAPP_TEMPLATE_TENANT_INVITED || '',
      leaseExpiring: process.env.TERMII_WHATSAPP_TEMPLATE_LEASE_EXPIRING || '',
      maintenanceStatus: process.env.TERMII_WHATSAPP_TEMPLATE_MAINTENANCE_STATUS || '',
    },
```

- [ ] **Step 2: Add the same 3 keys to the Meta template map**

In `whatsapp.meta.templates` (currently lines 178-183):

```ts
      templates: {
        paymentReminder:
          process.env.META_WHATSAPP_TEMPLATE_PAYMENT_REMINDER || '',
        invoiceSent: process.env.META_WHATSAPP_TEMPLATE_INVOICE_SENT || '',
        receiptIssued: process.env.META_WHATSAPP_TEMPLATE_RECEIPT_ISSUED || '',
        tenantInvited: process.env.META_WHATSAPP_TEMPLATE_TENANT_INVITED || '',
        leaseExpiring: process.env.META_WHATSAPP_TEMPLATE_LEASE_EXPIRING || '',
        maintenanceStatus:
          process.env.META_WHATSAPP_TEMPLATE_MAINTENANCE_STATUS || '',
      },
```

- [ ] **Step 3: Add the same 3 keys to the Sendchamp template map**

In `whatsapp.sendchamp.templates` (currently lines 210-216):

```ts
      templates: {
        paymentReminder:
          process.env.SENDCHAMP_WHATSAPP_TEMPLATE_PAYMENT_REMINDER || '',
        invoiceSent: process.env.SENDCHAMP_WHATSAPP_TEMPLATE_INVOICE_SENT || '',
        receiptIssued:
          process.env.SENDCHAMP_WHATSAPP_TEMPLATE_RECEIPT_ISSUED || '',
        tenantInvited:
          process.env.SENDCHAMP_WHATSAPP_TEMPLATE_TENANT_INVITED || '',
        leaseExpiring:
          process.env.SENDCHAMP_WHATSAPP_TEMPLATE_LEASE_EXPIRING || '',
        maintenanceStatus:
          process.env.SENDCHAMP_WHATSAPP_TEMPLATE_MAINTENANCE_STATUS || '',
      },
```

- [ ] **Step 4: Add the tenant-messaging master flag**

Immediately after the `whatsapp: { ... }` block closes (the `},` at ~line 218), add a new top-level config block:

```ts
  // Master switch for tenant lifecycle WhatsApp+SMS notifications
  // (TenantMessagingService). Default OFF so the feature deploys dark: when
  // off, only the in-app notification is created and no WhatsApp/SMS is sent.
  // The lease-expiring sweep also no-ops while this is off. Flip to "true"
  // once the three new Meta templates are approved and registered.
  tenantMessaging: {
    enabled:
      (process.env.TENANT_MESSAGING_ENABLED ?? 'false').toLowerCase() === 'true',
    // Days before lease.endDate to fire the "expiring soon" reminder. The
    // daily sweep fires once per lead day per lease term.
    expiryReminderLeadDays: (process.env.TENANT_MESSAGING_EXPIRY_LEAD_DAYS || '30,7')
      .split(',')
      .map((d) => parseInt(d.trim(), 10))
      .filter((d) => Number.isFinite(d) && d > 0),
  },
```

- [ ] **Step 5: Verify build**

Run: `cd backend && npm run build`
Expected: compiles with no errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/config/index.ts
git commit -m "feat(notifications): config for tenant messaging templates + flag"
```

---

## Task 2: Preference keys — types + User model

**Files:**
- Modify: `backend/src/types/index.ts:118-130` (`INotificationPreferences`)
- Modify: `backend/src/models/User.ts:139-151` (`notificationPreferences` schema)

- [ ] **Step 1: Add the two new preference keys to the interface**

In `INotificationPreferences` (types/index.ts, after `whatsappInvoices` at line 129):

```ts
  whatsappPaymentReminders: boolean;
  whatsappReceipts: boolean;
  whatsappInvoices: boolean;
  // Unified tenant lifecycle delivery (TenantMessagingService). Opt-out:
  // read as "on unless explicitly false". Supersede the three per-event
  // whatsapp* keys above, which are now dormant.
  whatsappUpdates: boolean;
  smsFallback: boolean;
```

- [ ] **Step 2: Add matching schema fields (default true) to User model**

In `models/User.ts`, inside `notificationPreferences` (after `whatsappInvoices` at line 150):

```ts
      whatsappPaymentReminders: { type: Boolean, default: false },
      whatsappReceipts: { type: Boolean, default: false },
      whatsappInvoices: { type: Boolean, default: false },
      // Unified lifecycle delivery — ON by default (opt-out). Tenants
      // receive WhatsApp (with SMS fallback) without taking any action.
      whatsappUpdates: { type: Boolean, default: true },
      smsFallback: { type: Boolean, default: true },
```

- [ ] **Step 3: Verify build**

Run: `cd backend && npm run build`
Expected: compiles with no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/types/index.ts backend/src/models/User.ts
git commit -m "feat(notifications): whatsappUpdates + smsFallback prefs (default on)"
```

---

## Task 3: NotificationDelivery model

**Files:**
- Create: `backend/src/models/NotificationDelivery.ts`
- Modify: `backend/src/types/index.ts` (append `INotificationDelivery`)
- Modify: `backend/src/models/index.ts` (export)

- [ ] **Step 1: Add the type interface**

Append to `backend/src/types/index.ts`:

```ts
export interface INotificationDelivery extends Document {
  recipient: Types.ObjectId;
  landlord: Types.ObjectId;
  // The WhatsAppTemplateKey used for this attempt.
  event: string;
  provider: 'meta' | 'termii' | 'sendchamp';
  // Present only when the provider accepted the send. Unique+sparse so the
  // status webhook can look the row up. Absent on synchronous failures.
  providerMessageId?: string;
  status: 'sent' | 'delivered' | 'failed' | 'sms_sent';
  // Plain-text body used for the SMS fallback leg.
  smsText: string;
  createdAt: Date;
  updatedAt: Date;
}
```

> Note: `types/index.ts` already imports `Document` and `Types` from mongoose (used by other interfaces such as `IProperty`). If a build error says otherwise, add `import { Document, Types } from 'mongoose';` at the top.

- [ ] **Step 2: Create the model**

Create `backend/src/models/NotificationDelivery.ts`:

```ts
import mongoose, { Schema } from 'mongoose';
import { INotificationDelivery } from '../types';

const notificationDeliverySchema = new Schema<INotificationDelivery>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    landlord: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    event: { type: String, required: true },
    provider: { type: String, enum: ['meta', 'termii', 'sendchamp'], required: true },
    providerMessageId: { type: String },
    status: {
      type: String,
      enum: ['sent', 'delivered', 'failed', 'sms_sent'],
      default: 'sent',
    },
    smsText: { type: String, default: '' },
  },
  { timestamps: true }
);

// Webhook looks rows up by providerMessageId. Sparse so failure rows (no id)
// don't collide on null.
notificationDeliverySchema.index(
  { providerMessageId: 1 },
  { unique: true, sparse: true }
);
// Auto-expire after 7 days — after that no fallback is useful.
notificationDeliverySchema.index({ createdAt: 1 }, { expireAfterSeconds: 604800 });

export const NotificationDelivery = mongoose.model<INotificationDelivery>(
  'NotificationDelivery',
  notificationDeliverySchema
);
export default NotificationDelivery;
```

- [ ] **Step 3: Export from the model barrel**

Append to `backend/src/models/index.ts`:

```ts
export { NotificationDelivery } from './NotificationDelivery';
```

- [ ] **Step 4: Verify build**

Run: `cd backend && npm run build`
Expected: compiles with no errors.

- [ ] **Step 5: Commit**

```bash
git add backend/src/models/NotificationDelivery.ts backend/src/models/index.ts backend/src/types/index.ts
git commit -m "feat(notifications): NotificationDelivery model for WhatsApp fallback tracking"
```

---

## Task 4: WhatsAppService — new template keys + unified opt-out gate

**Files:**
- Modify: `backend/src/services/WhatsAppService.ts` (union at 22-25, `TEMPLATE_PREF_KEY` at 31-35, opt-in check at 439-443, add wrappers before line 577 `}`)

- [ ] **Step 1: Extend the template key union**

Replace the `WhatsAppTemplateKey` union (lines 22-25):

```ts
export type WhatsAppTemplateKey =
  | 'paymentReminder'
  | 'invoiceSent'
  | 'receiptIssued'
  | 'tenantInvited'
  | 'leaseExpiring'
  | 'maintenanceStatus';
```

- [ ] **Step 2: Remove the per-template preference map (now unified)**

Delete the `TEMPLATE_PREF_KEY` constant (lines 31-35 including its doc comment). All templates now gate on the single `whatsappUpdates` preference (next step), so a per-key map is no longer used. If any other file imports `TEMPLATE_PREF_KEY`, remove that import (grep confirms only WhatsAppService references it).

- [ ] **Step 3: Replace the opt-in check with the unified opt-out check**

In `sendTemplate` (currently lines 439-443), replace:

```ts
    const prefKey = TEMPLATE_PREF_KEY[input.templateKey];
    const optedIn = recipient.notificationPreferences?.[prefKey] === true;
    if (!optedIn) {
      return { delivered: false, reason: 'tenant_opt_out' };
    }
```

with:

```ts
    // Unified opt-out: tenants receive by default; only an explicit false
    // suppresses WhatsApp. Applies to every template key.
    const optedOut = recipient.notificationPreferences?.whatsappUpdates === false;
    if (optedOut) {
      return { delivered: false, reason: 'tenant_opt_out' };
    }
```

- [ ] **Step 4: Add three template wrappers**

Before the final closing brace of `class WhatsAppService` (before line 577 `}`), add:

```ts
  /**
   * Tenant invited / added to a lease. Variables:
   *   1. Tenant first name
   *   2. Landlord name
   *   3. Property + unit (e.g. "Sunrise Apartments, Unit 12A")
   *   4. Status phrase ("has invited you to" / "has added you to")
   */
  async sendTenantInvited(args: {
    tenantId: string;
    landlordId: string;
    firstName: string;
    landlordName: string;
    propertyAndUnit: string;
    statusPhrase: string;
  }): Promise<SendResult> {
    return this.sendTemplate({
      recipientId: args.tenantId,
      landlordId: args.landlordId,
      templateKey: 'tenantInvited',
      variables: [args.firstName, args.landlordName, args.propertyAndUnit, args.statusPhrase],
    });
  }

  /**
   * Tenancy nearing its end. Variables:
   *   1. Tenant first name
   *   2. Property + unit
   *   3. End-date label (e.g. "30 Sep 2026")
   *   4. Days remaining (e.g. "30")
   */
  async sendLeaseExpiring(args: {
    tenantId: string;
    landlordId: string;
    firstName: string;
    propertyAndUnit: string;
    endDateLabel: string;
    daysRemaining: string;
  }): Promise<SendResult> {
    return this.sendTemplate({
      recipientId: args.tenantId,
      landlordId: args.landlordId,
      templateKey: 'leaseExpiring',
      variables: [args.firstName, args.propertyAndUnit, args.endDateLabel, args.daysRemaining],
    });
  }

  /**
   * Maintenance request status change. Variables:
   *   1. Tenant first name
   *   2. Request title
   *   3. New status label (e.g. "Completed")
   */
  async sendMaintenanceStatus(args: {
    tenantId: string;
    landlordId: string;
    firstName: string;
    requestTitle: string;
    statusLabel: string;
  }): Promise<SendResult> {
    return this.sendTemplate({
      recipientId: args.tenantId,
      landlordId: args.landlordId,
      templateKey: 'maintenanceStatus',
      variables: [args.firstName, args.requestTitle, args.statusLabel],
    });
  }
```

- [ ] **Step 5: Verify build**

Run: `cd backend && npm run build`
Expected: compiles with no errors. (If the build flags an unused `INotificationPreferences` import after removing `TEMPLATE_PREF_KEY`, remove that unused import.)

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/WhatsAppService.ts
git commit -m "feat(notifications): unified opt-out gate + 3 new WhatsApp templates"
```

---

## Task 5: TenantMessagingService (the orchestrator)

**Files:**
- Create: `backend/src/services/TenantMessagingService.ts`

- [ ] **Step 1: Create the service**

Create `backend/src/services/TenantMessagingService.ts`:

```ts
import { User, NotificationDelivery } from '../models';
import { config } from '../config';
import WhatsAppService, { WhatsAppTemplateKey } from './WhatsAppService';
import otpService from './OtpService';

// WhatsApp SendResult.reason values that mean "genuinely tried, did not
// deliver" — these are the only synchronous reasons that trigger SMS.
const SYNC_FALLBACK_REASONS = new Set([
  'provider_error',
  'no_template_id',
  'provider_not_configured',
]);

export interface DispatchInput {
  recipientId: string;
  landlordId: string;
  event: WhatsAppTemplateKey;
  whatsappVariables: string[];
  // Plain-text SMS body used for the fallback leg.
  smsText: string;
}

/**
 * Orchestrates the WhatsApp -> SMS ladder for tenant lifecycle events. The
 * in-app notification is created by the caller (unchanged); this service
 * owns only the WhatsApp + SMS legs plus the delivery record that drives
 * async fallback. Best-effort: every method swallows its own errors so a
 * failed message never breaks the parent flow.
 */
class TenantMessagingService {
  async dispatch(input: DispatchInput): Promise<void> {
    if (!config.tenantMessaging.enabled) return;

    try {
      const result = await WhatsAppService.sendTemplate({
        recipientId: input.recipientId,
        landlordId: input.landlordId,
        templateKey: input.event,
        variables: input.whatsappVariables,
      });

      if (result.delivered) {
        // Accepted by the provider. Record so a later failed/undelivered
        // status webhook can fall back to SMS (Meta only).
        await NotificationDelivery.create({
          recipient: input.recipientId,
          landlord: input.landlordId,
          event: input.event,
          provider: config.whatsapp.provider,
          providerMessageId: result.providerMessageId,
          status: 'sent',
          smsText: input.smsText,
        });
        return;
      }

      // Not delivered. Only fall back for genuine delivery failures — not
      // for opt-out, tier, master-switch, no-phone, or dry-run.
      if (result.reason && SYNC_FALLBACK_REASONS.has(result.reason)) {
        await this.sendSmsFallback(input.recipientId, input.smsText, input.event, input.landlordId);
      }
    } catch (err) {
      console.error('[TenantMessaging] dispatch failed:', err);
    }
  }

  /**
   * Called by the WhatsApp status webhook when Meta reports a message
   * failed/undelivered. Idempotent: sends SMS only if the row hasn't
   * already fallen back or been confirmed delivered.
   */
  async onDeliveryStatus(
    providerMessageId: string,
    status: 'delivered' | 'failed' | 'undelivered'
  ): Promise<void> {
    if (!config.tenantMessaging.enabled) return;
    try {
      const row = await NotificationDelivery.findOne({ providerMessageId });
      if (!row) return;
      if (row.status === 'sms_sent' || row.status === 'delivered') return;

      if (status === 'delivered') {
        row.status = 'delivered';
        await row.save();
        return;
      }

      // failed / undelivered -> SMS fallback.
      row.status = 'failed';
      await row.save();
      await this.sendSmsFallback(
        row.recipient.toString(),
        row.smsText,
        row.event,
        row.landlord.toString(),
        row._id.toString()
      );
    } catch (err) {
      console.error('[TenantMessaging] onDeliveryStatus failed:', err);
    }
  }

  /**
   * Send the SMS leg. Respects the tenant's smsFallback opt-out and the
   * global SMS master switch. Marks the delivery row sms_sent when given.
   */
  private async sendSmsFallback(
    recipientId: string,
    smsText: string,
    event: string,
    landlordId: string,
    deliveryRowId?: string
  ): Promise<void> {
    if (!config.sms.enabled) return;

    const user = await User.findById(recipientId).select('phone notificationPreferences');
    if (!user?.phone) return;
    if (user.notificationPreferences?.smsFallback === false) return;

    try {
      await otpService.sendSms(user.phone, smsText);
      if (deliveryRowId) {
        await NotificationDelivery.findByIdAndUpdate(deliveryRowId, { status: 'sms_sent' });
      } else {
        await NotificationDelivery.create({
          recipient: recipientId,
          landlord: landlordId,
          event,
          provider: config.whatsapp.provider,
          status: 'sms_sent',
          smsText,
        });
      }
    } catch (err) {
      console.error('[TenantMessaging] SMS fallback failed:', err);
    }
  }
}

export default new TenantMessagingService();
```

- [ ] **Step 2: Verify build**

Run: `cd backend && npm run build`
Expected: compiles with no errors. (Confirm `OtpService` default export is the instance and exposes `sendSms(to, message)` — it does, per `services/OtpService.ts:346`.)

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/TenantMessagingService.ts
git commit -m "feat(notifications): TenantMessagingService WhatsApp->SMS orchestrator"
```

---

## Task 6: Webhook — consume delivery status callbacks

**Files:**
- Modify: `backend/src/controllers/WhatsAppWebhookController.ts` (type at 16-22, handler at 62-81)

- [ ] **Step 1: Extend the webhook body type with statuses**

Replace the `MetaWebhookBody` interface (lines 16-22) with one that also models status callbacks:

```ts
interface MetaWebhookStatus {
  id: string;
  status: string; // 'sent' | 'delivered' | 'read' | 'failed' | 'undelivered'
  recipient_id?: string;
}

interface MetaWebhookBody {
  entry?: Array<{
    changes?: Array<{
      field?: string;
      value?: {
        messages?: MetaWebhookMessage[];
        statuses?: MetaWebhookStatus[];
      };
    }>;
  }>;
}
```

- [ ] **Step 2: Import the orchestrator**

At the top of the file (after the `WhatsAppAssistantService` import on line 4):

```ts
import TenantMessagingService from '../services/TenantMessagingService';
import { config } from '../config';
```

> `config` is already imported at line 3 — do not duplicate it; add only the `TenantMessagingService` import.

- [ ] **Step 3: Process statuses alongside inbound messages**

Replace the handler body from line 62 (`if (!config.whatsapp.assistant.enabled) return;`) through the end of the entry loop (line 81) with:

```ts
    const body = req.body as MetaWebhookBody | null;
    for (const entry of body?.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== 'messages') continue;

        // Delivery-status callbacks (async SMS fallback). Runs whenever
        // tenant messaging is on, independent of the assistant switch.
        if (config.tenantMessaging.enabled) {
          for (const st of change.value?.statuses ?? []) {
            if (!st?.id) continue;
            if (st.status === 'failed' || st.status === 'undelivered') {
              await TenantMessagingService.onDeliveryStatus(st.id, st.status);
            } else if (st.status === 'delivered') {
              await TenantMessagingService.onDeliveryStatus(st.id, 'delivered');
            }
          }
        }

        // Inbound messages (assistant channel).
        if (config.whatsapp.assistant.enabled) {
          for (const msg of change.value?.messages ?? []) {
            if (!msg?.id || !msg?.from) continue;
            await WhatsAppAssistantService.processInbound(
              msg.from,
              msg.id,
              msg.type,
              msg.text?.body
            );
          }
        }
      }
    }
```

Note this removes the early `return` when the assistant is disabled, so status processing still runs. The `200` ack on line 60 stays above this, unchanged.

- [ ] **Step 4: Verify build**

Run: `cd backend && npm run build`
Expected: compiles with no errors.

- [ ] **Step 5: Manual verification (deferred to Task 13 rollout)**

Full webhook exercise (crafted `statuses: failed` payload) is covered in Task 13. For now, confirm the build only.

- [ ] **Step 6: Commit**

```bash
git add backend/src/controllers/WhatsAppWebhookController.ts
git commit -m "feat(notifications): async SMS fallback via Meta status webhook"
```

---

## Task 7: Wire the tenant-invite event (priority 1)

**Files:**
- Modify: `backend/src/services/TenantService.ts` (tenant-added notification block ~211-229)

- [ ] **Step 1: Import the orchestrator + WhatsAppService (if not already)**

At the top of `TenantService.ts`, ensure these imports exist (add whichever is missing):

```ts
import TenantMessagingService from './TenantMessagingService';
```

(`WhatsAppService` is already imported — it's used by `sendPaymentReminder`.)

- [ ] **Step 2: Dispatch WhatsApp+SMS right after the tenant in-app notification**

Immediately after the tenant `NotificationService.createNotification(...)` call for the tenant (the block ending at line ~229 with `.catch(...)`), add:

```ts
    // WhatsApp + SMS lifecycle delivery (best-effort, gated + opt-out).
    const propertyAndUnit = `${property.name}, Unit ${unit.unitNumber}`;
    const statusPhrase = activateImmediately
      ? 'has added you to'
      : 'has invited you to';
    const smsText = activateImmediately
      ? `${landlordName} has added you to Unit ${unit.unitNumber} at ${property.name}. Your tenancy is now active. Open Property360 to view details.`
      : `${landlordName} has invited you to lease Unit ${unit.unitNumber} at ${property.name}. Open Property360 to review and accept.`;
    void TenantMessagingService.dispatch({
      recipientId: tenant._id.toString(),
      landlordId,
      event: 'tenantInvited',
      whatsappVariables: [tenant.firstName, landlordName, propertyAndUnit, statusPhrase],
      smsText,
    });
```

> `tenant`, `landlordId`, `landlordName`, `property`, `unit`, and `activateImmediately` are all in scope at this point (confirmed against lines 205-245). Use the same `firstName` source the surrounding code uses (`tenant.firstName` or `tenantFirstName`); match the existing variable.

- [ ] **Step 3: Verify build**

Run: `cd backend && npm run build`
Expected: compiles with no errors.

- [ ] **Step 4: Manual verification**

With `WHATSAPP_DRY_RUN=true`, `TENANT_MESSAGING_ENABLED=true`, `WHATSAPP_ENABLED=true`, and a Pro-tier landlord, add a tenant with a phone number. Expected in logs: a `[WhatsApp DRY_RUN ...] template=tenantInvited ...` line. Confirm one `NotificationDelivery` row is NOT created (dry-run returns `reason: 'dry_run'`, which is not a fallback reason and not a delivered send). Confirm the in-app notification still appears.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/TenantService.ts
git commit -m "feat(notifications): WhatsApp+SMS on tenant invite/add"
```

---

## Task 8: Lease-expiring sweep (priority 2)

**Files:**
- Modify: `backend/src/models/Lease.ts` (add field; schema ends ~line 140)
- Modify: `backend/src/types/index.ts` (`ILease` interface — add field)
- Modify: `backend/src/services/LeaseExpirationService.ts` (add `checkExpiringSoon`)
- Modify: `backend/src/server.ts` (startup + cron wiring ~lines 60-96)

- [ ] **Step 1: Add the dedupe field to the Lease schema**

In `models/Lease.ts`, just before the schema options `{ timestamps: true }` (after the `emergencyContacts` array, ~line 138), add:

```ts
    // Lead-day reminders already sent for the CURRENT term (values are the
    // configured days-before-endDate, e.g. [30, 7]). Reset on renewal.
    expiryRemindersSent: { type: [Number], default: [] },
```

- [ ] **Step 2: Add the field to the ILease interface**

In `types/index.ts`, in the `ILease` interface, add:

```ts
  expiryRemindersSent?: number[];
```

- [ ] **Step 3: Implement the sweep**

Replace the whole `LeaseExpirationService.ts` file with the version below (keeps `checkAndExpireLeases` unchanged, adds `checkExpiringSoon`):

```ts
import Lease from '../models/Lease';
import Unit from '../models/Unit';
import { User } from '../models';
import { config } from '../config';
import NotificationService from './NotificationService';
import TenantMessagingService from './TenantMessagingService';

class LeaseExpirationService {
  async checkAndExpireLeases(): Promise<{ expiredCount: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiredLeases = await Lease.find({ status: 'active', endDate: { $lt: today } });
    let expiredCount = 0;

    for (const lease of expiredLeases) {
      try {
        lease.status = 'expired';
        await lease.save();
        await Unit.findByIdAndUpdate(lease.unit, { isOccupied: false, tenant: null });
        expiredCount++;
        console.log(`[LeaseExpiration] Expired lease ${lease._id} for unit ${lease.unit}`);
      } catch (error) {
        console.error(`[LeaseExpiration] Error expiring lease ${lease._id}:`, error);
      }
    }

    if (expiredCount > 0) {
      console.log(`[LeaseExpiration] Successfully expired ${expiredCount} lease(s)`);
    }
    return { expiredCount };
  }

  /**
   * Fire "expiring soon" reminders for active leases whose endDate falls on
   * a configured lead day from today. Idempotent per term via
   * lease.expiryRemindersSent. In-app always; WhatsApp+SMS via the
   * orchestrator (gated by the tenant-messaging master switch inside it).
   */
  async checkExpiringSoon(): Promise<{ remindedCount: number }> {
    const leadDays = config.tenantMessaging.expiryReminderLeadDays;
    if (!leadDays.length) return { remindedCount: 0 };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let remindedCount = 0;

    for (const days of leadDays) {
      const start = new Date(today);
      start.setDate(start.getDate() + days);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      const leases = await Lease.find({
        status: 'active',
        endDate: { $gte: start, $lt: end },
        expiryRemindersSent: { $ne: days },
      })
        .populate('tenant', 'firstName phone')
        .populate('property', 'name')
        .populate('unit', 'unitNumber');

      for (const lease of leases) {
        try {
          const tenant = lease.tenant as unknown as { _id: unknown; firstName?: string } | null;
          const property = lease.property as unknown as { name?: string } | null;
          const unit = lease.unit as unknown as { unitNumber?: string } | null;
          if (!tenant?._id) continue;

          const tenantId = String(tenant._id);
          const propertyAndUnit = unit?.unitNumber
            ? `${property?.name ?? 'your property'}, Unit ${unit.unitNumber}`
            : property?.name ?? 'your property';
          const endDateLabel = new Date(lease.endDate).toLocaleDateString('en-NG', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });

          await NotificationService.createNotification(
            tenantId,
            'Your tenancy is ending soon',
            `Your lease at ${propertyAndUnit} ends on ${endDateLabel} (${days} day${days === 1 ? '' : 's'} away). Contact your landlord to renew.`,
            'lease',
            { leaseId: lease._id.toString(), endDate: lease.endDate, daysRemaining: days }
          );

          void TenantMessagingService.dispatch({
            recipientId: tenantId,
            landlordId: lease.landlord.toString(),
            event: 'leaseExpiring',
            whatsappVariables: [
              tenant.firstName ?? 'there',
              propertyAndUnit,
              endDateLabel,
              String(days),
            ],
            smsText: `Reminder: your tenancy at ${propertyAndUnit} ends on ${endDateLabel} (${days} day${days === 1 ? '' : 's'} away). Contact your landlord to renew. - Property360`,
          });

          lease.expiryRemindersSent = [...(lease.expiryRemindersSent ?? []), days];
          await lease.save();
          remindedCount++;
        } catch (error) {
          console.error(`[LeaseExpiration] Expiring-soon reminder failed for ${lease._id}:`, error);
        }
      }
    }

    if (remindedCount > 0) {
      console.log(`[LeaseExpiration] Sent ${remindedCount} expiring-soon reminder(s)`);
    }
    return { remindedCount };
  }
}

export default new LeaseExpirationService();
```

> `User` import is retained for parity with other services even if unused here; if `npm run build` flags it as unused, remove it.

- [ ] **Step 4: Call the sweep on startup and in the daily cron**

In `server.ts`, after the startup `checkAndExpireLeases()` call (line ~62-64), add:

```ts
    const startupExpiring = await LeaseExpirationService.checkExpiringSoon();
    if (startupExpiring.remindedCount > 0) {
      console.log(`[Startup] Sent ${startupExpiring.remindedCount} expiring-soon reminder(s)`);
    }
```

And inside the existing daily `cron.schedule('0 1 * * *', ...)` callback (after the `checkAndExpireLeases()` call at line ~94), add:

```ts
      await LeaseExpirationService.checkExpiringSoon();
```

- [ ] **Step 5: Verify build**

Run: `cd backend && npm run build`
Expected: compiles with no errors.

- [ ] **Step 6: Manual verification**

Seed an active lease with `endDate` exactly 7 days from today and a tenant with a phone. With `TENANT_MESSAGING_ENABLED=true`, `WHATSAPP_DRY_RUN=true`, restart the server (triggers the startup sweep). Expected: an in-app `lease` notification is created for the tenant, a `[WhatsApp DRY_RUN ...] template=leaseExpiring ...` log line appears, and `lease.expiryRemindersSent` now contains `7`. Restart again: no duplicate (the `$ne: days` filter skips it).

- [ ] **Step 7: Commit**

```bash
git add backend/src/models/Lease.ts backend/src/types/index.ts backend/src/services/LeaseExpirationService.ts backend/src/server.ts
git commit -m "feat(notifications): daily lease-expiring sweep + reminders"
```

---

## Task 9: Route invoice delivery through the orchestrator

**Files:**
- Modify: `backend/src/services/InvoiceService.ts` (the `void WhatsAppService.sendInvoiceSent(...)` block ~375-394)

- [ ] **Step 1: Replace the direct WhatsApp call with a dispatch**

Replace the `void WhatsAppService.sendInvoiceSent({ ... }).then(...)` block (lines ~375-394) with:

```ts
    void TenantMessagingService.dispatch({
      recipientId: populated.tenant._id.toString(),
      landlordId,
      event: 'invoiceSent',
      whatsappVariables: [
        populated.tenant.firstName,
        populated.invoiceNumber,
        formattedAmount,
        dueDateLabel,
        uploaded.url,
      ],
      smsText: `Invoice ${populated.invoiceNumber} for ${formattedAmount} is due ${dueDateLabel}. View it in Property360.`,
    });
```

- [ ] **Step 2: Add the import**

At the top of `InvoiceService.ts`:

```ts
import TenantMessagingService from './TenantMessagingService';
```

Leave the existing `WhatsAppService` import in place only if still used elsewhere in the file; if this was its only use, remove it to avoid an unused-import build error (check with grep).

- [ ] **Step 3: Verify build**

Run: `cd backend && npm run build`
Expected: compiles with no errors.

- [ ] **Step 4: Manual verification**

Create/send an invoice for a tenant of a Pro landlord with `TENANT_MESSAGING_ENABLED=true`, `WHATSAPP_DRY_RUN=true`. Expected: `template=invoiceSent` dry-run log line. Email still sends as before.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/InvoiceService.ts
git commit -m "feat(notifications): route invoice WhatsApp via orchestrator + SMS fallback"
```

---

## Task 10: Route receipt delivery through the orchestrator

**Files:**
- Modify: `backend/src/services/ReceiptService.ts` (the `void WhatsAppService.sendReceiptIssued(...)` block ~190-205)

- [ ] **Step 1: Replace the direct WhatsApp call with a dispatch**

Replace the `void WhatsAppService.sendReceiptIssued({ ... }).then(...)` block with:

```ts
    void TenantMessagingService.dispatch({
      recipientId: populated.tenant._id.toString(),
      landlordId: populated.landlord._id.toString(),
      event: 'receiptIssued',
      whatsappVariables: [
        tenant.firstName,
        populated.receiptNumber,
        formattedAmount,
        propertyAndUnit,
        uploaded.url,
      ],
      smsText: `Payment received. Receipt ${populated.receiptNumber} for ${formattedAmount} (${propertyAndUnit}) is available in Property360.`,
    });
```

- [ ] **Step 2: Add the import**

```ts
import TenantMessagingService from './TenantMessagingService';
```

Remove the now-unused `WhatsAppService` import if this was its only use (grep to confirm).

- [ ] **Step 3: Verify build**

Run: `cd backend && npm run build`
Expected: compiles with no errors.

- [ ] **Step 4: Manual verification**

Record a payment that issues a receipt for a Pro landlord's tenant with dry-run on. Expected: `template=receiptIssued` dry-run log line; receipt email unchanged.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/ReceiptService.ts
git commit -m "feat(notifications): route receipt WhatsApp via orchestrator + SMS fallback"
```

---

## Task 11: Consolidate the payment reminder onto the ladder

**Files:**
- Modify: `backend/src/services/TenantService.ts` (`sendPaymentReminder` ~810-875)

- [ ] **Step 1: Replace the separate SMS + WhatsApp sends with one dispatch**

Keep the email send (lines ~835-847) unchanged. Replace **both** the "Send SMS reminder" try/catch block (~849-859) **and** the `void WhatsAppService.sendPaymentReminder({ ... })` block (~861 onward) with a single dispatch:

```ts
    // WhatsApp with SMS fallback (was previously an unconditional SMS +
    // WhatsApp double-send). Email above is unchanged.
    const formattedAmount = `₦${lease.rentAmount.toLocaleString('en-NG')}`;
    const propertyAndUnit = unit?.unitNumber
      ? `${property.name}, Unit ${unit.unitNumber}`
      : property.name;
    void TenantMessagingService.dispatch({
      recipientId: tenant._id.toString(),
      landlordId,
      event: 'paymentReminder',
      whatsappVariables: [tenant.firstName, formattedAmount, propertyAndUnit, 'soon'],
      smsText: `Payment reminder: ${formattedAmount} rent for ${propertyAndUnit} is due soon. - ${landlordName}`,
    });

    return { success: true, message: 'Payment reminder sent' };
```

> Adjust the trailing `return` to match the method's existing return shape (it returns `{ success, message }`). Remove any now-dangling `.then(...)` code left from the old WhatsApp block, and remove the old `otpService.sendPaymentReminderSms` call. Verify no unused-variable errors remain.

- [ ] **Step 2: Verify build**

Run: `cd backend && npm run build`
Expected: compiles with no errors.

- [ ] **Step 3: Manual verification**

Hit the send-payment-reminder endpoint for a Pro landlord's lease with dry-run on. Expected: email sends; a single `template=paymentReminder` dry-run log line; no separate plain-SMS send (that now only happens as a fallback).

- [ ] **Step 4: Commit**

```bash
git add backend/src/services/TenantService.ts
git commit -m "refactor(notifications): payment reminder uses WhatsApp->SMS ladder"
```

---

## Task 12: Wire the maintenance status-change event

**Files:**
- Modify: `backend/src/services/MaintenanceService.ts` (status-change notification block ~244-256)

- [ ] **Step 1: Dispatch after the tenant in-app notification**

Immediately after the `await NotificationService.createNotification(tenantId, ...)` call inside the `if (statusChanged)` block (after line ~253, inside the try), add:

```ts
        const rawT = updated.tenant as unknown as { firstName?: string } | null;
        void TenantMessagingService.dispatch({
          recipientId: tenantId,
          landlordId: (updated.landlord as unknown as { toString(): string }).toString(),
          event: 'maintenanceStatus',
          whatsappVariables: [rawT?.firstName ?? 'there', updated.title, friendly],
          smsText: `Update: your maintenance request "${updated.title}" is now ${friendly}. - Property360`,
        });
```

> `updated.landlord` must be an ObjectId on the maintenance request. If the `IMaintenanceRequest` type does not expose `landlord`, derive the landlord from the property: `const prop = await Property.findById(updated.property).select('owner');` and use `prop.owner`. Confirm which is available before writing; `Property` is already imported in this file.

- [ ] **Step 2: Add the import**

```ts
import TenantMessagingService from './TenantMessagingService';
```

- [ ] **Step 3: Verify build**

Run: `cd backend && npm run build`
Expected: compiles with no errors.

- [ ] **Step 4: Manual verification**

Change a maintenance request's status for a Pro landlord's tenant with dry-run on. Expected: existing in-app notification plus a `template=maintenanceStatus` dry-run log line.

- [ ] **Step 5: Commit**

```bash
git add backend/src/services/MaintenanceService.ts
git commit -m "feat(notifications): WhatsApp+SMS on maintenance status change"
```

---

## Task 13: End-to-end verification (live-ish, staging)

No code change — this is the manual acceptance pass. Run against a staging DB with real (test) Meta credentials.

- [ ] **Step 1: Register/approve templates**

In Meta Business Manager, create and submit the three templates (`tenantInvited`, `leaseExpiring`, `maintenanceStatus`) with body placeholders matching the variable order documented in Task 4. Set the resolved names in the `META_WHATSAPP_TEMPLATE_*` env vars.

- [ ] **Step 2: Enable the feature in staging (dry-run first)**

Set `TENANT_MESSAGING_ENABLED=true`, `WHATSAPP_ENABLED=true`, `WHATSAPP_DRY_RUN=true`, `SMS_ENABLED=true`. Trigger each event (tenant invite, an expiring lease, invoice, receipt, payment reminder, maintenance status). Expected: one dry-run log line per event, no provider calls, no `NotificationDelivery` rows (dry-run is not a delivered send).

- [ ] **Step 3: Live send + delivery record**

Set `WHATSAPP_DRY_RUN=false`. Trigger a tenant invite to a number that IS on WhatsApp. Expected: message arrives on WhatsApp; a `NotificationDelivery` row exists with `status: 'sent'` and a `providerMessageId`.

- [ ] **Step 4: Async fallback (idempotent)**

Simulate a Meta failed-status callback for that `providerMessageId`:

```bash
curl -X POST "$STAGING_URL/webhooks/whatsapp" \
  -H "Content-Type: application/json" \
  -H "x-hub-signature-256: sha256=<computed HMAC of the raw body with WHATSAPP_APP_SECRET>" \
  -d '{"entry":[{"changes":[{"field":"messages","value":{"statuses":[{"id":"<providerMessageId>","status":"failed"}]}}]}]}'
```

Expected: exactly one SMS is sent to the tenant; the row flips to `status: 'sms_sent'`. Re-run the same curl: no second SMS (idempotent).

- [ ] **Step 5: Sync fallback**

Point `event: 'maintenanceStatus'` at an unregistered template (leave `META_WHATSAPP_TEMPLATE_MAINTENANCE_STATUS` empty) and trigger a status change to a WhatsApp-less/registered tenant. Expected: WhatsApp returns `no_template_id`, SMS is sent immediately, a row with `status: 'sms_sent'` is written.

- [ ] **Step 6: Opt-out**

Set a tenant's `notificationPreferences.whatsappUpdates = false` and trigger an event. Expected: in-app only; no WhatsApp, no SMS, no delivery row. Then set `whatsappUpdates = true, smsFallback = false` and force a WhatsApp failure: WhatsApp attempted, but no SMS.

---

## Task 14: Mobile notification settings + env docs

**Files:**
- Modify: `mobile/` notification-settings screen (find with `grep -ril "whatsappPaymentReminders\|NotificationSettings" mobile/src`)
- Modify: `backend/.env.example`

- [ ] **Step 1: Locate the settings screen**

Run: `grep -ril "whatsappPaymentReminders\|whatsappInvoices\|NotificationSettings" mobile/src`
This is the screen (referenced in WhatsAppService docs as `NotificationSettingsScreen`) that renders the 3 old WhatsApp toggles.

- [ ] **Step 2: Swap the 3 old WhatsApp toggles for the 2 new ones**

Replace the three switches bound to `whatsappPaymentReminders` / `whatsappReceipts` / `whatsappInvoices` with two switches bound to `whatsappUpdates` ("Get updates on WhatsApp") and `smsFallback` ("Fall back to SMS if WhatsApp fails"). Both default to on. Keep whatever API call the screen already uses to persist `notificationPreferences` (it round-trips the whole object), just changing which keys the switches write. Match the existing component/style used by the other toggles on that screen.

- [ ] **Step 3: Verify (mobile)**

Run the app to that screen; toggle both and confirm the PATCH/PUT to the profile/preferences endpoint carries `whatsappUpdates` and `smsFallback`. Confirm they read back on reload.

- [ ] **Step 4: Document new env vars**

Append to `backend/.env.example` (grouped with the existing WhatsApp/SMS vars):

```
# Tenant lifecycle WhatsApp+SMS notifications (TenantMessagingService)
TENANT_MESSAGING_ENABLED=false
TENANT_MESSAGING_EXPIRY_LEAD_DAYS=30,7
# New WhatsApp templates (set the approved name/id per active provider)
META_WHATSAPP_TEMPLATE_TENANT_INVITED=
META_WHATSAPP_TEMPLATE_LEASE_EXPIRING=
META_WHATSAPP_TEMPLATE_MAINTENANCE_STATUS=
TERMII_WHATSAPP_TEMPLATE_TENANT_INVITED=
TERMII_WHATSAPP_TEMPLATE_LEASE_EXPIRING=
TERMII_WHATSAPP_TEMPLATE_MAINTENANCE_STATUS=
SENDCHAMP_WHATSAPP_TEMPLATE_TENANT_INVITED=
SENDCHAMP_WHATSAPP_TEMPLATE_LEASE_EXPIRING=
SENDCHAMP_WHATSAPP_TEMPLATE_MAINTENANCE_STATUS=
```

- [ ] **Step 5: Commit**

```bash
git add backend/.env.example
git commit -m "docs(notifications): env vars for tenant messaging"
# commit the mobile change from its own repo/worktree:
# git -C mobile add <screen> && git -C mobile commit -m "feat(notifications): whatsappUpdates + smsFallback toggles"
```

---

## Rollout (after all tasks)

1. Merge/deploy backend dark (`TENANT_MESSAGING_ENABLED=false`) — no behavior change.
2. Submit the 3 Meta templates; wait for approval; set the `*_TEMPLATE_*` env vars.
3. Staging: `TENANT_MESSAGING_ENABLED=true`, `WHATSAPP_DRY_RUN=true` — run Task 13 steps 2-6.
4. Staging live (`WHATSAPP_DRY_RUN=false`), verify real delivery + fallback.
5. Production: flip `TENANT_MESSAGING_ENABLED=true`. Remember: default-on prefs mean existing tenants begin receiving immediately.

---

## Self-review notes (author)

- Spec coverage: 6 events (Tasks 7-12), sync+async fallback (Tasks 5-6, 13), tier gate (reused via `WhatsAppService.canLandlordSendWhatsApp`, untouched), opt-out default-on prefs (Task 2 + Task 4 gate), delivery tracking (Task 3), lease-expiring trigger built new (Task 8), dark flag (Task 1), mobile settings (Task 14). All covered.
- Type consistency: `dispatch({ recipientId, landlordId, event, whatsappVariables, smsText })` used identically in Tasks 5, 7, 8, 9, 10, 11, 12. `onDeliveryStatus(providerMessageId, status)` defined in Task 5, called in Task 6. `WhatsAppTemplateKey` extended in Task 4, consumed as `event` everywhere.
- Known assumptions to confirm during execution (flagged inline): `updated.landlord` availability in MaintenanceService (Task 12), exact `firstName` variable name in TenantService (Task 7), and whether removing `WhatsAppService`/`TEMPLATE_PREF_KEY` imports leaves unused imports (Tasks 4, 9, 10).
