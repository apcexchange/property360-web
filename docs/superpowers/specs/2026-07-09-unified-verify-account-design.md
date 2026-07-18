# Unified "Verify Your Account" (phone + KYC) Design

**Date:** 2026-07-09
**Status:** Approved in conversation, pending written review

## Goal

Consolidate the two separate verification surfaces (the "Verify your phone" modal and the buried KYC details page) into **one prominent "Verify your account" journey** that walks the user through phone verification and identity details, shows **one overall verification status**, and adds a visible **resend timer**. Web is the main target (currently split); mobile already has a stepped flow and mainly needs the prominent entry + unified status.

## Why

Today on web, phone verification is a prominent banner+modal, but the KYC details form is a separate page reached through a profile link, so users do not discover it. The two are conceptually one thing to the user ("verify my account") but are presented as two disconnected features. This unifies the presentation without merging the underlying data.

## Key decision: one journey + one status, NOT one backend flag

`phoneVerified` and `kyc.status` stay as **distinct backend signals** (phone ownership is instant via OTP; identity is admin-reviewed and async). We do NOT collapse them into a single flag. Instead the UI presents them as **one journey with one overall status**, derived client-side:

| phone / kyc.status | Overall badge |
|---|---|
| phone not verified, kyc not_started | **Unverified** |
| phone verified, kyc not_started | **Phone verified** (nudge to finish ID) |
| kyc pending | **Pending review** |
| kyc verified | **Verified** |
| kyc rejected | **Action needed** |

The payout gate is unchanged: it keys off `kyc.status === 'verified'` only.

## The flow

One prominent **"Verify your account" banner** (styled like today's phone-verify banner), shown to landlords/agents (and optionally tenants) when overall status is not Verified. It opens a **stepped flow** (modal or page):

1. **Verify phone** (skipped if already `phoneVerified`): the existing WhatsApp-first OTP, with a **visible resend countdown timer** and the code-expiry note (10 min). Reuses the existing OTP send/verify calls.
2. **Your details**: gender, address (street/city/state), ID type + number, ID photo upload, optional selfie, required consent checkbox. Reuses the existing KYC submit endpoint.
3. **Submit** → `kyc.status = pending`; the flow shows a "Submitted, pending review" state. A `rejected` user sees the reason and can resubmit.

If phone is already verified, the flow opens straight to step 2. If a submission is already pending, the banner/flow reflects that instead of prompting again.

## Timer

On the OTP step, show a live **resend countdown** (the 60s cooldown already exists in the backend and modal, surface it as a visible mm:ss countdown that disables "Resend" until it hits zero) plus a line stating the code expires in 10 minutes.

## Backend

**No backend changes.** Everything is already in place: `POST /auth/phone/send-verification` + `/verify`, `POST /kyc/document` (with gender/address/consent), `GET /kyc/status`, and `kyc.status` + `phoneVerified` on the serialized user. The overall status is computed client-side from those two signals.

## Web

Replace the separate phone-banner + hidden KYC page with:
- A prominent **VerifyAccountBanner** (mirrors the current phone-verify banner) gating on overall status.
- A **stepped VerifyAccount flow** (extend the existing `PhoneVerifyModal` for step 1 and the KYC page's form for step 2, or a new combined modal that composes both). Resend countdown added.
- The **overall status badge** by the name (replaces the current verified-only badge with the multi-state one above).

Builds on the existing KYC web work (branch `deploy/kyc-web`).

## Mobile

The stepped `KYCScreen` (phone → details → ID → selfie) already exists. Additions:
- A prominent **verify-account banner/prompt** (like the Dashboard phone-verify prompt) that routes into the flow when overall status is not Verified.
- The **overall multi-state status** (extend the current Profile badge + verification menu row, which today only distinguish verified/pending/not-started).
- Resend countdown on the OTP step (PhoneVerifyModal).

Builds on the existing KYC mobile work (branch `feat/wallet-ui`).

## Out of scope (YAGNI)

- Any backend change (all endpoints + signals already exist).
- Merging `phoneVerified` and `kyc.status` into one stored flag.
- Changing the payout gate (stays on `kyc.status === 'verified'`).
- Third-party ID verification (still manual admin review).

## Risks

- Branch coordination: this extends the not-yet-merged KYC client branches (`deploy/kyc-web`, `feat/wallet-ui`). It should ship together with them, not as a follow-on, to avoid a split intermediate state on production.
- Web layout: web changes are authored against the `deploy/kyc-web` root-`src/` layout (already ported from `feat/founding-50`), so no further remap is needed for that branch.
