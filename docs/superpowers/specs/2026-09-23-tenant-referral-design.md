# Tenant Referral ("Invite my landlord/caretaker") Design

Date: 2026-09-23
Repos: backend, web, mobile

## Goal

Let a tenant invite their landlord or caretaker to Property360 in one tap. The tenant sends a prefilled WhatsApp message with their referral link, and Property360 follows up from its business number. When the invitee signs up and makes their first paid subscription payment, the tenant earns 30% of that payment in a new tenant wallet and can withdraw it to their bank. The invitee gets 30 free days.

## Decisions

| Topic | Decision |
|---|---|
| Commission basis | The invitee's subscription fee (there is no separate onboarding fee) |
| Rate | 30%, configurable (`config.tenantReferral.rate`) |
| Frequency | First paid payment only, one time per invitee |
| Who can be invited | Landlords, and caretakers signing up as agents who pay their own subscription |
| Agent billing | Unchanged. Agents managed under a landlord stay covered by the landlord's plan |
| Invitee reward | 30 free days (existing peer bonus), for the invitee only |
| Tenant payout | Withdraw to bank via existing payout flow, ₦1,000 minimum |
| Tenant verification | No KYC. Bank account name must match the tenant's profile name |
| Invite channel | Tenant's own WhatsApp (prefilled) plus Property360 template follow-up |
| Surfaces | Mobile app and web tenant portal |
| Kill switch | None. Backend ships live |

Property360 does not collect rent. The tenant wallet only ever holds referral earnings and is never used for rent.

## Approach

Extend the existing peer referral path in `ReferralService.applyCreditOnFirstPayment` with a tenant branch, and reuse the existing commission ledger (`PartnerCommission`), wallet, bank account and payout code. The partner program and landlord-to-landlord referrals are unchanged.

Rejected: auto-creating a `PartnerCode` per tenant (pollutes the admin partner list, couples tenant rewards to `config.partner.programEnabled`, loses the invitee bonus), and a fully separate tenant referral system (duplicates the tested idempotency and payout logic).

## 1. Attribution and reward (backend)

