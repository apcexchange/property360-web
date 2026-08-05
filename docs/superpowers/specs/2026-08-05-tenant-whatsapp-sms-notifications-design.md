# Tenant WhatsApp + SMS notifications (design)

Date: 2026-08-05
Status: Approved (design), pending implementation plan
Area: backend (`property360.git`), plus mobile settings screen

## Problem

Tenants only reliably receive lifecycle updates in-app (the notification
center plus a live Socket.IO push). There is no tenant email-notification
system today (email is used only for OTP, account, demo, newsletter, sales,
and one manual payment-reminder path). Tenants who are not in the app at the
right moment miss important events. The most acute gaps are being invited to
a tenancy and a tenancy nearing its end.

We want tenants to receive the important lifecycle events over **WhatsApp**,
falling back to **SMS** when WhatsApp does not deliver, on top of the in-app
notification they already get. Delivery should require no action from the
tenant (on by default), and the tenant can turn it off.

## Goals

- Deliver a prioritized set of tenant lifecycle events over WhatsApp with an
  SMS fallback, in addition to the existing in-app notification.
- Require no tenant opt-in: WhatsApp and SMS fallback are on by default and
  are opt-out.
- Reuse the existing WhatsApp provider abstraction, the existing SMS sender,
  and the existing notification pipeline. Keep the change small and isolated.
- Keep WhatsApp/SMS a paid capability, gated by the landlord's subscription
  tier, consistent with the three templates already in production.

## Non-goals

- No new email-notification system for tenants.
- No new SMS provider or gateway (reuse Termii/VTpass via `OtpService`).
- No general event bus / outbox. This is a targeted integration.
- No landlord-facing or agent-facing WhatsApp/SMS in this scope.
- Marketplace, chat, general, and profile-request notification types are out
  of scope for WhatsApp/SMS delivery.

## Decisions (from brainstorming)

1. **Event scope:** priority lifecycle set (6 events). The two headline
   events are **tenant invite** and **rent/lease expiring soon**.
2. **Fallback model:** synchronous fallback at send time, plus asynchronous
   fallback driven by Meta delivery-status callbacks. Backed by a
   delivery-tracking record for idempotency.
3. **Gating:** tier-gated (WhatsApp-enabled tiers, Pro and above), same as
   the three existing templates.
4. **Preferences:** two toggles, `whatsappUpdates` and `smsFallback`, both
   **default on** (opt-out), read as "on unless explicitly false."
5. **Integration approach:** a single orchestration service called from the
   eligible event sites (Approach A). No changes to unrelated notification
   sites.

"Rent about to expire" is interpreted as the **tenancy/lease term ending**
(a renewal nudge fired before `lease.endDate`), not recurring rent-invoice
due dates.

## Architecture

Layering stays `routes -> controllers -> services -> models`. The new logic
lives in services and one new model.

### Components

- **`TenantMessagingService` (new).** The single orchestrator. One primary
  method, roughly:

  ```
  dispatch({
    recipientId,        // tenant User id
    landlordId,         // gates tier entitlement
    event,              // TenantMessagingEvent enum
    whatsappVariables,  // ordered template variables
    smsText,            // plain-text fallback body
  }): Promise<void>     // best-effort, never throws
  ```

  It owns the entire ladder and every gate. It does not create the in-app
  notification itself; the call site continues to call `NotificationService`
  as it does today, then calls `dispatch(...)` for the WhatsApp/SMS legs.
  (Kept separate so unrelated notification sites are untouched and the in-app
  path is unchanged.)

- **`NotificationDelivery` (new model).** One row per WhatsApp attempt:
  `recipient`, `landlord`, `event`, `provider`, `providerMessageId`,
  `status` (`sent` | `delivered` | `failed` | `sms_sent`), `smsText`,
  `createdAt`. Unique index on `providerMessageId` (webhook lookup); TTL
  index on `createdAt` (~7 days, after which no fallback is useful). This
  record is what lets the async webhook find the attempt and fire SMS
  exactly once.

