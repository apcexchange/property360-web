# User-Fundable Wallet (Paystack DVA) — Design

Date: 2026-07-03
Status: Approved design, pending spec review
Scope: Backend (property360.git) + light mobile/web surfacing

## 1. Goal

Let any user (tenant, landlord, agent) fund a personal wallet by bank transfer to a
Dedicated Virtual Account (DVA), then spend that balance inside the app instead of
re-entering card details for every charge. First spend target is **rent / invoices**.
VAS (airtime, data, bills) is designed for but deferred to Phase B.

Withdrawal to a bank account is restricted to **landlords only**. Tenants and agents
can fund and spend, but not cash out.

## 2. Scope

### Phase A (this spec)
- New `UserWallet` (one per user, any role) with an NGN balance.
- Per-user Paystack DVA provisioning, reusing the existing `PaystackDVAService`.
- Inbound funding: `charge.success` webhook credits the wallet, idempotently.
- Spend: **pay an invoice / rent from wallet balance** (no card, no Paystack fee).
- Withdraw: **landlord-only** cash-out to a verified bank account.
- Append-only `UserWalletTransaction` ledger.

### Phase B (deferred, designed-for not built)
- VAS recharge (airtime / data / bills) via the VTpass `VasService` engine
  (see `docs/superpowers/plans/2026-06-26-bills-payment-vas-v1.md`). The wallet is
  built so VAS drops in later as just another `debit` source.
- Consolidating shared-bill escrow and the personal wallet onto a single per-user DVA
  (see the constraint in Section 6).
- Wallet-to-wallet transfers, auto-pay / standing orders, interest.

### Explicitly out of scope (YAGNI)
- Any non-Paystack custody provider migration (see Section 3).
- Auto top-up, low-balance reminders, spending limits.
- Multi-currency.

## 3. Compliance gate (go-live blocker)

Paystack DVA sweeps inbound funds to our settlement account, so **we hold the balance
as an e-money liability**. Under CBN rules, holding customer e-money generally requires
an MMO licence; a PSSP/Paystack integration does not confer that. This is acceptable
for building and sandbox testing now, but:

> **Do not enable real-money wallet funding in production at scale without either a
> licensed-custody partner (e.g. Safe Haven / Anchor) holding the float, or written
> sign-off from a Nigerian fintech lawyer.**

The implementation ships behind a config flag (`WALLET_FUNDING_ENABLED`, default
`false`) so the code can land and be tested while the compliance decision is pending.
Provisioning, funding, and spend endpoints all short-circuit to a 403 "coming soon"
when the flag is off.

## 4. Data model

Two new models, both mirroring the shape and conventions of the proven
`SharedBillWallet` / `SharedBillWalletTransaction` pair.

### `UserWallet` (`backend/src/models/UserWallet.ts`)
| Field | Type | Notes |
|---|---|---|
| `user` | ObjectId → User | required, **unique** |
| `balance` | Number | default 0, min 0 |
| `currency` | 'NGN' | default 'NGN' |
| `status` | 'active' \| 'frozen' \| 'closed' | default 'active' |
| `paystackCustomerCode` | String | cached; mirrors `User.paystackCustomerCode` |
| `paystackCustomerId` | String | |
| `dvaAccountNumber` | String | funding NUBAN; webhook match key |
| `dvaBankName` | String | |
| `dvaProvider` | String | e.g. `wema-bank` |
| `dvaProvisionedAt` | Date | |
| `dvaStatus` | 'pending' \| 'active' \| 'failed' | default 'pending' |
| `dvaFailureReason` | String | |

Indexes: `{ user: 1 }` unique, `{ dvaAccountNumber: 1 }`.

### `UserWalletTransaction` (`backend/src/models/UserWalletTransaction.ts`)
Append-only ledger.
| Field | Type | Notes |
|---|---|---|
| `wallet` | ObjectId → UserWallet | required |
| `user` | ObjectId → User | denormalized for direct history queries |
| `type` | 'credit' \| 'debit' \| 'withdrawal' \| 'refund' | required |
| `source` | 'dva-topup' \| 'rent' \| 'vas' \| 'withdrawal' \| 'reversal' | required |
| `amount` | Number | min 0 |
| `balanceBefore` / `balanceAfter` | Number | required |
| `status` | 'pending' \| 'completed' \| 'failed' \| 'reversed' | default 'completed' |
| `description` | String | required |
| `reference` | String | required, **unique** (`UW-*` prefixes) |
| `paystackReference` | String | **unique sparse** — dedupes webhook deliveries |
| `relatedInvoice` | ObjectId → Invoice | set on `rent` debits |
| `metadata` | Mixed | |

Indexes: `{ wallet: 1, createdAt: -1 }`, `{ user: 1, createdAt: -1 }`,
`{ paystackReference: 1 }` unique sparse.

Reference prefixes: `UW-CR-` (top-up credit), `UW-DR-` (spend debit),
`UW-OUT-` (withdrawal), `UW-RF-` (refund). Generated exactly like
`SharedBillWalletService.generateTxReference`.

