# Account Verification (KYC) Design

**Date:** 2026-07-09
**Status:** Approved (design), pending implementation plan

## Goal

Let users verify their identity by submitting their details and a government ID, which the business reviews and approves manually. Verified status gates money/wallet actions for landlords and agents, and shows a "Verified" badge on the user's profile.

## Approach

Self-collected, admin-reviewed KYC. Property360 (a registered business) collects and stores the ID itself rather than calling a third-party verification provider. `verified` therefore means "an admin reviewed the submitted ID," not a NIMC/BVN database check. A future upgrade can swap the manual review for a provider (Dojah, Smile ID, VerifyMe) without changing the data model or the user-facing flow.

## Decisions (locked with the user)

1. **Who:** landlords and agents are required to verify; tenants may verify but are never required.
2. **Gate:** only **money and wallet actions** are blocked (wallet funding, wallet withdrawal/payout). Enforcement keys off the **wallet-owning landlord's** verification: a verified landlord's agent can transact on the landlord's behalf without the agent's own KYC gating it. Browsing, listing, tenant/property management, and rent recording are NOT gated.
3. **Review loop:** submit → `pending` → admins notified → admin approves (`verified`) or rejects (`rejected` + reason) → user notified. A rejected user can fix and re-submit.
4. **Selfie:** optional.
5. **Badge:** verified users show a "Verified" badge beside or below their name.
6. **Phone verification** is the already-built WhatsApp-first OTP (Termii SMS fallback); it is a separate flow and out of scope here.

## What we collect (the "Verify your account" form)

- **Gender** (new field)
- **Address** (existing structured `address`: street, city, state, postalCode)
- **ID type** (default NIN; `IDDocumentType` also allows Driver's License, Passport, Voter's Card)
- **ID number** (the NIN or the chosen document's number)
- **ID card image** (required, uploaded to private Cloudinary)
- **Selfie** (optional, private Cloudinary)
- **Consent checkbox** (NDPA: explicit consent to collect and store the ID)

`dateOfBirth` and `occupation` already exist on the model and may be included as optional fields.

## Data model

Almost everything already exists on the `User` schema and is reused as-is:
- `nin`, `dateOfBirth`, `occupation`, `address` (street/city/state/postalCode)
- `kyc.status` (`KYCStatus`: `not_started` → `pending` → `verified`/`rejected`)
- `kyc.document` (`type` via `IDDocumentType`, `number`, `imageUrl`, `uploadedAt`)
- `kyc.selfieUrl`, `kyc.selfieUploadedAt`, `kyc.verifiedAt`, `kyc.rejectionReason`

New:
- **`gender`** on `User` + a `Gender` enum in types (`male`, `female`, `other`).
- Store ID and selfie images in Cloudinary as **private/authenticated** assets (not public URLs). `kyc.document.imageUrl` / `kyc.selfieUrl` hold the reference; admins view via a short-lived signed URL generated on demand.

## Flow and backend

Layering follows the existing convention (routes → controllers → services → models).

**Submit (user):** `POST /kyc/submit` (protected, any role). Validates fields, uploads the image(s) to private Cloudinary via `CloudinaryService`, writes `nin`/`gender`/`address`/`kyc.document`/`kyc.selfieUrl`, sets `kyc.status = pending`, and creates admin notifications. Re-submission is allowed from `rejected` or `not_started` (blocked while already `pending` or `verified` unless re-verification is requested).

**Status (user):** `GET /kyc/me` returns the user's current `kyc.status` and, if rejected, the `rejectionReason`.

**Review (admin):**
- `GET /admin/kyc?status=pending` lists submissions (with signed image URLs generated per request).
- `POST /admin/kyc/:userId/approve` → `kyc.status = verified`, `verifiedAt = now`, notify the user.
- `POST /admin/kyc/:userId/reject` `{ reason }` → `kyc.status = rejected`, `rejectionReason = reason`, notify the user.

**Gate:** a `requireVerifiedKyc` middleware returns 403 (with a clear "verify your account to use wallet features" message) when the **wallet-owning landlord's** `kyc.status !== 'verified'`. Applied only to the **wallet funding and withdrawal/payout** routes. The gate reads `req.landlordId` (the existing landlord-scoping invariant), so it is the landlord who owns the wallet whose verification is checked, whether a landlord or their agent is the actor. A verified landlord's agent transacts freely; the agent's own KYC is not an additional gate. Tenants are not affected (they do not own landlord wallets).

## Notifications

- **On submit:** in-app notification to admins (Notification model) plus an email to the configured admin address, so review is prompt.
- **On approve/reject:** in-app notification to the user (rejection includes the reason).

## Verified badge

Wherever the user's name is displayed (profile screen/header on mobile and web, and optionally in admin/agent lists), show a small "Verified" badge beside or below the name when `kyc.status === 'verified'`. Driven by the existing `kyc.status` already returned on the user object.

## Admin panel

A KYC review page in the web admin (`web/src/app/admin/...`): a list of pending submissions, each showing the applicant, their submitted fields, and the ID/selfie images via signed URLs, with Approve and Reject (reason) actions wired to the admin endpoints.

## Clients

The "Verify your account" form on **mobile (primary)** and **web**: collects the fields above, uploads the ID (and optional selfie), shows current KYC status, and for a rejected user shows the reason and allows re-submit. Plus the verified badge next to the name.

## Security and compliance (NDPA 2023)

- ID and selfie images stored as **private Cloudinary assets**; never public URLs. Admin viewing uses short-lived signed URLs.
- NIN and document data access restricted to the owning user and admins.
- Explicit **consent** captured at submission and stored.
- Only admins can view submitted documents.
- Retention: documents retained for the account's active life; removed/anonymized on account deletion (consistent with the existing soft-deletion/anonymization policy).

## Rollout / scope order

1. **Backend + admin panel** (submit, review, gate, notifications, private storage). Fully functional and reviewable on its own (curl + admin page).
2. **Mobile client** (form + badge).
3. **Web client** (form + badge).

Phone OTP is already built and independent.

## Out of scope (YAGNI)

- Third-party identity verification (NIMC/BVN check). Manual review only; provider is a future upgrade.
- Selfie liveness/matching (selfie is stored, not matched).
- Gating any non-money action (listings, rent recording, tenant/property management stay open).
- Changes to the phone OTP flow (already built).

## Risks

- Storing NIN and ID images is sensitive PII; the private-storage + consent + admin-only-access measures above are load-bearing, not optional.
- Manual review does not prove authenticity of the ID; `verified` is only as strong as the admin's eyeball. Communicate this internally and plan the provider upgrade before relying on KYC for anything high-stakes.
- Cloudinary private/authenticated delivery must be configured correctly; a misconfiguration that leaves images public would be a serious data exposure. The plan must verify the private setting end to end.
