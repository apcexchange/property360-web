# Tenant Identity Edit Design

**Status:** Approved design, ready for implementation planning
**Date:** 2026-08-04
**Owner:** Peter (hello@property360.africa)

## Problem

There is no way, on web or mobile, for a landlord or agent to correct a tenant's first name, last name, email, or phone number after the tenant is created. `TenantService.assignTenantToUnit` (`backend/src/services/TenantService.ts:68`) creates a real `User` account immediately (with a temp password, login-capable) from whatever the landlord typed on the "Add tenant" form. If any of those four fields has a typo, it's permanent.

This was surfaced while investigating a disabled "Assign tenant" button: the button itself was working as designed (`web/src/app/app/tenants/new/page.tsx:206-213` requires all four identity fields plus a valid unit/rent before enabling submit), but the underlying ask was "I can't fix a typo on an existing tenant" — a genuinely missing capability, not a bug.

The existing `PUT /tenants/lease/:leaseId/tenant-profile` route (`backend/src/routes/tenant.ts:222-231`, `TenantProfileRequestController.fillForTenant`) only covers KYC-adjacent fields (`dateOfBirth`, `occupation`, `nin`, ID document, address — see `backend/src/validations/tenantProfileRequest.ts`). It writes to a separate `TenantProfileRequest`-backed flow, not the core `User` document, so extending it to cover `firstName`/`lastName`/`email`/`phone` would conflate two different data models.

## Locked decisions

- **Scope:** backend + web + mobile, all three ship together.
- **Who can edit:** landlord/agent only, from the tenant's side of the dashboard/app. No tenant self-service edit in this pass.
- **New dedicated endpoint**, not an extension of the `tenant-profile` KYC route.
- **Email uniqueness enforced.** Email is the tenant's login credential (`unique: true` on `User.email`, `backend/src/models/User.ts:7-10`); changing it to one already in use is rejected.
- **Phone change resets WhatsApp verification.** `whatsappVerified`/`whatsappVerifiedAt` (`backend/src/models/User.ts:68-72`) are set back to `false`/`undefined` whenever `phone` changes, so a landlord edit can never silently carry OTP-verified trust onto a number that was never actually verified. The tenant must re-verify via OTP before using WhatsApp-gated features again.
- **Tenant is notified on any change** — email (always) and an in-app notification (`NotificationService.createNotification`), so they're not silently locked out of login (email change) or confused about a WhatsApp re-verification prompt (phone change).
- **No approval/request flow.** Unlike the tenant-submitted `TenantProfileRequest` flow, this is a direct write — the landlord already had full trust to create the account with these exact fields; fixing a typo doesn't need a second confirmation step from the tenant.

## API design (backend)

New route in `backend/src/routes/tenant.ts`, in the same family as the existing guarantor/emergency-contact/tenant-profile lease-scoped routes:

```
PUT /tenants/lease/:leaseId/tenant-identity
```

```ts
router.put(
  '/lease/:leaseId/tenant-identity',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  checkAgentPermission('canAddTenant'), // same tier as creating a tenant
  requireActiveSubscription,
  validate(updateTenantIdentityValidation),
  TenantController.updateTenantIdentity
);
```

**`updateTenantIdentityValidation`** (new, in `backend/src/validations/tenant.ts`): all four fields optional (partial update), but at least one required — `firstName`/`lastName` (non-empty string, trimmed), `email` (valid email, normalized lowercase), `phone` (non-empty string). Mirrors the shape of `assignTenantValidation`'s identity fields.

**`TenantController.updateTenantIdentity`** (new method): follows the current-best pattern already used by `TenantProfileRequestController.getForLease`/`fillForTenant` (`backend/src/controllers/TenantProfileRequestController.ts:213-229, 239-260`) — `const landlordId = req.landlordId?.toString() ?? req.user!._id.toString();` — **not** the older `req.user!._id.toString()`-only pattern still present in `updateGuarantor`/`deleteGuarantor` (`backend/src/controllers/TenantController.ts:259-276`), which is a pre-existing bug: it would mis-scope to the agent's own ID instead of the landlord's, per the `req.landlordId` invariant in `CLAUDE.md`. That's out of scope to fix here, but this new endpoint must not repeat it.