- **`WhatsAppService` (extend).** Add the three new template keys to
  `WhatsAppTemplateKey`. Flip the tenant opt-in check from "explicit `true`"
  to "on unless explicitly `false`" and point it at the new preference key.
  Provider abstraction (Termii / Meta / Sendchamp) is unchanged. The
  `SendResult.reason` set already models the failure reasons the ladder
  needs.

- **`WhatsAppWebhookController` (extend).** In addition to inbound messages
  (the assistant channel), process `change.value.statuses`. On a `failed` or
  `undelivered` status, look up the `NotificationDelivery` row by
  `providerMessageId` and hand off to `TenantMessagingService` to send SMS
  (idempotent). A `delivered` status just updates the row. Async fallback is
  Meta-provider only, because the webhook is Meta's; other providers rely on
  synchronous fallback. The controller's early return that currently short
  circuits when the assistant is disabled must be adjusted so status
  processing still runs when tenant messaging is enabled.

- **`OtpService.sendSms` (reuse).** The SMS leg. No new SMS work. Gated by
  `config.sms.enabled`.

- **`LeaseExpirationService` (extend) or a sibling sweep.** Add a daily
  "expiring soon" sweep (see Event catalog).

### Data flow (per event)

1. Call site creates the in-app notification (unchanged
   `NotificationService.createNotification` path).
2. Call site calls `TenantMessagingService.dispatch(...)`.
3. Orchestrator gates WhatsApp in order:
   master switch on -> landlord tier entitled -> tenant `whatsappUpdates`
   not false -> tenant has a phone. Any gate fails: stop (in-app already
   delivered).
4. Attempt the WhatsApp template via the active provider; write a
   `NotificationDelivery` row (`status: sent`, with `providerMessageId` when
   the provider returns one, and `smsText` stored for later fallback).
5. **Synchronous failure** (`provider_error`, `no_template_id`,
   `provider_not_configured`, or Meta `not_delivered`): if `smsFallback` is
   not false and `config.sms.enabled`, send SMS now and mark the row
   `sms_sent`.
6. **Asynchronous failure** (Meta status webhook reports `failed` or
   `undelivered` later): look up the row; if it is not already `sms_sent` or
   `delivered`, send SMS and mark `sms_sent`. A `delivered` status marks the
   row and sends nothing.

## Event catalog (6)

| Event | Trigger today | Work needed | Priority |
|---|---|---|---|
| Tenant added / invited | `TenantService` (in-app exists) | new template `tenantInvited` + SMS + wire | **1** |
| Rent/lease expiring soon | none | **new daily sweep** + in-app + template `leaseExpiring` + SMS | **2** |
| Invoice issued | `InvoiceService` (WhatsApp fire-and-forget) | add SMS fallback + tracking, route via orchestrator | 3 |
| Receipt issued | `ReceiptService` (WhatsApp fire-and-forget) | same | 3 |
| Payment reminder | `TenantService` (manual; today sends email + SMS + WhatsApp) | consolidate into the ladder | 3 |
| Maintenance status change | `MaintenanceService` (in-app exists) | new template `maintenanceStatus` + SMS + wire | 4 |

### Lease-expiring sweep

`LeaseExpirationService.checkAndExpireLeases()` runs daily at `0 1 * * *`
and only marks past-due leases `expired`. Add an "expiring soon" pass in the
same daily cron:

- Query `status: 'active'` leases whose `endDate` falls within a configured
  lead window from today (proposed lead times: **30 and 7 days** before
  `endDate`).
- For each match at a given lead day, fire the in-app notification (type
  `lease`) and `TenantMessagingService.dispatch(event: leaseExpiring, ...)`.
- **Dedupe across daily runs:** add `expiryRemindersSent: number[]` to the
  Lease model recording which lead-day reminders were sent for the current
  term; skip a lead day already present. Reset when a lease renews (new term).

## Preferences and defaults

Add to `INotificationPreferences`:

- `whatsappUpdates: boolean` (default true)
- `smsFallback: boolean` (default true)

Both read as "on unless explicitly false," matching the in-app preference
convention (`{ $ne: false }`). The three existing per-event WhatsApp keys
(`whatsappPaymentReminders`, `whatsappReceipts`, `whatsappInvoices`) remain
in the schema to avoid a destructive migration, but the orchestrator stops
reading them. The mobile `NotificationSettingsScreen` swaps the three old
switches for the two new ones.

