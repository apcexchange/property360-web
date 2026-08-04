# Tenant Identity Edit Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `PUT /tenants/lease/:leaseId/tenant-identity` so a landlord (or an agent with `canAddTenant`) can correct a tenant's first name, last name, email, or phone after the tenant is created — with email-uniqueness enforcement, a WhatsApp-verification reset on phone change, and a notification to the tenant.

**Architecture:** One new method on `TenantService` (`updateTenantIdentity`), one new method on `TenantController`, one new validation export, one new route in `backend/src/routes/tenant.ts`. Follows the exact ownership-check pattern already used by `updateGuarantor` (`Lease.findById` → compare `lease.landlord` to the resolved landlord ID → 403 if mismatched), but resolves the landlord ID via `req.landlordId?.toString() ?? req.user!._id.toString()` (the pattern used by `TenantProfileRequestController`), not the older `req.user!._id`-only pattern `updateGuarantor` uses — that pattern is a known pre-existing bug for agents and must not be repeated here.

**Tech Stack:** Node.js / Express 5 / TypeScript / Mongoose, `express-validator` for request validation.

**Repo:** `backend/` (git repo root `property360.git`, remote `git@github.com:apcexchange/property360.git`).

**Spec:** `docs/superpowers/specs/2026-08-04-tenant-identity-edit-design.md`

---

## Before you start