`UserWallet` is **separate from the existing landlord `Wallet`** (rent earnings +
existing payout flow). The landlord `Wallet` is untouched, so the working rent/payout
path keeps functioning. A landlord therefore has two wallets: rent-earnings `Wallet`
(withdrawable today) and this fundable `UserWallet`. Unifying them is a Phase B option,
flagged for the spec review.

## 5. DVA provisioning

Reuses `PaystackDVAService` unchanged. New `UserWalletService.provisionDVA(userId)`
follows `SharedBillWalletService.provisionDVA` almost line-for-line:

1. Load/create the wallet row (`dvaStatus: 'pending'`).
2. Reuse `User.paystackCustomerCode` if present; else
   `PaystackDVAService.createOrFetchCustomer(...)` and cache back onto the `User`.
3. `PaystackDVAService.assignDedicatedAccount(customerCode)`.
   - Sync provider (Wema): account number returned → set `dvaStatus: 'active'`.
   - Async provider (Titan/Providus): stays `pending`; the
     `dedicatedaccount.assign.success` webhook fills it in later.
4. On error: `dvaStatus: 'failed'` + `dvaFailureReason`.

Provisioning is triggered **lazily and fire-and-forget** the first time the user opens
their wallet (`GET /wallet-account/me`): if no wallet row exists we create one in the
request, return `dvaStatus: 'pending'`, and kick `provisionDVA` after the response so a
Paystack outage never blocks the page. The client polls / listens for the DVA to go
active (same UX as shared bills).

## 6. Constraint: one DVA per Paystack customer

**Paystack binds a single dedicated account to a customer.** The shared-bill escrow flow
already provisions a DVA under the **bill creator's** `User.paystackCustomerCode`
(`SharedBillWalletService.provisionDVA`). So a user who is *both* a shared-bill creator
*and* a personal-wallet holder cannot get two independent DVAs under one customer —
Paystack will return the same NUBAN, and inbound funds could not be disambiguated
between "top up my wallet" and "pay my bill share."

**Chosen resolution for Phase A (pragmatic, reversible):**
- The receiving account number is treated as a **globally unique key**: it is recorded
  on at most one wallet across both `SharedBillWallet` and `UserWallet`.
- During `UserWallet` provisioning, after `assignDedicatedAccount` returns a NUBAN, we
  check whether that number is already bound to an active `SharedBillWallet`. If it is,
  we do **not** bind it to the `UserWallet`; we set `dvaStatus: 'failed'` with reason
  `dva-conflict-shared-bill` and surface a wallet-unavailable state to that user.
- The overlap is small in practice: personal-wallet users are overwhelmingly tenants and
  landlords, while shared-bill *creators* are a narrow subset. Phase B consolidates both
  onto one per-user DVA and removes this limitation.

This is the single most important design decision to confirm during spec review; the
alternative (per-purpose Paystack customers via email aliasing) is messier and pollutes
customer records, so it is rejected for the MVP.

## 7. Funding flow (inbound credit)

The existing `POST /webhooks/paystack/dva` handler
(`SharedBillWalletController.handleDVAWebhook`) already verifies the signature and
dispatches on `event`. We extend the dispatch to fall through to the user wallet when
the shared-bill lookup misses:

- `dedicatedaccount.assign.success`: after
  `SharedBillWalletService.handleDVAAssignedWebhook`, if no shared-bill wallet matched
  the customer code, call `UserWalletService.handleDVAAssignedWebhook` (fills the NUBAN
  by `paystackCustomerCode`).
- `charge.success`: after `SharedBillWalletService.handleInboundCharge` finds no wallet
  by receiving account number, call `UserWalletService.handleInboundCharge`, which:
  1. Extracts `reference`, `amount` (kobo), and the receiving account number using the
     same field fallbacks as `handleInboundCharge`.
  2. `findOne({ dvaAccountNumber, status: 'active' })` on `UserWallet`; no-op on miss.
  3. Inside a Mongo transaction: insert a `UserWalletTransaction` (`type: 'credit'`,
     `source: 'dva-topup'`, `paystackReference`) — the unique sparse index makes a
     duplicate delivery throw `11000`, which we catch and treat as already-processed —
     then credit `wallet.balance`.
  4. Notify the user + socket-broadcast the new balance.

To keep the dispatch clean and avoid a growing `if/else` in the controller, the
resolution order is encoded once: **shared-bill wallet first, then user wallet.** Both
match by account number, and an account number is unique to one wallet (Section 6), so
order only matters for the no-op fall-through.

## 8. Spend: pay invoice / rent from wallet

New `POST /wallet-account/pay-invoice` (tenant or landlord/agent acting for the tenant):
1. Load the invoice; authorize that the caller may pay it (same rules the existing
   invoice-payment path uses).
2. Load the caller's `UserWallet`; require `status: 'active'` and
   `balance >= amountDue`.
3. Inside a Mongo transaction: debit the wallet, write a `UserWalletTransaction`
   (`type: 'debit'`, `source: 'rent'`, `relatedInvoice`), and mark the invoice paid
   through the **same InvoiceService path a successful Paystack charge uses**, so
   receipt generation, lease bookkeeping, and notifications stay identical to a card
   payment.
