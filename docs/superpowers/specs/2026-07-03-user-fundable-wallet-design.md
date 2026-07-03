# User-Fundable Wallet (Paystack DVA) — Design

Date: 2026-07-03
Status: Approved design (revised for unified wallet), pending spec review
Scope: Backend (property360.git) + web + mobile

## 1. Goal

Give every user (tenant, landlord, agent) **one wallet** they can fund by bank transfer
to a Dedicated Virtual Account (DVA), then spend inside the app instead of re-entering
card details for every charge.

Decisions locked in with the user:
- **Unified wallet.** We evolve the existing landlord `Wallet` into a single per-user
  wallet. A landlord's rent earnings and their funded balance live in one balance, not
  two. Tenants and agents get the same wallet type.
- **Payment-method choice.** Wherever a user pays in-app (rent invoice in Phase A; VAS
  and subscription later), they choose a method: **Wallet balance** or **Paystack**
  (card / transfer / USSD).
- **Withdrawal is landlord-only** and reuses the existing `/payouts` flow unchanged.
- **Web and mobile** both get wallet UI.

First spend target is rent / invoices. VAS (airtime, data, bills) is designed-for but
deferred to Phase B.

## 2. Scope

### Phase A (this spec)
- Evolve `Wallet` + `WalletTransaction` into a per-user wallet with a fundable DVA.
- Per-user Paystack DVA provisioning, reusing the existing `PaystackDVAService`.
- Inbound funding: `charge.success` webhook credits the wallet, idempotently.
- Spend with method choice: **pay an invoice from wallet balance** (no card, no gateway
  fee) as an alternative to the existing Paystack checkout.
- Withdraw: **landlord-only**, via the existing `/payouts` path (now drawing on the
  unified balance).
- Web + mobile wallet screens: balance, DVA fund-in details, transaction history, and
  "pay from wallet" at checkout.

### Phase B (deferred, designed-for not built)
- VAS recharge (airtime / data / bills) via the VTpass `VasService` engine
  (`docs/superpowers/plans/2026-06-26-bills-payment-vas-v1.md`) as another wallet spend
  source.
- Landlord **subscription paid from wallet** (touches the web/Paystack subscription
  subsystem; flagged as a Phase A candidate in Section 16).
- Card-to-wallet top-up (see the fraud note in Section 3 for why it is deferred).
- Consolidating shared-bill escrow and the personal wallet onto a single per-user DVA
  (see the constraint in Section 6).
- Wallet-to-wallet transfers, auto top-up, spending limits, interest.

## 3. Compliance and fraud gates (go-live blocker)

Paystack DVA sweeps inbound funds to our settlement account, so **we hold the balance as
an e-money liability**. Under CBN rules, holding customer e-money generally requires an
MMO licence; a PSSP/Paystack integration does not confer that.

> **Do not enable real-money wallet funding in production at scale without either a
> licensed-custody partner (e.g. Safe Haven / Anchor) holding the float, or written
> sign-off from a Nigerian fintech lawyer.**

Everything ships behind a config flag (`WALLET_FUNDING_ENABLED`, default `false`) so the
code can land and be sandbox-tested while compliance is pending. Provisioning, funding,
and wallet-spend endpoints short-circuit to a 403 "coming soon" when the flag is off.

**Fraud note — why funding is bank-transfer-only in Phase A:** card-to-wallet top-up
followed by a landlord withdrawal is a card-cash-advance / chargeback vector (and eats a
gateway fee on the way in). Phase A therefore allows funding **only** by bank transfer to
the DVA. Card top-up is deferred until it can ship with guardrails (e.g. non-withdrawable
card-funded balance).

## 4. Data model — evolve, don't duplicate

We extend the two existing models rather than introduce `UserWallet`.

### `Wallet` (`backend/src/models/Wallet.ts`) — widen to per-user
- **Owner semantics:** keep the existing `landlord` field (ObjectId → User, `unique`).
  It becomes "the owner user, any role." This mirrors the existing overload of
  `BankAccount.landlord` (already used as a generic owner id in
  `SharedBillWalletService`). Keeping the field name avoids a data migration on existing
  landlord rows; the semantic widening is documented on the model. (Rename to `owner` is
  the clean alternative but needs a migration — flagged in Section 16.)