Default-on is the point: existing tenants begin receiving WhatsApp/SMS once
the feature is enabled, without opting in. The "sudden blast" risk is
handled by the rollout flag, not by an opt-in.

## When SMS fires (precise)

SMS fires **only when WhatsApp was genuinely attempted for an eligible
tenant and did not deliver.** Trigger reasons:

- `provider_error`
- `not_delivered` (Meta synchronous 131026)
- `no_template_id` (template not yet approved/registered)
- `provider_not_configured`
- async `failed` / `undelivered` (Meta status webhook)

SMS does **not** fire for: `master_switch_off`, `tier_not_allowed`,
tenant turned WhatsApp off (`whatsappUpdates === false`), `no_phone`, or
`dry_run`. Because a missing/unapproved template counts as a failure, the
feature reaches tenants over SMS even before Meta approves the new
templates.

## Templates (external dependency)

Three new Meta-approved templates are required and must be registered per
active provider in config
(`config.whatsapp.meta.templates`, `config.termii.whatsappTemplates`,
`config.whatsapp.sendchamp.templates`):

- `tenantInvited`
- `leaseExpiring`
- `maintenanceStatus`

Meta approval typically takes 1 to 3 days. Until a template is approved and
registered, its event still reaches tenants via SMS (see above).

## Error handling and idempotency

- `TenantMessagingService.dispatch` is best-effort and never throws into the
  parent flow, matching today's fire-and-forget `void WhatsAppService...`
  call sites. All legs are wrapped; failures are logged.
- The webhook keeps its immediate `200` ack before processing.
- Idempotency: `NotificationDelivery` has a unique `providerMessageId` and a
  status state machine. Async SMS is sent only when the row is not already
  `sms_sent` or `delivered`, so a late `failed` after a sync fallback, or
  duplicate webhook deliveries, never double-send.
- SMS-leg failures are logged only; there is no fallback from the fallback.

## Config, flags, rollout

- Reuse `config.whatsapp.enabled` (master), `config.whatsapp.dryRun`
  (defaults true via `WHATSAPP_DRY_RUN`), and `config.sms.enabled`.
- New flag `TENANT_MESSAGING_ENABLED` (default off) so the code merges and
  deploys dark. This is the switch that turns on default-on delivery for the
  new events.
- Sequence: deploy dark -> register and approve templates -> enable in
  staging with `WHATSAPP_DRY_RUN=true` and inspect `NotificationDelivery`
  rows and logs -> live in staging -> production.

## Testing / verification

No test runner is configured in the repo, so verification is manual:

- Trigger each event (tenant invite; a lease with `endDate` inside a lead
  window; invoice; receipt; payment reminder; maintenance status change) and
  confirm the in-app notification plus a `NotificationDelivery` row.
- With `WHATSAPP_DRY_RUN=true`, confirm the dry-run log lines and that no
  provider call is made.
- Curl the `/webhooks/whatsapp` endpoint with a crafted Meta `statuses`
  payload (`status: failed`) referencing a known `providerMessageId` and
  confirm exactly one SMS is sent and the row flips to `sms_sent`.
- Re-send the same webhook payload and confirm no second SMS (idempotency).

## Build order

1. Shared foundation: `TenantMessagingService`, `NotificationDelivery`
   model, preference keys, and webhook status handling.
2. Tenant invite (event 1).
3. Lease-expiring sweep (event 2), including the Lease `expiryRemindersSent`
   field.
4. Consolidate invoice, receipt, and payment reminder onto the ladder.
5. Maintenance status change.
6. Mobile `NotificationSettingsScreen` swap to the two new toggles.

## Open questions / future work

- Async fallback for non-Meta providers (Termii/Sendchamp delivery reports)
  is out of scope; those rely on synchronous fallback only.
- Exact lead-time set for the expiring sweep (30 and 7 proposed) can be made
  configurable.
- Whether to eventually drop the three dormant WhatsApp preference keys in a
  later cleanup migration.