- **Work in an isolated worktree off `origin/main`.** The backend repo's currently-checked-out branch (`feat/partner-referrals`) has unrelated uncommitted changes to `src/services/TenantService.ts` and other files that must not be touched or swept into this change. Set up the worktree per the `superpowers:using-git-worktrees` skill, based on `origin/main` (this is what's actually deployed to `https://api.property360.africa`), on a new branch, e.g. `feat/tenant-identity-edit`.
- **No test runner exists in this repo** (`npm test` exits 1, per the project's CLAUDE.md). Verification is `tsc --noEmit` (the compile gate) plus manual `curl` against a running dev server where a step says so. Skip a `curl` step if you don't have a local dev server + MongoDB connection available; `tsc` passing is the hard requirement for every task.
- **Notification scope is deliberately email + in-app only**, not SMS/WhatsApp. Sending an arbitrary WhatsApp message requires an approved template (`WhatsAppService.sendTemplate`) and a `canLandlordSendWhatsApp` check that doesn't apply here (this is a system notification, not landlord-initiated messaging); email (`EmailOtpService.sendEmail`, already generic) and in-app (`NotificationService.createNotification`) are the two channels every tenant can already receive regardless of WhatsApp-verification state — which matters here specifically because a phone-number change resets that verification.

---

### Task 1: Add `updateTenantIdentityValidation`

**Files:**
- Modify: `backend/src/validations/tenant.ts`

- [ ] **Step 1: Append the new validation export**

Open `backend/src/validations/tenant.ts`. Go to the end of the file (after the last export, `renewLeaseValidation`'s closing `];`). Append:

```ts

export const updateTenantIdentityValidation = [
  param('leaseId')
    .isMongoId()
    .withMessage('Invalid lease ID'),
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name cannot be empty'),
  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Last name cannot be empty'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('phone')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Phone number cannot be empty'),
  body().custom((_, { req }) => {
    if (
      req.body.firstName === undefined &&
      req.body.lastName === undefined &&
      req.body.email === undefined &&
      req.body.phone === undefined
    ) {
      throw new Error('At least one field must be provided');
    }
    return true;
  }),
];
```

This file already imports `body` and `param` from `express-validator` at the top (used by every other export in the file), no new import needed.

- [ ] **Step 2: Type-check**

Run: `cd backend && npx tsc --noEmit`
Expected: no output (clean pass).

- [ ] **Step 3: Commit**

```bash
git add backend/src/validations/tenant.ts
git commit -m "feat(tenants): add validation for tenant-identity edit route"
```

---

### Task 2: Add `TenantService.updateTenantIdentity`

**Files:**
- Modify: `backend/src/services/TenantService.ts`

- [ ] **Step 1: Add the method**

Open `backend/src/services/TenantService.ts`. Find the `updateGuarantor` method:

```ts
  async updateGuarantor(
    leaseId: string,
    landlordId: string,
    guarantorData: IGuarantor
  ): Promise<IGuarantor> {
    const lease = await Lease.findById(leaseId);
    if (!lease) {
      throw new AppError('Lease not found', 404);
    }

    if (lease.landlord.toString() !== landlordId) {
      throw new AppError('You do not have permission to update this lease', 403);
    }

    lease.guarantor = guarantorData;
    await lease.save();

    return lease.guarantor!;
  }
```

Immediately after it (before `deleteGuarantor`), insert:

```ts

  /**
   * Direct landlord/agent edit of the tenant's core identity fields.
   * Distinct from the tenant-profile (KYC) route: this writes straight to
   * the User document, not a TenantProfileRequest-backed field.
   */
  async updateTenantIdentity(
    leaseId: string,
    landlordId: string,
    data: Partial<Pick<IUser, 'firstName' | 'lastName' | 'email' | 'phone'>>
  ): Promise<{
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    whatsappVerified: boolean;
  }> {
    const lease = await Lease.findById(leaseId);
    if (!lease) {
      throw new AppError('Lease not found', 404);
    }

    if (lease.landlord.toString() !== landlordId) {
      throw new AppError('You do not have permission to update this tenant', 403);
    }

    const tenant = await User.findById(lease.tenant);
    if (!tenant) {
      throw new AppError('Tenant not found', 404);
    }

    if (data.email && data.email.toLowerCase() !== tenant.email) {
      const existing = await User.findOne({
        email: data.email.toLowerCase(),
        _id: { $ne: tenant._id },
      });
      if (existing) {
        throw new AppError('This email is already in use', 400);
      }
    }

    // Phone is tied to WhatsApp OTP verification (whatsappVerified). A
    // landlord edit must never silently carry that verified trust onto a
    // number that was never actually OTP-confirmed, reset it below.
    const phoneChanged = data.phone !== undefined && data.phone !== tenant.phone;

    if (data.firstName !== undefined) tenant.firstName = data.firstName;
    if (data.lastName !== undefined) tenant.lastName = data.lastName;
    if (data.email !== undefined) tenant.email = data.email.toLowerCase();
    if (data.phone !== undefined) tenant.phone = data.phone;

    if (phoneChanged) {
      tenant.whatsappVerified = false;
      tenant.whatsappVerifiedAt = undefined;
    }

    await tenant.save();

    const changedFields = [
      data.firstName !== undefined || data.lastName !== undefined ? 'name' : null,
      data.email !== undefined ? 'email' : null,
      phoneChanged ? 'phone number' : null,
    ].filter((f): f is string => !!f);

    if (changedFields.length > 0) {
      const summary = changedFields.join(' and ');
      const reverifyNote = phoneChanged
        ? ' You will need to re-verify your WhatsApp number before using WhatsApp features again.'
        : '';

      // Fire-and-forget: the tenant's email/phone (their login + WhatsApp
      // verification) just changed, they must not be caught by surprise.
      emailOtpService
        .sendEmail(
          tenant.email,
          'Your Property360 account details were updated',
          `<p>Hi ${tenant.firstName},</p><p>Your landlord updated your ${summary} on Property360.${reverifyNote}</p><p>If this wasn't expected, contact your landlord.</p>`
        )
        .catch((err) =>
          console.error('[TenantService] Failed to send identity-change email:', err)
        );

      NotificationService.createNotification(
        tenant._id.toString(),
        'Account details updated',
        `Your landlord updated your ${summary}.${reverifyNote}`,
        'general',
        { changedFields },
        { respectPreferences: false }
      ).catch((err) =>
        console.error('[TenantService] Failed to create identity-change notification:', err)
      );
    }

    return {
      firstName: tenant.firstName,
      lastName: tenant.lastName,
      email: tenant.email,
      phone: tenant.phone,
      whatsappVerified: tenant.whatsappVerified,
    };
  }