- **New DVA fields** (same shape as `SharedBillWallet`): `paystackCustomerCode`,
  `paystackCustomerId`, `dvaAccountNumber`, `dvaBankName`, `dvaProvider`,
  `dvaProvisionedAt`, `dvaStatus` (`'pending' | 'active' | 'failed'`, default
  `'pending'` but only set once provisioning starts), `dvaFailureReason`.
- **New index:** `{ dvaAccountNumber: 1 }` (webhook match key).
- Existing landlord-only fields (`totalEarnings`, `autoSettlement`, `autoPayoutEnabled`,
  `autoPayoutThreshold`, `defaultBankAccount`) stay; they are simply unused defaults for
  tenant/agent wallets. Harmless.

### `WalletTransaction` (`backend/src/models/WalletTransaction.ts`) — add dedupe + source
- **New `paystackReference` field**, indexed `{ unique: true, sparse: true }` — the DVA
  charge-dedupe key. The model has no such field today; this is the one gap versus
  `SharedBillWalletTransaction`.
- **New optional `source` field** for reporting/attribution:
  `'rent-earning' | 'dva-topup' | 'rent-payment' | 'vas' | 'withdrawal'`. Optional so
  existing rows remain valid.
- Existing `type` enum (`'credit' | 'debit' | 'withdrawal' | 'refund' | 'fee'`) and the
  internal unique `reference` (`WT-*`) are unchanged.

Mapping of the new flows onto the ledger:
| Flow | `type` | `source` |
|---|---|---|
| DVA top-up (any user) | `credit` | `dva-topup` |
| Rent received (landlord) | `credit` | `rent-earning` (existing credit path) |
| Pay invoice from wallet (payer) | `debit` | `rent-payment` |
| Landlord withdrawal | `withdrawal` | `withdrawal` (existing payout path) |

## 5. DVA provisioning

Reuses `PaystackDVAService` unchanged. New `WalletService.provisionDVA(ownerId)` follows
`SharedBillWalletService.provisionDVA` closely:
1. `getOrCreateWallet(ownerId)` (already exists); if `dvaStatus === 'active'`, return.
2. Reuse `User.paystackCustomerCode` if present; else
   `PaystackDVAService.createOrFetchCustomer(...)` and cache back onto the `User`.
3. `PaystackDVAService.assignDedicatedAccount(customerCode)` — sync provider (Wema) fills
   the NUBAN immediately (`dvaStatus: 'active'`); async providers stay `pending` until
   the `dedicatedaccount.assign.success` webhook.
4. On error: `dvaStatus: 'failed'` + `dvaFailureReason`.

Triggered **lazily and fire-and-forget** the first time the user opens their wallet: the
`GET /wallet` read creates the row if missing and kicks `provisionDVA` after the response,
so a Paystack outage never blocks the page. Client polls / listens for `dvaStatus` to go
active (same UX as shared bills).

## 6. Constraint: one DVA per Paystack customer

**Paystack binds a single dedicated account to a customer.** The shared-bill escrow flow
already provisions a DVA under the bill creator's `User.paystackCustomerCode`. So a user
who is *both* a shared-bill creator *and* a wallet holder cannot get two independent DVAs
under one customer — Paystack returns the same NUBAN, and inbound funds could not be
disambiguated between "top up my wallet" and "pay my bill share."

**Chosen resolution for Phase A (pragmatic, reversible):**
- The receiving account number is a **globally unique key**: recorded on at most one
  wallet across `SharedBillWallet` and the unified `Wallet`.
- During `Wallet` DVA provisioning, if the returned NUBAN is already bound to an active
  `SharedBillWallet`, do **not** bind it to the `Wallet`; set `dvaStatus: 'failed'`,
  reason `dva-conflict-shared-bill`, and surface a wallet-unavailable state.
- The overlap is small (personal-wallet users are overwhelmingly non-creators). Phase B
  consolidates both onto one per-user DVA and removes this limit.

This is the single most important item to confirm at spec review.

