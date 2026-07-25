# Partner Referral Codes (Affiliate Program) Design

**Status:** Approved design, ready for implementation planning
**Date:** 2026-07-25
**Owner:** Peter (hello@property360.africa)

## Problem

Property360 has a working peer referral system (landlord refers landlord, both get 30 free subscription days on the referred user's first paid subscription). We now want to recruit **business partners** (celebrities, agencies, influencers, associations) and give each a **special, memorable referral code** whose payoff is a **cash commission to the partner**, not subscription days.

Two explicit requirements from the product owner:
1. The code is a **vanity string the admin chooses** (e.g. a celebrity's name, `DAVIDO`), not an auto-generated string.
2. Each partner can have a **different commission percentage**.

## Locked decisions

- **Reward model:** affiliate. The partner earns a commission per paid conversion. The new user gets no extra perk beyond the standard trial.
- **Commission basis:** a **percentage of the referred user's first payment**, credited **once** per converted user. The rate is set **per partner**.
- **Payout:** commission lands as **in-app wallet credit**; the partner **withdraws to their bank** via the existing Payout / Paystack Transfer flow (KYC-gated).
- **Partner identity:** admin mints a code and attaches it to **either an existing user** (reuse their account + wallet) **or a freshly invited external partner** (new lightweight `partner` account).
- **Architecture:** a dedicated `PartnerCode` entity + a `partner` role (Approach B), not fields bolted onto User.
- **Scope:** backend + web only for v1. Partner portal is **web-first**. No mobile screens in v1.

## What already exists (reused, not rebuilt)

- **Attribution capture:** `?ref=CODE` link + the onboarding "referral code" field. `AuthService.register()` resolves a `referralCode` and stamps `referredBy` (skips self-referral and tenant role). We hook into this same path.
- **Conversion trigger:** `ReferralService.applyCreditOnFirstPayment(refereeId)` is already called from three points in `SubscriptionService` (paid-activation verify path + the `charge.success` and `subscription.create` Paystack webhook handlers). We branch inside this existing hook.
- **Idempotency:** `User.referralCreditedAt` already guarantees one credit per referred user. Reused as-is.
- **Wallet + Payout:** the per-user `Wallet` model, `Payout` (Paystack Transfer to `BankAccount`), and `requireVerifiedKyc` on `POST /payouts` all exist from the landlord payout + KYC work.
- **Admin:** admins are Users with `role='admin'`, authenticated via the normal `protect` + `authorize(ADMIN)`; admin pages live under `web/src/app/admin/(app)/`.
- **Feature-flag pattern:** matches `KYC_PAYOUT_GATE_ENABLED` / `WHATSAPP_OTP_ENABLED` in `config` + `render.yaml`.

## Non-goals (v1)

- Recurring commissions (only one-time on first paid conversion). The ledger reserves a shape that extends to recurring later.
- Refund / chargeback reversal automation (the ledger reserves a `reversed` status; no automated flow yet).
- A dedicated mobile partner portal.
- Netting Paystack fees out of the commission basis (v1 uses gross).
- Any new-user acquisition perk tied to partner codes.

## Data model

### `PartnerCode` (new collection)

The code as a first-class, admin-managed object.

- `code` — the vanity string, e.g. `DAVIDO`. Normalized to uppercase, unique. Validated: letters/digits only, ~3 to 20 chars. Uniqueness is checked across **one shared code namespace**: it must not collide with any existing user `referralCode` or another `PartnerCode.code`.
- `ownerUserId` (`ObjectId ref 'User'`) — the User who earns the commission.
- `commissionRate` — percent (e.g. `20`). Per code. Defaults from a global config value; admin overrides per partner.
- `status` — `active` | `disabled`. Disabling retires a code without deleting history.
- `label` / `notes` — free text for admin ("Davido IG campaign").
- `createdBy` (`ObjectId ref 'User'`, the admin), `createdAt`, `updatedAt`.

### `PartnerCommission` (new collection)

The money ledger. One row per converted user.

- `partnerCodeId`, `ownerUserId`, `refereeUserId`.
- `basisAmount` — the referred user's first payment (gross).
- `rate` — the rate **frozen at conversion time**, copied from the code.
- `commissionAmount` — `round(basisAmount * rate / 100)`.
- `status` — `accrued` (credited to wallet, spendable) → `paid_out` / `reversed` (`reversed` reserved, not wired in v1).
- `walletTransactionId` — link to the wallet credit transaction.
- `createdAt`, `updatedAt`.

### User additions

- New `partner` value in the `UserRole` enum (for externally invited partners).
- `referredByPartnerCode` (`ObjectId ref 'PartnerCode'`, optional) — set at signup alongside the existing `referredBy` back-pointer.

## Attribution flow

Reuses the existing capture surface unchanged (`?ref=CODE`, onboarding field, `referralCode` register payload). At registration we resolve the entered code against the shared namespace, in order:

1. Matches an **active `PartnerCode`** → stamp `referredByPartnerCode = code._id` and set `referredBy = code.ownerUserId` (so existing counts and back-pointers keep working). Skip if the registrant is the code owner (self-referral) or role is tenant, matching existing rules.
2. Matches a **user `referralCode`** → the existing peer path, unchanged.
3. Matches nothing → silently ignored (registration always succeeds, as today).

Disabled codes do not attribute new signups (they resolve as "nothing"), but already-attributed users still convert and pay out.

## Conversion to commission

We extend the existing first-paid hook (`ReferralService.applyCreditOnFirstPayment`, already invoked from the three `SubscriptionService` points). When a referred user makes their first paid subscription and passes the existing `referralCreditedAt` idempotency guard:

- If the user has `referredByPartnerCode`:
  - compute `commissionAmount = round(firstPayment * code.rate / 100)`;
  - credit the owner's **Wallet** and record the wallet transaction;
  - write a `PartnerCommission` row (`status: accrued`, rate frozen);
  - **skip** the 30-day peer bonus (a partner is not a peer; the new user gets no extra perk).
- Else → the existing 30-day peer reward, untouched.

The basis is the first successful payment's gross Paystack amount. Trial-only signups never fire (only real payment does), matching today.

## Partner experience

### Existing-user partner (a landlord/agent you flag)

Nothing new to onboard. Admin mints a code pointing at their `userId`. Commission credits their **existing wallet** (co-mingled with rent income, tagged as commission in the transaction history, the approved v1 choice). The referral page/screen they already have is extended to show a "partner earnings" breakdown (code, signups, paid conversions, total earned) when they own a partner code.

### External partner (celebrity / agency / influencer)

- **Invite:** admin invites by email → the partner sets a password → a pending `partner` account activates.
- **Portal (web-first, thin):** a new `partner` role mounts a minimal area instead of the landlord property screens. It reuses existing screens (wallet balance, add bank account, KYC verification, withdraw) plus **one new screen**: "Your code & earnings" (vanity code, rate, signups, paid conversions, total earned, wallet balance, Withdraw button).

### Withdrawal (both types)

Reuses the existing Wallet → Payout (Paystack Transfer to bank) flow, gated on KYC exactly like landlord payouts. Commission **accrues** regardless of KYC; **cashing out** requires KYC + a bank account.

## Admin experience

A new "Partners" section under the existing `admin/(app)/`, reusing admin auth and table patterns.

- **List:** every code with owner, rate, status, signups, paid conversions, total earned, total paid, outstanding.
- **Mint a code:** type the vanity code (live uniqueness + format check), set the rate (pre-filled from the global default, override per partner), pick the owner: search an existing user, **or** invite a new external partner (name + email creates a pending `partner` account + sends the invite).
- **Manage:** enable/disable a code, edit rate/label, and a per-partner detail view listing each conversion (referee, date, basis amount, commission) plus payout history.

## Money handling and compliance

- A partner commission wallet holds money the platform **owes** the partner (a marketing payable), not customer deposits held in trust. This is ordinary affiliate-payout territory and is materially lower-risk than the user-fundable wallet, so it does **not** trip the `WALLET_FUNDING_ENABLED` e-money custody gate. Payouts ride the existing Paystack Transfer rails. Flag to the compliance advisor before go-live, but it is not blocked by that wall.
- Rate is read from the code at conversion time and frozen on the ledger row, so later rate edits never retroactively change past commissions.
- Refund / chargeback reversal is out of scope for v1; the `reversed` status exists so it can be added without a migration.

## Abuse guards and edge cases

- Cannot redeem a code you own (self-referral), and tenant signups are excluded (both already enforced on the peer path).
- Exactly one commission per referred user (idempotent via `referralCreditedAt`).
- Disabled codes stop attributing new signups but still pay out conversions already attributed.
- Commission fires only on a genuine first paid activation.
- Vanity code collisions are prevented at mint time across the shared namespace (user referral codes + partner codes).

## Rollout

- Everything ships behind a `PARTNER_PROGRAM_ENABLED` flag (dark by default), matching the KYC / OTP flag pattern. Config adds the flag + a global default commission rate.
- Deploy backend + web to production with the flag off (nothing exposed), then flip on after minting the first codes.

## Verification (no test runner in this repo)

Exercise the full path manually:
1. Mint a code in admin.
2. Sign up a test user with the code (`?ref=` and the onboarding field).
3. Complete a paid subscription in Paystack test mode.
4. Confirm the `PartnerCommission` row + wallet credit + admin stats.
5. Run a withdrawal through KYC + payout.

Backend `tsc` is the compile gate throughout.

## Where it lands

- Backend (`property360.git`) + web (`property360-web.git`) only for v1. No mobile changes.
- Follows the same branch / PR flow as the KYC and verify-account work.

## Future work

- Recurring commissions (percentage of every renewal).
- Refund / chargeback reversal automation.
- Netting Paystack fees from the basis.
- A separate partner sub-balance instead of co-mingling with an existing-user partner's rent wallet.
- A mobile partner portal.