4. Return the updated wallet + invoice.

No new money movement leaves Paystack here — it is an internal ledger transfer from the
user's wallet balance to the invoice. (The landlord's rent-earnings `Wallet` credit, if
any, follows whatever the existing successful-payment path already does; this spec does
not change that path, only adds wallet as a funding source into it.)

## 9. Withdraw: landlord-only

Mirrors the shared-bill withdrawal execution (direct Paystack transfer, own ledger,
no `Payout` record), not the landlord rent-wallet `PayoutService`, to keep `UserWallet`
self-contained.

New `POST /wallet-account/withdraw`, route-gated `authorize(UserRole.LANDLORD)`:
1. Validate amount (min ₦100), verified `BankAccount` owned by the caller, sufficient
   balance, `status: 'active'`.
2. Inside a transaction: debit the wallet, write a `UserWalletTransaction`
   (`type: 'withdrawal'`, `source: 'withdrawal'`, `status: 'pending'`, ref `UW-OUT-*`).
3. Outside the transaction: `PaystackTransferService.initiateTransfer(...)` with that
   reference.
4. The transfer webhook (`PayoutController.handleTransferWebhook`) gains a third
   delegation: after `SharedBillWalletService.handleTransferWebhook` returns false, call
   `UserWalletService.handleTransferWebhook(event, data)` which resolves the `UW-OUT-*`
   reference, flips the debit to `completed` on `transfer.success`, or refunds the
   balance (`type: 'refund'`) on `transfer.failed` / `transfer.reversed`.

There is no multi-party voting (unlike shared bills) — a landlord withdrawing their own
wallet is a single-party action, so execution is immediate.

## 10. API surface

All under a new router `backend/src/routes/userWallet.ts`, mounted at
`/wallet-account` (the name `/wallet` is already taken by the landlord rent wallet).
All behind `protect`.

| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/wallet-account/me` | any | Balance, DVA details, `dvaStatus`; lazy-provisions |
| GET | `/wallet-account/transactions` | any | Paginated ledger |
| POST | `/wallet-account/pay-invoice` | tenant / landlord / agent | Pay an invoice from balance |
| POST | `/wallet-account/withdraw` | landlord only | Cash out to a verified bank account |

Controller: `UserWalletController` (thin, mirrors `SharedBillWalletController`).
Service: `UserWalletService` (all logic + webhook handlers).

## 11. Idempotency, concurrency, money-safety

- Every balance mutation runs inside `session.withTransaction`.
- Inbound credits dedupe on the unique sparse `paystackReference` index; a duplicate
  insert throws `11000` and is swallowed (proven pattern).
- Withdrawals debit first, transfer second; a failed/aborted transfer refunds via a
  compensating `refund` ledger row (proven pattern).
- `balance` has `min: 0` at the schema level as a backstop; spend/withdraw pre-check
  balance inside the transaction.
- The DVA webhook always responds `200` so Paystack stops retrying, even on internal
  error (matches current handler).

## 12. Client surfacing (light, Phase A)

- **Mobile:** a "Wallet" screen showing balance, the fund-by-transfer DVA details
  (account number + bank, copyable), and the transaction list; a "Pay from wallet"
  option on the invoice-pay screen; a "Withdraw" action for landlords. Reuses React
  Query + the socket balance-update event.
- **Web:** deferred unless the user asks — the wallet is a mobile-first surface.

Exact screen wiring is left to the implementation plan.

## 13. Config

- `WALLET_FUNDING_ENABLED` (default `false`) — master gate (Section 3).
- Reuses existing `PAYSTACK_SECRET_KEY`, `PAYSTACK_DVA_PROVIDER`.
- No new vendor credentials.

## 14. Testing (no test runner)

Manual verification, matching repo convention:
- Sandbox Paystack: provision a DVA, simulate `charge.success` → assert one credit row,
  correct balance; re-send the same webhook → assert no double credit.
- `pay-invoice`: assert invoice flips to paid via the normal path (receipt generated),
  wallet debited once, insufficient-balance rejected.
- `withdraw` (landlord): assert debit + transfer initiated; simulate `transfer.failed`
  → assert refund row and restored balance; assert tenant/agent gets 403.
- DVA-conflict path (Section 6): a shared-bill creator opening their wallet →
  `dvaStatus: 'failed'`, reason `dva-conflict-shared-bill`, no crash.

## 15. Rollout

1. Land Phase A behind `WALLET_FUNDING_ENABLED=false`.
2. Sandbox-test end to end.
3. Resolve the compliance gate (Section 3).
4. Flip the flag in production when custody is sorted.
5. Phase B: VAS spend source + single-per-user-DVA consolidation.

## 16. Open questions for spec review

1. **DVA-per-customer resolution (Section 6):** accept the "wallet unavailable for
   active shared-bill creators" limitation for the MVP, or invest now in per-purpose
   Paystack customers?
2. **Two wallets for landlords (Section 4):** keep the fundable `UserWallet` separate
   from the rent-earnings `Wallet`, or unify (larger change, touches the working payout
   path)?
3. **Web surfacing (Section 12):** mobile-only for Phase A, or also add a web wallet
   page now?