## 7. Funding flow (inbound credit)

The existing `POST /webhooks/paystack/dva` handler already verifies the signature and
dispatches on `event`. We extend the dispatch to fall through to the wallet when the
shared-bill lookup misses — the same "shared-bill first, then X" pattern already used in
`PayoutController.handleTransferWebhook`:

- `dedicatedaccount.assign.success`: after `SharedBillWalletService.handleDVAAssignedWebhook`,
  if no shared-bill wallet matched the customer code, call
  `WalletService.handleDVAAssignedWebhook` (fills the NUBAN by `paystackCustomerCode`).
- `charge.success`: after `SharedBillWalletService.handleInboundCharge` finds no wallet by
  receiving account number, call `WalletService.handleInboundCharge`, which:
  1. Extracts `reference`, `amount` (kobo), and the receiving account number with the
     same field fallbacks as the shared-bill handler.
  2. `findOne({ dvaAccountNumber, ... })` on `Wallet`; no-op on miss.
  3. Inside `session.withTransaction`: insert a `WalletTransaction`
     (`type: 'credit'`, `source: 'dva-topup'`, `paystackReference`) — the unique sparse
     index makes a duplicate delivery throw `11000`, caught and treated as processed —
     then credit `wallet.balance` (reusing/extending `creditWallet`).
  4. Notify the user + socket-broadcast the new balance.

## 8. Spend with payment-method choice

Today there is one payment choke point (`PaymentGatewayService.processSuccessfulPayment`,
`src/services/PaymentGatewayService.ts:333-393`) that marks an invoice paid, records the
`Transaction`, and credits the landlord wallet — reached only via a successful Paystack
charge. We make it method-agnostic.

**Refactor:** extract the settlement core of `processSuccessfulPayment` (invoice
`amountPaid`/status update + `Transaction` create + landlord `creditWallet` + best-effort
receipt) into a reusable method taking primitives — `settleInvoicePayment({ invoiceId,
amount, payerId, paymentMethod, session })`. Both flows call it:
- **Paystack path (existing):** `verifyPayment` → `settleInvoicePayment(..., method: 'card')`.
- **Wallet path (new):** a `POST /wallet/pay-invoice` endpoint that, inside one
  transaction, debits the payer's wallet (`debitWallet`, made session-aware — see
  Section 11) then calls `settleInvoicePayment(..., method: 'wallet')`.

**Method selection** is introduced at the client + at `TenantPaymentController.initiatePayment`:
the pay action takes `method: 'wallet' | 'paystack'`. `'paystack'` keeps the current
hosted-checkout behavior (all channels). `'wallet'` routes to `/wallet/pay-invoice` and
settles synchronously. So a wallet-paid rent invoice: payer's wallet −X, invoice paid,
landlord's wallet +X (rent earning) — identical downstream bookkeeping to a card payment,
just a different funding source, with `Transaction.paymentMethod = 'wallet'`.

**Targeted hardening (in scope):** the rent-credit choke point currently uses
`getWalletByLandlord` (non-creating), so a landlord who never opened their wallet screen
silently misses the credit. Switch it to `getOrCreateWallet` so the unified wallet is
always credited.

## 9. Withdraw — landlord-only, via the existing payout path

**No new withdrawal code.** The `/payouts` router is already `authorize(UserRole.LANDLORD)`
and `PayoutService.requestPayout` already debits the `Wallet`, creates a `Payout`, fires
`PaystackTransferService`, and closes the loop via `PayoutController.handleTransferWebhook`
(which already tries `SharedBillWalletService` first, then `PayoutService`). Because the
unified wallet *is* the `Wallet`, landlords withdraw from the combined balance through
this proven flow, and tenants/agents are blocked by the existing role gate.

The only change here is consequential, not code: the withdrawable balance now includes
DVA-funded money. Since Phase A funding is bank-transfer-only (Section 3), transfer-in
then withdraw is low-risk (just moving money), so no extra guard is needed for the MVP.

## 10. API surface