### Signup attribution
- `AuthService.register` already resolves any user's `referralCode` into `referredBy` for non-tenant signups. A landlord or agent using a tenant's code gets `referredBy = tenant._id`. No change needed.
- `WhatsAppOnboardingService` creates users without a referral code. Those signups are attributed by the phone-match fallback below (the invitee's WhatsApp number becomes their account phone), so no code needs to be threaded through that flow.
- **Phone match fallback:** if a landlord or agent signs up without a code, but their normalised phone matches a `TenantInvite` created in the last 60 days, set `referredBy` to that invite's tenant. If several tenants invited the number, the earliest invite wins.
- On any attributed signup, mark the matching `TenantInvite` as `joined` and link `inviteeUser`.

### First paid payment
In `ReferralService.applyCreditOnFirstPayment`, after the partner branch and before the peer branch: if the referrer's role is `TENANT`, call a new `TenantReferralService.recordCommissionOnConversion(referee, paymentAmountKobo)` which:
1. Returns early if `paymentAmountKobo` is missing or zero (wait for an event carrying the amount, as the partner path does).
2. Runs the abuse checks below. On failure, records nothing.
3. Reserves a `PartnerCommission` row with `source: 'tenant_referral'`, `owner = tenant`, `referee`, `basisAmount` (naira), `rate`, `commissionAmount = round(basis * rate / 100)`. The existing unique `referee` index guarantees one commission per invitee even under concurrent webhook and verify events (duplicate key means already recorded, return).
4. Credits the tenant's wallet via `WalletService.creditWallet` with `metadata.kind = 'tenant_referral_commission'`, then stores the `walletTransaction` id. If the credit fails, delete the reservation (same rollback as `PartnerService`) so a later event can retry.
5. Stamps `referee.referralCreditedAt` and extends the **referee's** subscription by 30 days. The tenant gets no days (they have no subscription). This also fixes today's behaviour where a tenant referrer is "credited" 30 days on a subscription they do not have.
6. Marks the `TenantInvite` as `paid` with the commission amount.

All of this is fire-and-forget from `SubscriptionService` as today. A failure is logged and never blocks payment activation.

### Model changes: `PartnerCommission`
- `partnerCode` becomes optional (required only when `source = 'partner'`).
- Add `source: 'partner' | 'tenant_referral'`, default `'partner'` (existing rows need no migration).

### Abuse checks
- Referee email or phone equals the tenant's: no reward.
- Referee must be role `LANDLORD` or `AGENT`.
- Existing users can't be attributed: `referredBy` is only ever set at signup, and invites to a phone that already belongs to an account are rejected at invite time.

### Refund reversal
`SubscriptionService` has no refund handling today. Add handling for Paystack's `refund.processed` webhook on subscription transactions: if the refunded transaction was the referee's first paid payment, mark the commission `reversed` and, if the tenant's balance covers it, debit the wallet with `kind: 'tenant_referral_reversal'`. If the tenant already withdrew it, keep the row `reversed` and flag it in admin for manual follow-up.

### Config
- `config.tenantReferral.rate` (env `TENANT_REFERRAL_RATE`, default 30).
- `config.tenantReferral.attributionWindowDays` (default 60).

## 2. Tenant wallet and withdrawals (backend)

- Add `UserRole.TENANT` to `authorize(...)` on `routes/wallet.ts` and `routes/payouts.ts`. `routes/bankAccounts.ts` has no role gate and tenants already use it. Tenants already bypass `requireActiveSubscription`.
- Wallets are created lazily on first credit, as for landlords and partners.
- Payouts reuse `PayoutService` unchanged: ₦1,000 minimum, Paystack transfer, history, retry.
- `requireVerifiedKyc` already exempts tenants. Keep it that way.
- **Name match on payout (tenants only):** when a tenant requests a payout, compare the destination bank account's Paystack-resolved name with the tenant's profile name (checked at payout rather than at bank-account add, because tenants already add bank accounts for shared-bill withdrawals, which must keep working for accounts in other names). Compare it with the tenant's `firstName` and `lastName`. Normalise (uppercase, strip punctuation), split into words, and require both the first and last name to appear in the account name in any order. Extra words such as middle names are allowed. On mismatch, reject with `"This account name doesn't match your profile name."` The name compared is the tenant's name as locked at their first referral reward (`referralPayoutName`), so later profile renames can't redirect earnings. The check runs on every payout path (manual, retry, auto-payout), and tenants cannot change wallet settings such as auto-payout. Landlords and partners are unaffected.

## 3. Invite flow

### Tenant action (mobile and web)
1. Tap **Invite my landlord/caretaker**. A form asks for: name (optional), WhatsApp number (optional), relationship (Landlord or Caretaker).
2. Tap **Send on WhatsApp**. The client calls `POST /tenant-referrals/invites`, then opens `https://wa.me/<number>?text=<message>` (or `https://wa.me/?text=<message>` with no number, so the tenant picks a contact).
3. The backend returns the prefilled message text (so wording lives in one place), tailored to the relationship. Example for a landlord:

   > Hello sir, I've been using Property360 as your tenant. It follows up on rent across WhatsApp, SMS and email and records every payment, so no more chasing. Sign up with my link and your first month is free: https://property360.africa/onboarding?ref=CODE

### `TenantInvite` model (new)
| Field | Notes |
|---|---|
| `tenant` | ref User, indexed |
| `name` | optional |
| `phone` | optional, normalised to E.164 (+234...) |
| `relationship` | `'landlord' \| 'caretaker'` |
| `status` | `'sent' \| 'joined' \| 'paid'` |
| `inviteeUser` | ref User, set on join |
| `commissionAmount` | set on paid |
| `followUp` | `{ inviteSentAt, reminderSentAt, optedOut }` |
| timestamps | |

Unique index on `(tenant, phone)` where phone exists.

### Limits
- One invite per phone per tenant (unique index).
- 10 invites per tenant per day (checked in the service).
- If the phone already belongs to a Property360 user, reject with `"This person is already on Property360."`

### Property360 follow-up (only when a phone is given)
- **Immediately:** send template `tenant_referral_invite` through `WhatsAppService.sendTemplate`, with the tenant's first name and the referral link.
- **Day 3, if still `sent`:** send `tenant_referral_reminder` once, from the existing daily cron in `server.ts`.
- Maximum two Property360 messages per invite, ever.
- A `STOP` reply from the number (via the existing WhatsApp inbound handler) sets `optedOut` and suppresses all further referral sends to that phone.
- Template names come from env (`META_WHATSAPP_TEMPLATE_TENANT_REFERRAL_INVITE`, `META_WHATSAPP_TEMPLATE_TENANT_REFERRAL_REMINDER`, plus the Termii and Sendchamp equivalents, following the existing `templates` config pattern). If a name is empty, that send is skipped silently. Everything else works without templates.

**New Meta templates to submit** (the existing `tenantInvited` template is landlord to tenant and does not fit):
1. `tenant_referral_invite` (MARKETING): "Hi, {{1}} invited you to Property360, the easy way to follow up on rent and record every payment. Sign up with their link and your first month is free: {{2}} See you there."
2. `tenant_referral_reminder` (MARKETING): "Hi, a reminder that {{1}} invited you to Property360. Your free first month is still waiting: {{2}} Tap the link to join."

Meta rejects bodies that start or end with a variable, hence the wrapping text. Both carry a "Reply STOP to opt out" footer.

### API (new, tenant only)
- `POST /tenant-referrals/invites` → creates invite, returns `{ invite, whatsappText, whatsappUrl }`
- `GET /tenant-referrals` → `{ referralCode, shareUrl, rate, invites[], totals: { invited, joined, paid, earned } }`

## 4. Screens

### Mobile (tenant app)
- **Refer & Earn card** on the tenant home screen: "Invite your landlord or caretaker, earn 30% of their first subscription."
- **Refer & Earn screen:** invite button (opens the form), referral code with copy, invite list with status ("Invited", "Joined", "You earned ₦19,500"), wallet balance with **Withdraw**.
- **Withdraw:** add bank account (name match), enter amount, history.

### Web (tenant portal)
- New **Refer & Earn** page in the tenant sidebar with the same content. `wa.me` links work on both phone and desktop.

### Admin
- New **Tenant referrals** page backed by `GET /admin/tenant-referrals` (there is no global commissions view today), showing tenant, invitee, commission, status, and reversals flagged `needsReview`.

## Error handling

- Template send failure: logged, invite still succeeds (the tenant's own message is the primary path).
- Wallet credit failure after reservation: reservation rolled back, retried on the next payment event.
- All reward logic is fire-and-forget. Payment activation is never blocked.
- Invite API failure: the client opens WhatsApp only after the invite is saved, so limits and duplicate checks always apply. On failure, show the error and let the tenant retry.

## Testing

Backend unit/integration tests:
- 30% commission computed from the payment amount (including Founding 50).
- Duplicate webhook + verify creates one commission and one wallet credit.
- No reward for self-referral or for a referee created before the invite.
- Referee gets 30 days, tenant gets none.
- Phone-match attribution within 60 days, earliest invite wins, none after 60 days.
- Refund reversal debits the wallet, or flags when already withdrawn.
- Name match accepts reordered and middle names, rejects different names.
- Invite limits: duplicate phone, 10 per day, existing user.
- Day-3 reminder sends once, skips joined and opted-out invites.

Manual end to end: tenant invites, landlord signs up from the link, pays, tenant sees earnings, adds bank account, withdraws.

## Rollout

1. **Backend**, live on deploy (no switch). Submit the two Meta templates in parallel; follow-ups start once their names are set in env.
2. **Web** tenant portal page.
3. **Mobile** tenant screens, shipped with the next app build.

## Out of scope

- Recurring commission on renewals.
- Using the wallet for anything other than withdrawal.
- Requiring agents under a landlord to pay their own subscription.
- AI sales follow-up to unsubscribed users (separate spec, next).