**`TenantService.updateTenantIdentity(leaseId, landlordId, data)`** (new method):
1. `Lease.findById(leaseId)`, 404 if not found.
2. `lease.landlord.toString() !== landlordId` → 403 (same ownership check as `updateGuarantor`).
3. Load the tenant: `User.findById(lease.tenant)`.
4. If `data.email` provided and differs (case-insensitively) from the current email: check `User.findOne({ email: data.email.toLowerCase(), _id: { $ne: tenant._id } })`; if found, `AppError('This email is already in use', 400)`.
5. Track `phoneChanged = data.phone !== undefined && data.phone !== tenant.phone`.
6. Apply the provided fields to `tenant` (`firstName`, `lastName`, `email` lowercased, `phone`).
7. If `phoneChanged`: also set `tenant.whatsappVerified = false`, `tenant.whatsappVerifiedAt = undefined`.
8. `await tenant.save()`.
9. Fire-and-forget notification (same non-blocking `.catch(err => console.error(...))` pattern as `sendTenantNotifications` in `TenantService.ts:160-170`):
   - Email via `emailOtpService.sendEmail(...)` (or a new small `sendTenantIdentityChangedEmail` following the shape of `sendTenantDeletedNotification`, `EmailOtpService.ts:430`), naming exactly what changed and, if phone changed, that WhatsApp re-verification is now required.
   - In-app notification via `NotificationService.createNotification(tenant._id, ...)`.
10. Return the updated tenant summary (`firstName`, `lastName`, `email`, `phone`, `whatsappVerified`) for the UI to refresh with.

## Web (`web/`)

- `web/src/lib/landlord-api.ts`: add `updateTenantIdentity(leaseId, data)` wrapper, same shape as `getTenantProfileForLease`/`updateTenantProfileForLease` (`landlord-api.ts:1577, 1613`).
- `web/src/app/app/leases/[id]/page.tsx`: the tenant header block at lines 461-475 (avatar, `{profile.firstName} {profile.lastName}`, `{profile.email}`, `{profile.phone}`) gets a pencil/edit icon. Clicking it swaps the static header into an inline edit form (four `SmallInput`s, matching the existing guarantor/emergency-contact inline-edit pattern already in this file, e.g. lines 893-938), with Save/Cancel. Save calls the new mutation, invalidates `["tenant-profile", id]` (and `["lease", id]` if the lease summary also echoes tenant name), shows a toast on success, and surfaces the backend's exact error message (duplicate email, permission) via the existing toast/error pattern.

## Mobile (`mobile/`)

- `mobile/src/services/tenantProfileRequest.ts` (or a new small `tenant.ts` sibling if that file is scoped tightly to the request/approval flow — confirm at implementation time): add `updateTenantIdentity(leaseId, data)`.
- `mobile/src/screens/main/TenantDetailsScreen.tsx`: the header at line 326 (`{tenant.firstName} {tenant.lastName}`) gets an edit affordance (matching whatever edit-icon convention the screen already uses elsewhere, e.g. the payment-reminder/end-lease action row), opening a modal/sheet with the four fields, same validation and error surfacing as web.
- Ships to real users only on the next store release per the existing no-OTA pipeline (`CLAUDE.md` mobile release section) — build/merge now, live after TestFlight/Play review.

## Error handling & guards

- Duplicate email → 400 with the exact message, shown as-is (no generic "something went wrong").
- Wrong landlord/agent (lease not owned) → 403, same as every other lease-scoped mutation in this file.
- Partial update: omitting a field leaves it unchanged; at least one field must be present (validation-level, matches the "landlord-fill" profile route's partial-update behavior).
- No retroactive effects on the lease itself — `Lease` doesn't snapshot tenant identity fields (unlike `rentAmount`/fees), so there's nothing else to reconcile.

## Verification (no test runner in this repo)

1. `curl` the new endpoint directly: change a tenant's email to one already used by another user (expect 400), change phone and confirm `whatsappVerified` flips to `false` in Mongo, change firstName/lastName only (confirm phone/whatsappVerified untouched).
2. Confirm the tenant receives the email notification and an in-app notification row appears (`GET /notifications`) after a change.
3. Web: edit each of the four fields from the lease detail page's Tenant profile card, confirm the header updates and a duplicate-email attempt shows the backend's message inline.
4. Mobile: same four-field edit flow from `TenantDetailsScreen`, iOS and Android.
5. Agent path: as an agent with `canAddTenant` permission on an assigned property, confirm the edit succeeds and is correctly scoped to the landlord's tenant (this is the case that would silently break if the new controller used `req.user._id` instead of `req.landlordId`).
6. Backend `tsc --noEmit` and web `tsc --noEmit` are the compile gates throughout.

## Where it lands

- Backend (`property360.git`), web (`property360-web.git`), mobile (`property360-mobile.git`).
- Mobile changes ride the existing tag-triggered fastlane release lanes (`mobile-v*` / `mobile-staging-v*`).

## Future work / non-goals

- Tenant self-service edit of their own name/email/phone. Explicitly deferred, this pass is landlord/agent-only.
- An approval/confirmation step where the tenant must accept the change before it applies. Rejected as unnecessary friction, the landlord already had unilateral control over these fields at creation time.
- Fixing the pre-existing `req.user._id`-vs-`req.landlordId` scoping bug in `updateGuarantor`/`deleteGuarantor`. Noted for awareness, out of scope here.