Wallet routes (`backend/src/routes/wallet.ts`) — **drop the router-wide
`authorize(UserRole.LANDLORD)`** and gate per-endpoint so tenants/agents can hold and
spend a wallet. All behind `protect`.

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/wallet` | any | Balance, DVA details, `dvaStatus`; lazy-provisions |
| GET | `/wallet/transactions` | any | Paginated ledger |
| GET | `/wallet/stats` | any | Existing stats |
| POST | `/wallet/pay-invoice` | any | Pay an invoice from wallet balance |
| PATCH | `/wallet/settings` | landlord | Existing payout settings (keep landlord-gated) |

Withdrawal stays on the existing `/payouts` router (unchanged, landlord-only). The DVA
webhook stays on `/webhooks/paystack/dva` (dispatch extended per Section 7).

## 11. Idempotency, concurrency, money-safety

- Inbound credits dedupe on the new unique sparse `WalletTransaction.paystackReference`;
  a duplicate insert throws `11000` and is swallowed (proven pattern).
- **Make `WalletService.debitWallet` session-aware** (it is not today) so the
  wallet-spend flow debits and settles the invoice in one atomic transaction. This is a
  backward-compatible addition of an optional `session`.
- Withdrawals keep the existing debit-then-transfer-then-reverse-on-failure machinery in
  `PayoutService` (unchanged).
- `Wallet.balance` keeps its schema `min: 0` backstop; spend/withdraw pre-check inside
  the transaction.
- The DVA webhook always responds `200` so Paystack stops retrying, even on internal
  error (matches the current handler).

## 12. Client surfacing — web + mobile

- **Mobile:** a Wallet screen (balance, copyable DVA fund-in details, transaction list);
  a "Pay from wallet vs card" method toggle on the invoice-pay screen; landlords keep the
  existing withdraw action, now on the unified balance. Reuses React Query + the socket
  balance-update event.
- **Web:** a matching wallet page in the Next.js dashboard (balance, DVA fund-in details,
  transactions) and the same method toggle at invoice checkout. The web app already has
  billing/subscription pages to sit alongside.
- Exact screen wiring is left to the implementation plan.

## 13. Config

- `WALLET_FUNDING_ENABLED` (default `false`) — master gate (Section 3).
- Reuses existing `PAYSTACK_SECRET_KEY`, `PAYSTACK_DVA_PROVIDER`.
- No new vendor credentials.

## 14. Testing (no test runner)

Manual verification, matching repo convention:
- Sandbox Paystack: provision a DVA, simulate `charge.success` → assert one `dva-topup`
  credit row, correct balance; re-send the same webhook → assert no double credit.
- `pay-invoice`: assert invoice flips to paid via `settleInvoicePayment` (receipt
  generated, landlord credited), payer wallet debited once, insufficient-balance rejected,
  `Transaction.paymentMethod === 'wallet'`.
- Method choice: `initiatePayment` with `method: 'paystack'` still opens hosted checkout
  unchanged.
- Withdraw (landlord): existing `/payouts` still works on the unified balance; simulate
  `transfer.failed` → balance restored; tenant/agent gets 403 on `/payouts`.
- DVA-conflict path (Section 6): a shared-bill creator opening their wallet →
  `dvaStatus: 'failed'`, reason `dva-conflict-shared-bill`, no crash.

## 15. Rollout

1. Land Phase A behind `WALLET_FUNDING_ENABLED=false`.
2. Sandbox-test end to end.
3. Resolve the compliance gate (Section 3).
4. Flip the flag in production when custody is sorted.
5. Phase B: VAS + subscription spend sources, single-per-user-DVA consolidation.

## 16. Open questions for spec review

1. **DVA-per-customer resolution (Section 6):** accept the "wallet unavailable for active
   shared-bill creators" limitation for the MVP, or invest now in per-purpose Paystack
   customers?
2. **Owner field (Section 4):** keep the `Wallet.landlord` field and widen its meaning
   (zero migration, slightly misleading name), or rename to `owner` now (clean name, data
   migration on existing landlord rows)?
3. **Subscription-from-wallet (Section 2/8):** the "pay from wallet" mechanism is general.
   Pull landlord subscription payment into Phase A as a concrete landlord method-choice,
   or leave it for Phase B with VAS?