```

`IUser`, `AppError`, `User`, `Lease`, `emailOtpService`, and `NotificationService` are all already imported at the top of this file (used by `assignTenantToUnit` and other existing methods) — no new imports needed.

- [ ] **Step 2: Type-check**

Run: `cd backend && npx tsc --noEmit`
Expected: no output (clean pass).

- [ ] **Step 3: Commit**

```bash
git add backend/src/services/TenantService.ts
git commit -m "feat(tenants): add updateTenantIdentity service method"
```

---

### Task 3: Add `TenantController.updateTenantIdentity`

**Files:**
- Modify: `backend/src/controllers/TenantController.ts`

- [ ] **Step 1: Add the controller method**

Open `backend/src/controllers/TenantController.ts`. Find the `updateGuarantor` method:

```ts
  async updateGuarantor(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      const guarantor = await TenantService.updateGuarantor(
        req.params.leaseId as string,
        req.user!._id.toString(),
        req.body
      );

      const response: ApiResponse = {
        success: true,
        message: 'Guarantor updated successfully',
        data: guarantor,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
```

Immediately after it (before `deleteGuarantor`), insert:

```ts

  async updateTenantIdentity(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      // Use req.landlordId when set (agent acting on behalf of a landlord),
      // falling back to req.user._id for the plain-landlord case. Unlike
      // updateGuarantor above, this must not use req.user._id alone, that
      // would mis-scope to the agent's own ID instead of the landlord's.
      const landlordId = req.landlordId?.toString() ?? req.user!._id.toString();

      // Whitelist explicitly rather than passing req.body straight through,
      // req.body is `any` at this boundary so the service's TS parameter
      // type only restricts a strictly-typed caller, not a raw client.
      const { firstName, lastName, email, phone } = req.body;
      const updates: Parameters<typeof TenantService.updateTenantIdentity>[2] = {};
      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (email !== undefined) updates.email = email;
      if (phone !== undefined) updates.phone = phone;

      const tenant = await TenantService.updateTenantIdentity(
        req.params.leaseId as string,
        landlordId,
        updates
      );

      const response: ApiResponse = {
        success: true,
        message: 'Tenant details updated successfully',
        data: tenant,
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
```

- [ ] **Step 2: Type-check**

Run: `cd backend && npx tsc --noEmit`
Expected: no output (clean pass).

- [ ] **Step 3: Commit**

```bash
git add backend/src/controllers/TenantController.ts
git commit -m "feat(tenants): add updateTenantIdentity controller action"
```

---

### Task 4: Wire the route

**Files:**
- Modify: `backend/src/routes/tenant.ts`

- [ ] **Step 1: Import the new validation**

Find:

```ts
import {
  assignTenantValidation,
  unitIdValidation,
  propertyIdParamValidation,
  searchTenantValidation,
  renewLeaseValidation,
  recordPaymentValidation,
  voidPaymentValidation,
} from '../validations';
```

Replace with:

```ts
import {
  assignTenantValidation,
  unitIdValidation,
  propertyIdParamValidation,
  searchTenantValidation,
  renewLeaseValidation,
  recordPaymentValidation,
  voidPaymentValidation,
  updateTenantIdentityValidation,
} from '../validations';
```

- [ ] **Step 2: Add the route**

Find the tenant-profile route block:

```ts
router.put(
  '/lease/:leaseId/tenant-profile',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  checkAgentPermission('canAddTenant'),
  requireActiveSubscription,
  tenantProfileUpload,
  validate(landlordFillTenantProfileValidation),
  TenantProfileRequestController.fillForTenant
);

// Send payment reminder
```

Replace with:

```ts
router.put(
  '/lease/:leaseId/tenant-profile',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  checkAgentPermission('canAddTenant'),
  requireActiveSubscription,
  tenantProfileUpload,
  validate(landlordFillTenantProfileValidation),
  TenantProfileRequestController.fillForTenant
);

// Direct edit of the tenant's core identity (name/email/phone). Distinct
// from the tenant-profile route above, this touches the User document
// itself, not a TenantProfileRequest-backed field.
router.put(
  '/lease/:leaseId/tenant-identity',
  authorize(UserRole.LANDLORD, UserRole.AGENT),
  checkAgentPermission('canAddTenant'),
  requireActiveSubscription,
  validate(updateTenantIdentityValidation),
  TenantController.updateTenantIdentity
);

// Send payment reminder
```

- [ ] **Step 3: Type-check**

Run: `cd backend && npx tsc --noEmit`
Expected: no output (clean pass).

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/tenant.ts
git commit -m "feat(tenants): wire up PUT tenant-identity route"
```

---

### Task 5: Manual verification (only if a dev server + MongoDB is reachable)

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `cd backend && npm run dev`
Expected: server logs a running-on-port line and a Mongo connection success line. If this fails (no reachable MongoDB in this environment), skip the rest of Task 5, `tsc` passing across Tasks 1-4 is sufficient to hand off.

- [ ] **Step 2: Get a landlord JWT**

```bash
curl -s -X POST http://localhost:5001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<test-landlord-email>","password":"<test-password>"}' | jq -r '.data.token'
```

Save the returned token as `$TOKEN`.

- [ ] **Step 3: Edit a tenant's name only**

Pick an existing `<leaseId>` for a tenant owned by that landlord (from `GET /api/v1/tenants/occupied-units`):

```bash
curl -s -X PUT http://localhost:5001/api/v1/tenants/lease/<leaseId>/tenant-identity \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"firstName": "Chidinma"}'
```

Expected: `{"success":true,"message":"Tenant details updated successfully","data":{"firstName":"Chidinma",...,"whatsappVerified":<unchanged>}}`.

- [ ] **Step 4: Change the phone number, confirm WhatsApp verification resets**

```bash
curl -s -X PUT http://localhost:5001/api/v1/tenants/lease/<leaseId>/tenant-identity \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+2348012345678"}'
```

Expected: response `data.whatsappVerified` is `false`. Confirm in Mongo (`mongosh` or Compass) that the tenant's `whatsappVerified` is `false` and `whatsappVerifiedAt` is unset.

- [ ] **Step 5: Try a duplicate email (expect 400)**

Pick the email of any *other* existing user in the database:

```bash
curl -s -X PUT http://localhost:5001/api/v1/tenants/lease/<leaseId>/tenant-identity \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email": "<another-users-email>"}'
```

Expected: `{"success":false,"message":"This email is already in use"}` with a 400 status.

- [ ] **Step 6: Confirm the notification landed**

```bash
curl -s http://localhost:5001/api/v1/notifications \
  -H "Authorization: Bearer <tenant's own JWT, log in as the tenant>"
```

Expected: the most recent item has `title: "Account details updated"`. Also check the dev server logs for `[EmailOTP] Email sent successfully to ...` (or a Resend error if `RESEND_API_KEY` isn't configured locally, non-blocking either way).

- [ ] **Step 7: Confirm agent-scoping is correct (the case that would silently break with the wrong ID)**

This is the specific regression this plan's controller code was written to avoid (see the note in Task 3, Step 1): if `updateTenantIdentity` used `req.user._id` instead of `req.landlordId`, an agent's edit would 403 even though they're properly permissioned, because the service would compare the *agent's* ID against `lease.landlord` instead of the landlord's. Confirm it doesn't:

Log in as an agent who has an active `LandlordAgent` assignment with `canAddTenant: true` for the property that owns `<leaseId>`:

```bash
curl -s -X POST http://localhost:5001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"<test-agent-email>","password":"<test-password>"}' | jq -r '.data.token'
```

Save as `$AGENT_TOKEN`, then:

```bash
curl -s -X PUT http://localhost:5001/api/v1/tenants/lease/<leaseId>/tenant-identity \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"lastName": "Okafor"}'
```

Expected: `{"success":true,...}`, not a 403. If no agent test account with `canAddTenant` exists locally in this environment, skip this step, it's not blocking, but flag it in the PR description as unverified so a reviewer with access to a full seeded environment checks it before merge.

---

### Task 6: Push and open a PR to `main`

**Files:** none (git operations only)

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/tenant-identity-edit
```

- [ ] **Step 2: Open a PR**

```bash
gh pr create --repo apcexchange/property360 --base main --head feat/tenant-identity-edit \
  --title "feat(tenants): add tenant identity edit endpoint" \
  --body "Adds PUT /tenants/lease/:leaseId/tenant-identity so a landlord/agent can correct a tenant's name, email, or phone after creation. Enforces email uniqueness, resets whatsappVerified on phone change, notifies the tenant (email + in-app). See docs/superpowers/specs/2026-08-04-tenant-identity-edit-design.md."
```

If `gh` isn't authenticated, push prints a compare URL like `https://github.com/apcexchange/property360/pull/new/feat/tenant-identity-edit`, open that manually.
