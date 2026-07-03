# User-Fundable Wallet (Paystack DVA) — Backend Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the existing landlord `Wallet` into a single per-user wallet that any user can fund by bank transfer to a Paystack DVA and spend on rent invoices, with landlord-only withdrawal reusing the existing payout path.

**Architecture:** Extend `Wallet`/`WalletTransaction` (not new models). Reuse `PaystackDVAService` for DVA provisioning and the proven `SharedBillWallet` webhook/idempotency patterns for inbound credit. Extract the invoice-settlement core of `PaymentGatewayService.processSuccessfulPayment` so both a card charge and a wallet debit settle an invoice identically. Agents access the landlord's wallet via an owner-resolver built on the existing `checkAgentAccessToLandlord`. Everything ships behind `WALLET_FUNDING_ENABLED` (default off).

**Tech Stack:** Node.js / Express 5 / TypeScript / Mongoose, Paystack (DVA + Transfer), Socket.IO.

**Repo note:** The backend is its **own git repo** at `backend/` (`property360.git`). Run every git command with `git -C backend ...`. There is **no test runner** (`npm test` exits 1) — per CLAUDE.md, verification is `npx tsc --noEmit` plus manually exercising the flow (curl / Paystack sandbox webhook simulation). Every task's "verify" step is a typecheck; money-path tasks add a manual check.

**Spec:** `docs/superpowers/specs/2026-07-03-user-fundable-wallet-design.md` (root monorepo).

**Owner-id convention:** `WalletService` methods take a param named `landlordId` that is really "the wallet owner user id" (any role). The `Wallet.landlord` field is kept and widened to mean "owner" (spec decision — no migration). Do not rename it in this plan.

---

## File Structure

**Backend — modify:**
- `backend/src/config/index.ts` — add `wallet.fundingEnabled` flag.
- `backend/src/types/index.ts` — extend `IWallet`, `IWalletTransaction`; add `WalletTransactionSource`.
- `backend/src/models/Wallet.ts` — add DVA fields + `dvaAccountNumber` index.
- `backend/src/models/WalletTransaction.ts` — add `paystackReference` (unique sparse) + `source`.
- `backend/src/services/WalletService.ts` — add `provisionDVA`, `handleInboundCharge`, `handleDVAAssignedWebhook`, `debitForSpend`, `broadcastWalletUpdate`.
- `backend/src/services/PaymentGatewayService.ts` — extract `settleInvoicePayment`; add `payInvoiceFromWallet`; switch rent-credit to `getOrCreateWallet`.
- `backend/src/controllers/SharedBillWalletController.ts` — extend DVA webhook dispatch to fall through to `WalletService`.
- `backend/src/controllers/WalletController.ts` — lazy-provision on read; use resolved owner; add `payInvoice`.
- `backend/src/routes/wallet.ts` — drop `authorize(LANDLORD)`, add owner-resolver, add `pay-invoice`.

**Backend — create:**
- `backend/src/middleware/resolveWalletOwner.ts` — resolves the wallet owner id for all roles.

**Out of this plan (follow-on):** web wallet page (Next.js), mobile wallet screen (React Native). See "Execution Handoff".

---

## Task 1: Config flag `WALLET_FUNDING_ENABLED`

**Files:**
- Modify: `backend/src/config/index.ts` (insert before the `web:` block, ~line 231)
- Modify: `backend/.env.example` (add the documented var)

- [ ] **Step 1: Add the config block**

In `backend/src/config/index.ts`, immediately before the `web: {` block, insert:

```ts
  // User-fundable wallet (Paystack DVA). Master gate: while false, DVA
  // provisioning, funding, and wallet-spend endpoints return 403 "coming
  // soon" so the feature can ship and be sandbox-tested before the e-money
  // custody/compliance question is resolved. See the wallet design spec.
  wallet: {
    fundingEnabled:
      (process.env.WALLET_FUNDING_ENABLED ?? 'false').toLowerCase() === 'true',
  },
```

- [ ] **Step 2: Document the env var**

Add to `backend/.env.example` (and `backend/.env.prod.example`):

```
# Master switch for the user-fundable wallet (Paystack DVA). Default false.
# Leave false in production until e-money custody/compliance is resolved.
WALLET_FUNDING_ENABLED=false
```

- [ ] **Step 3: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git -C backend add src/config/index.ts .env.example .env.prod.example
git -C backend commit -m "feat(wallet): add WALLET_FUNDING_ENABLED config gate"
```

---

## Task 2: Extend `Wallet` model + `IWallet` with DVA fields

**Files:**
- Modify: `backend/src/types/index.ts:569-584` (`IWallet`)
- Modify: `backend/src/models/Wallet.ts`

- [ ] **Step 1: Extend the `IWallet` interface**

In `backend/src/types/index.ts`, replace the `IWallet` interface (lines 569-584) with:

```ts
export interface IWallet extends Document {
  // Owner user (any role). Field name kept as `landlord` for zero-migration
  // reasons; semantically this is "the wallet owner". See wallet design spec.
  landlord: IUser['_id'];
  balance: number;
  totalEarnings: number;
  totalWithdrawn: number;
  pendingBalance: number;
  currency: 'NGN';
  isActive: boolean;
  // Settings
  autoSettlement: boolean;
  autoPayoutEnabled: boolean;
  autoPayoutThreshold: number;
  defaultBankAccount?: IBankAccount['_id'];
  // Paystack DVA funding (per-user). Populated lazily on first wallet open.
  paystackCustomerCode?: string;
  paystackCustomerId?: string;
  dvaAccountNumber?: string;
  dvaBankName?: string;
  dvaProvider?: string;
  dvaProvisionedAt?: Date;
  dvaStatus?: 'pending' | 'active' | 'failed';
  dvaFailureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 2: Add the schema fields**

In `backend/src/models/Wallet.ts`, inside the schema object after the `defaultBankAccount` field (line 54) and before the closing `}`, add:

```ts
    // Paystack DVA funding fields (mirrors SharedBillWallet). The wallet's
    // `landlord` field is the owner user of any role — see the design spec.
    paystackCustomerCode: { type: String, trim: true },
    paystackCustomerId: { type: String, trim: true },
    dvaAccountNumber: { type: String, trim: true },
    dvaBankName: { type: String, trim: true },
    dvaProvider: { type: String, trim: true },
    dvaProvisionedAt: { type: Date },
    dvaStatus: {
      type: String,
      enum: ['pending', 'active', 'failed'],
    },
    dvaFailureReason: { type: String, trim: true },
```

- [ ] **Step 3: Add the DVA lookup index**

In `backend/src/models/Wallet.ts`, after `walletSchema.index({ balance: 1 });` (line 62), add:

```ts
// DVA webhook match key — inbound credits arrive with the account number.
walletSchema.index({ dvaAccountNumber: 1 });
```

- [ ] **Step 4: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git -C backend add src/types/index.ts src/models/Wallet.ts
git -C backend commit -m "feat(wallet): add per-user DVA fields to Wallet model"
```

---

## Task 3: Extend `WalletTransaction` with `paystackReference` + `source`

**Files:**
- Modify: `backend/src/types/index.ts:602-623`
- Modify: `backend/src/models/WalletTransaction.ts`

- [ ] **Step 1: Add the source type + extend the interface**

In `backend/src/types/index.ts`, replace lines 602-623 with:

```ts
// Wallet transaction types
export type WalletTransactionType = 'credit' | 'debit' | 'withdrawal' | 'refund' | 'fee';
export type WalletTransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed';
// Semantic category of a wallet movement, for reporting/attribution.
export type WalletTransactionSource =
  | 'rent-earning'
  | 'dva-topup'
  | 'rent-payment'
  | 'vas'
  | 'withdrawal';

// Wallet Transaction interface
export interface IWalletTransaction extends Document {
  wallet: IWallet['_id'];
  landlord: IUser['_id'];
  type: WalletTransactionType;
  source?: WalletTransactionSource;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: WalletTransactionStatus;
  description: string;
  reference: string;
  // Paystack event reference for inbound DVA credits — deduped by a unique
  // sparse index so a redelivered webhook can't double-credit.
  paystackReference?: string;
  sourceTransaction?: ITransaction['_id'];
  sourceInvoice?: IInvoice['_id'];
  payout?: IPayout['_id'];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 2: Add the schema fields**

In `backend/src/models/WalletTransaction.ts`, add a `source` field right after the `type` field, and a `paystackReference` field right after the `reference` field:

```ts
    source: {
      type: String,
      enum: ['rent-earning', 'dva-topup', 'rent-payment', 'vas', 'withdrawal'],
    },
```

```ts
    paystackReference: { type: String, trim: true },
```

- [ ] **Step 3: Add the dedupe index**

In `backend/src/models/WalletTransaction.ts`, alongside the existing `.index(...)` calls (after line ~73), add:

```ts
// Dedupe inbound DVA charges by Paystack reference (matches SharedBillWalletTransaction).
walletTransactionSchema.index({ paystackReference: 1 }, { unique: true, sparse: true });
```

> Note: confirm the schema variable name is `walletTransactionSchema` by reading the file; if it differs, use the actual name.

- [ ] **Step 4: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git -C backend add src/types/index.ts src/models/WalletTransaction.ts
git -C backend commit -m "feat(wallet): add source + paystackReference dedupe to WalletTransaction"
```

---

## Task 4: WalletService — session-aware spend debit (`debitForSpend`)

**Files:**
- Modify: `backend/src/services/WalletService.ts`

The existing `debitWallet` is withdrawal-specific (hardcodes `type: 'withdrawal'`, `status: 'pending'`, no session) and is used by `PayoutService` — do not change it. Add a separate session-aware spend debit for paying invoices from the wallet.

- [ ] **Step 1: Add the method**

In `backend/src/services/WalletService.ts`, add this method to the `WalletService` class (e.g. after `debitWallet`, ~line 191):

```ts
  /**
   * Debit the wallet for an in-app spend (e.g. paying an invoice), inside the
   * caller's transaction. Distinct from `debitWallet` (which is for pending
   * withdrawals): this records a completed `debit` and never touches
   * totalWithdrawn. Throws on insufficient balance so the whole transaction
   * rolls back.
   */
  async debitForSpend(
    ownerId: string,
    data: {
      amount: number;
      description: string;
      source: 'rent-payment' | 'vas';
      sourceInvoiceId?: string;
      session: ClientSession;
    }
  ): Promise<IWalletTransaction> {
    const wallet = await this.getOrCreateWallet(ownerId, data.session);
    if (!wallet.isActive) {
      throw new AppError('Wallet is not active', 400);
    }
    if (wallet.balance < data.amount) {
      throw new AppError('Insufficient wallet balance', 400);
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - data.amount;

    const [walletTransaction] = await WalletTransaction.create(
      [
        {
          wallet: wallet._id,
          landlord: ownerId,
          type: 'debit',
          source: data.source,
          amount: data.amount,
          balanceBefore,
          balanceAfter,
          status: 'completed',
          description: data.description,
          reference: this.generateReference('debit'),
          sourceInvoice: data.sourceInvoiceId,
        },
      ],
      { session: data.session }
    );

    wallet.balance = balanceAfter;
    await wallet.save({ session: data.session });

    return walletTransaction;
  }
```

- [ ] **Step 2: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git -C backend add src/services/WalletService.ts
git -C backend commit -m "feat(wallet): add session-aware debitForSpend"
```

---

## Task 5: WalletService — DVA provisioning (`provisionDVA`)

**Files:**
- Modify: `backend/src/services/WalletService.ts`

- [ ] **Step 1: Add imports**

At the top of `backend/src/services/WalletService.ts`, extend the imports. Change the models import and add the service/socket/config imports:

```ts
import crypto from 'crypto';
import mongoose, { ClientSession, Types } from 'mongoose';
import {
  Wallet,
  WalletTransaction,
  Lease,
  Transaction,
  User,
  SharedBillWallet,
} from '../models';
import { IWallet, IWalletTransaction, WalletTransactionType } from '../types';
import { AppError } from '../middleware';
import PaystackDVAService from './PaystackDVAService';
import NotificationService from './NotificationService';
import { getIO } from '../socket/socketServer';
import { config } from '../config';
```

> Verify `User` and `SharedBillWallet` are exported from `../models` (they are used elsewhere, e.g. SharedBillWalletService imports both).

- [ ] **Step 2: Add `provisionDVA` + `broadcastWalletUpdate`**

Add these methods to the `WalletService` class:

```ts
  /**
   * Emit a wallet-updated event to the owner's user room so their wallet
   * screen refreshes the balance / DVA status live. Best-effort.
   */
  private broadcastWalletUpdate(wallet: IWallet): void {
    try {
      getIO().to(`user:${wallet.landlord.toString()}`).emit('wallet:updated', wallet);
    } catch {
      /* socket optional */
    }
  }

  /**
   * Provision (or return) the owner's Paystack DVA. Mirrors
   * SharedBillWalletService.provisionDVA: reuses User.paystackCustomerCode,
   * assigns a dedicated account, and stores it on the wallet. Idempotent —
   * returns unchanged when already active.
   *
   * Conflict guard (design spec §6): Paystack binds one DVA per customer, and
   * shared-bill escrow already uses the user's customer. If the assigned NUBAN
   * is already bound to a SharedBillWallet, we mark the wallet DVA failed
   * rather than mis-route funds.
   */
  async provisionDVA(ownerId: string): Promise<IWallet> {
    if (!config.wallet.fundingEnabled) {
      throw new AppError('Wallet funding is not available yet', 403);
    }

    const wallet = await this.getOrCreateWallet(ownerId);
    if (wallet.dvaStatus === 'active') return wallet;

    const owner = await User.findById(ownerId).select(
      'email firstName lastName phone paystackCustomerCode paystackCustomerId'
    );
    if (!owner) throw new AppError('User not found', 404);

    try {
      let customerCode = owner.paystackCustomerCode;
      let customerId = owner.paystackCustomerId;
      if (!customerCode) {
        const customer = await PaystackDVAService.createOrFetchCustomer({
          email: owner.email,
          firstName: owner.firstName,
          lastName: owner.lastName,
          phone: owner.phone,
        });
        customerCode = customer.customerCode;
        customerId = customer.customerId;
        owner.paystackCustomerCode = customerCode;
        owner.paystackCustomerId = customerId;
        await owner.save();
      }

      const dva = await PaystackDVAService.assignDedicatedAccount(customerCode);

      wallet.paystackCustomerCode = customerCode;
      wallet.paystackCustomerId = customerId;
      wallet.dvaProvider = dva.provider;

      if (dva.accountNumber) {
        // Conflict guard: is this NUBAN already a shared-bill escrow account?
        const clash = await SharedBillWallet.findOne({
          dvaAccountNumber: dva.accountNumber,
        }).select('_id');
        if (clash) {
          wallet.dvaStatus = 'failed';
          wallet.dvaFailureReason = 'dva-conflict-shared-bill';
        } else {
          wallet.dvaAccountNumber = dva.accountNumber;
          wallet.dvaBankName = dva.bankName ?? undefined;
          wallet.dvaProvisionedAt = new Date();
          wallet.dvaStatus = 'active';
        }
      } else {
        // Async provider — the dedicatedaccount.assign.success webhook fills
        // the account number later (handleDVAAssignedWebhook).
        wallet.dvaStatus = 'pending';
      }

      await wallet.save();
      this.broadcastWalletUpdate(wallet);
      return wallet;
    } catch (err) {
      wallet.dvaStatus = 'failed';
      wallet.dvaFailureReason =
        err instanceof Error ? err.message : 'Unknown DVA provisioning error';
      await wallet.save();
      this.broadcastWalletUpdate(wallet);
      throw err;
    }
  }
```

- [ ] **Step 3: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors. If `User`/`SharedBillWallet` are not exported from `../models`, import them from their model files directly.

- [ ] **Step 4: Commit**

```bash
git -C backend add src/services/WalletService.ts
git -C backend commit -m "feat(wallet): add per-user DVA provisioning with shared-bill conflict guard"
```

---

## Task 6: WalletService — DVA webhook handlers

**Files:**
- Modify: `backend/src/services/WalletService.ts`

- [ ] **Step 1: Add `handleDVAAssignedWebhook`**

Add to the `WalletService` class:

```ts
  /**
   * Webhook: Paystack `dedicatedaccount.assign.success` for an async DVA
   * provider. Fills the NUBAN on the wallet matched by customer code.
   * No-ops if no wallet matches (it wasn't ours). Applies the same
   * shared-bill conflict guard as provisioning.
   */
  async handleDVAAssignedWebhook(payload: any): Promise<void> {
    const customerCode: string | undefined =
      payload?.data?.customer?.customer_code ?? payload?.customer?.customer_code;
    const accountNumber: string | undefined =
      payload?.data?.dedicated_account?.account_number ??
      payload?.dedicated_account?.account_number;
    const bankName: string | undefined =
      payload?.data?.dedicated_account?.bank?.name ??
      payload?.dedicated_account?.bank?.name;

    if (!customerCode || !accountNumber) return;

    const wallet = await Wallet.findOne({
      paystackCustomerCode: customerCode,
      dvaStatus: { $ne: 'active' },
    });
    if (!wallet) return; // Not a user wallet (maybe a shared bill) — no-op.

    const clash = await SharedBillWallet.findOne({
      dvaAccountNumber: accountNumber,
    }).select('_id');
    if (clash) {
      wallet.dvaStatus = 'failed';
      wallet.dvaFailureReason = 'dva-conflict-shared-bill';
      await wallet.save();
      this.broadcastWalletUpdate(wallet);
      return;
    }

    wallet.dvaAccountNumber = accountNumber;
    wallet.dvaBankName = bankName;
    wallet.dvaStatus = 'active';
    wallet.dvaProvisionedAt = new Date();
    await wallet.save();
    this.broadcastWalletUpdate(wallet);
  }
```

- [ ] **Step 2: Add `handleInboundCharge`**

Add to the `WalletService` class:

```ts
  /**
   * Webhook: Paystack `charge.success` targeting one of our per-user DVAs.
   * Atomically claims the paystackReference, credits the wallet, writes a
   * `dva-topup` ledger row. No-ops if the receiving account isn't a user
   * wallet. Safe against duplicate deliveries (unique sparse paystackReference).
   */
  async handleInboundCharge(payload: any): Promise<void> {
    const paystackReference: string | undefined = payload?.data?.reference;
    const amountKobo: number | undefined = payload?.data?.amount;
    const accountNumber: string | undefined =
      payload?.data?.metadata?.receiver_account_number ??
      payload?.data?.authorization?.receiver_bank_account_number ??
      payload?.data?.dedicated_account?.account_number ??
      payload?.data?.metadata?.account_number;

    if (!paystackReference || !amountKobo || !accountNumber) return;

    const wallet = await Wallet.findOne({
      dvaAccountNumber: accountNumber,
      isActive: true,
    });
    if (!wallet) return; // Not one of our user-wallet DVAs — no-op.

    const amount = amountKobo / 100;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const balanceBefore = wallet.balance;
        const balanceAfter = balanceBefore + amount;

        try {
          await WalletTransaction.create(
            [
              {
                wallet: wallet._id,
                landlord: wallet.landlord,
                type: 'credit',
                source: 'dva-topup',
                amount,
                balanceBefore,
                balanceAfter,
                status: 'completed',
                description: `Wallet top-up (₦${amount.toLocaleString('en-NG')})`,
                reference: this.generateReference('credit'),
                paystackReference,
              },
            ],
            { session }
          );
        } catch (err: any) {
          // Duplicate paystackReference → redelivered webhook. Already processed.
          if (err?.code === 11000) return;
          throw err;
        }

        wallet.balance = balanceAfter;
        await wallet.save({ session });
      });
    } finally {
      session.endSession();
    }

    const refreshed = await Wallet.findById(wallet._id);
    if (refreshed) this.broadcastWalletUpdate(refreshed);

    await NotificationService.createNotification(
      wallet.landlord.toString(),
      'Wallet funded',
      `₦${amount.toLocaleString('en-NG')} was added to your wallet.`,
      'payment',
      { walletId: wallet._id.toString() }
    );
  }
```

> Verify `NotificationService.createNotification(userId, title, message, type, data)` signature against `SharedBillWalletService` usage; match it exactly.

- [ ] **Step 3: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git -C backend add src/services/WalletService.ts
git -C backend commit -m "feat(wallet): add DVA inbound-credit + assign webhook handlers"
```

---

## Task 7: PaymentGatewayService — extract `settleInvoicePayment`

**Files:**
- Modify: `backend/src/services/PaymentGatewayService.ts:333-393`

Refactor the private `processSuccessfulPayment` into a thin caller of a new reusable `settleInvoicePayment` that takes primitives, so the wallet path can reuse it. **Behavior for the card path must be identical** — same Transaction fields, invoice math, and wallet credit.

- [ ] **Step 1: Replace `processSuccessfulPayment` with the extracted core**

Replace the whole `processSuccessfulPayment` method (lines 333-393) with the following two methods:

```ts
  /**
   * Settle an invoice payment from any funding source (Paystack card OR wallet).
   * Creates the Transaction, updates the invoice, and credits the landlord's
   * wallet — all inside the caller's session. Returns identifiers the caller
   * needs for receipt creation. Receipt creation stays outside (best-effort).
   */
  async settleInvoicePayment(params: {
    invoiceId: string;
    tenantId: string;
    landlordId: string;
    amount: number;
    reference: string;
    paymentMethod: 'card' | 'wallet';
    paidAt?: Date;
    notes: string;
    session: ClientSession;
  }): Promise<{ transactionId: string; invoiceNumber: string }> {
    const { session } = params;
    const invoice = await Invoice.findById(params.invoiceId).session(session);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    const [transaction] = await Transaction.create(
      [
        {
          lease: invoice.lease,
          tenant: params.tenantId,
          landlord: params.landlordId,
          amount: params.amount,
          type: 'rent',
          status: 'completed',
          paymentMethod: params.paymentMethod,
          reference: params.reference,
          description: `Payment for invoice ${invoice.invoiceNumber}`,
          paymentDate: params.paidAt ?? new Date(),
          recordedBy: params.tenantId,
          notes: params.notes,
        },
      ],
      { session }
    );

    const newAmountPaid = (invoice.amountPaid || 0) + params.amount;
    const newAmountDue = invoice.total + (invoice.lateFee || 0) - newAmountPaid;

    invoice.payments = invoice.payments || [];
    invoice.payments.push(transaction._id);
    invoice.amountPaid = newAmountPaid;
    invoice.amountDue = newAmountDue;

    if (newAmountDue <= 0) {
      invoice.status = 'paid';
      invoice.paidAt = new Date();
      invoice.paymentTransaction = transaction._id;
    } else {
      invoice.status = 'partially_paid';
    }

    await invoice.save({ session });

    // Credit landlord wallet if auto-settlement is enabled. getOrCreateWallet
    // (not getWalletByLandlord) so a landlord who never opened their wallet
    // still gets credited. Failure here aborts the transaction.
    const wallet = await WalletService.getOrCreateWallet(params.landlordId, session);
    if (wallet.autoSettlement) {
      await WalletService.creditWallet(params.landlordId, {
        amount: params.amount,
        description: `Payment received for Invoice ${invoice.invoiceNumber}`,
        sourceTransactionId: transaction._id.toString(),
        sourceInvoiceId: invoice._id.toString(),
        session,
      });
    }

    return {
      transactionId: transaction._id.toString(),
      invoiceNumber: invoice.invoiceNumber,
    };
  }

  /**
   * Process a successful Paystack card payment — thin wrapper over
   * settleInvoicePayment. Kept for the existing verify/webhook callers.
   */
  private async processSuccessfulPayment(
    paymentGateway: IPaymentGateway,
    session: ClientSession
  ): Promise<void> {
    await this.settleInvoicePayment({
      invoiceId: paymentGateway.invoice.toString(),
      tenantId: paymentGateway.tenant.toString(),
      landlordId: paymentGateway.landlord.toString(),
      amount: paymentGateway.amount,
      reference: paymentGateway.reference,
      paymentMethod: 'card',
      paidAt: paymentGateway.paidAt,
      notes: 'Online payment via Paystack',
      session,
    });
  }
```

- [ ] **Step 2: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors. If `paymentGateway.invoice`/`.tenant`/`.landlord` are typed as ObjectId unions that lack `.toString()` inference, cast via `String(...)`.

- [ ] **Step 3: Manual verification (card path unchanged)**

With a dev backend + Mongo running, drive a sandbox Paystack card payment through `POST /payments/initiate` → verify. Confirm: invoice flips to `paid`, a `Transaction` with `paymentMethod: 'card'` exists, the landlord wallet is credited, a receipt is created. (This proves the refactor preserved behavior.)

- [ ] **Step 4: Commit**

```bash
git -C backend add src/services/PaymentGatewayService.ts
git -C backend commit -m "refactor(payments): extract settleInvoicePayment core; credit via getOrCreateWallet"
```

---

## Task 8: PaymentGatewayService — `payInvoiceFromWallet`

**Files:**
- Modify: `backend/src/services/PaymentGatewayService.ts`

- [ ] **Step 1: Confirm imports**

Ensure `PaymentGatewayService.ts` imports `WalletService`, `Lease`, `Invoice`, `mongoose`, `AppError`, `ReceiptService`, and `config`. Most already exist (WalletService and the receipt path are used). Add any missing ones (`Lease`, `config`).

- [ ] **Step 2: Add the method**

Add to the `PaymentGatewayService` class:

```ts
  /**
   * Pay an invoice from the payer's wallet balance (no Paystack). Debits the
   * wallet and settles the invoice in one transaction, then creates a receipt
   * best-effort. Gated on WALLET_FUNDING_ENABLED.
   */
  async payInvoiceFromWallet(params: {
    invoiceId: string;
    payerId: string;
  }): Promise<{ transactionId: string; invoiceNumber: string; amount: number }> {
    if (!config.wallet.fundingEnabled) {
      throw new AppError('Wallet payments are not available yet', 403);
    }

    const invoice = await Invoice.findById(params.invoiceId);
    if (!invoice) throw new AppError('Invoice not found', 404);
    if (invoice.status === 'paid') {
      throw new AppError('Invoice is already paid', 400);
    }

    const lease = await Lease.findById(invoice.lease).select('tenant landlord');
    if (!lease) throw new AppError('Lease not found for invoice', 404);
    if (lease.tenant.toString() !== params.payerId) {
      throw new AppError('You can only pay your own invoices from your wallet', 403);
    }

    const amountDue =
      invoice.amountDue ?? invoice.total + (invoice.lateFee || 0) - (invoice.amountPaid || 0);
    if (amountDue <= 0) throw new AppError('Nothing due on this invoice', 400);

    const reference = `WLT-${Date.now().toString(36)}-${crypto
      .randomBytes(4)
      .toString('hex')}`.toUpperCase();

    const session = await mongoose.startSession();
    let result: { transactionId: string; invoiceNumber: string } | null = null;
    try {
      await session.withTransaction(async () => {
        await WalletService.debitForSpend(params.payerId, {
          amount: amountDue,
          description: `Rent payment for Invoice ${invoice.invoiceNumber}`,
          source: 'rent-payment',
          sourceInvoiceId: invoice._id.toString(),
          session,
        });
        result = await this.settleInvoicePayment({
          invoiceId: invoice._id.toString(),
          tenantId: lease.tenant.toString(),
          landlordId: lease.landlord.toString(),
          amount: amountDue,
          reference,
          paymentMethod: 'wallet',
          notes: 'Paid from wallet balance',
          session,
        });
      });
    } finally {
      session.endSession();
    }

    if (!result) throw new AppError('Wallet payment failed', 500);
    const settled = result as { transactionId: string; invoiceNumber: string };

    // Best-effort receipt (post-commit) keyed on the new Transaction.
    try {
      await ReceiptService.createReceipt(settled.transactionId, params.payerId, {
        transactionId: settled.transactionId,
        invoiceId: invoice._id.toString(),
        description: `Payment for Invoice ${settled.invoiceNumber}`.trim(),
      });
    } catch (error) {
      console.error('Wallet receipt creation failed (recoverable):', error);
    }

    return { ...settled, amount: amountDue };
  }
```

> Verify `crypto` is imported at the top of the file (it is — used by `handleWebhook`). Verify `ReceiptService.createReceipt(transactionId, userId, opts)` signature against `createReceiptBestEffort`.

- [ ] **Step 3: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git -C backend add src/services/PaymentGatewayService.ts
git -C backend commit -m "feat(wallet): pay invoice from wallet balance"
```

---

## Task 9: Extend the DVA webhook dispatch to user wallets

**Files:**
- Modify: `backend/src/controllers/SharedBillWalletController.ts:157-186` (`handleDVAWebhook`)

The single `POST /webhooks/paystack/dva` handler currently dispatches only to `SharedBillWalletService`. Extend it to also invoke the user-wallet handlers. Each handler no-ops when the account/customer isn't theirs, and a DVA account number is unique to one wallet, so calling both is safe.

- [ ] **Step 1: Import WalletService**

At the top of `backend/src/controllers/SharedBillWalletController.ts`, add:

```ts
import WalletService from '../services/WalletService';
```

- [ ] **Step 2: Extend the dispatch**

In `handleDVAWebhook`, replace the event dispatch block:

```ts
      const event = req.body?.event;
      if (event === 'dedicatedaccount.assign.success') {
        await SharedBillWalletService.handleDVAAssignedWebhook(req.body);
      } else if (event === 'charge.success') {
        await SharedBillWalletService.handleInboundCharge(req.body);
      }
```

with:

```ts
      const event = req.body?.event;
      if (event === 'dedicatedaccount.assign.success') {
        // Shared-bill first, then user wallet. Each no-ops if not theirs.
        await SharedBillWalletService.handleDVAAssignedWebhook(req.body);
        await WalletService.handleDVAAssignedWebhook(req.body);
      } else if (event === 'charge.success') {
        await SharedBillWalletService.handleInboundCharge(req.body);
        await WalletService.handleInboundCharge(req.body);
      }
```

- [ ] **Step 3: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification (inbound credit + dedupe)**

With `WALLET_FUNDING_ENABLED=true` on a dev backend: provision a wallet DVA (Task 11 endpoint), then POST a signed sandbox `charge.success` payload to `/api/v1/webhooks/paystack/dva` with the wallet's `dvaAccountNumber` as the receiver. Confirm: one `credit`/`dva-topup` `WalletTransaction`, balance increased by the amount. Re-POST the identical payload → confirm **no** second credit (dedupe). Use the Paystack HMAC-SHA512 signature over the raw JSON body (see `handleDVAWebhook`).

- [ ] **Step 5: Commit**

```bash
git -C backend add src/controllers/SharedBillWalletController.ts
git -C backend commit -m "feat(wallet): route DVA webhooks to user wallets after shared-bill miss"
```

---

## Task 10: Owner-resolver middleware

**Files:**
- Create: `backend/src/middleware/resolveWalletOwner.ts`
- Modify: `backend/src/middleware/index.ts` (export it, if the project re-exports middleware there)

Resolve the wallet owner for all roles, setting `req.landlordId` (reused as "owner id"): tenant/landlord → their own id; agent → the landlord they supply via `landlordId` (assignment verified). Modeled on `checkAgentAccessToLandlord` (`agentPermission.ts:159`) but permitting tenants.

- [ ] **Step 1: Create the middleware**

```ts
import { Response, NextFunction } from 'express';
import { LandlordAgent } from '../models';
import { AuthRequestWithLandlord, UserRole, AgentInvitationStatus } from '../types';
import { AppError } from './errorHandler';

/**
 * Resolve the wallet owner for a request and attach it as `req.landlordId`
 * (the app-wide "owner id" convention). Tenants and landlords own their own
 * wallet; an agent operates the wallet of the landlord they name via a
 * `landlordId` param/query, verified against an active assignment.
 */
export const resolveWalletOwner = async (
  req: AuthRequestWithLandlord,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = req.user;
    if (!user) throw new AppError('User not authenticated', 401);

    if (user.role === UserRole.TENANT || user.role === UserRole.LANDLORD) {
      req.landlordId = user._id;
      return next();
    }

    if (user.role === UserRole.AGENT) {
      const landlordId = (req.params.landlordId || req.query.landlordId) as
        | string
        | undefined;
      if (!landlordId) {
        throw new AppError('landlordId is required for agent wallet access', 400);
      }
      const assignment = await LandlordAgent.findOne({
        agent: user._id,
        landlord: landlordId,
        status: AgentInvitationStatus.ACCEPTED,
        isActive: true,
      });
      if (!assignment || !assignment.landlord) {
        throw new AppError("You are not authorized to access this landlord's wallet", 403);
      }
      req.landlordId = assignment.landlord;
      return next();
    }

    throw new AppError('Unauthorized', 403);
  } catch (error) {
    next(error);
  }
};

export default resolveWalletOwner;
```

- [ ] **Step 2: Re-export (if applicable)**

If `backend/src/middleware/index.ts` re-exports middleware, add:

```ts
export { resolveWalletOwner } from './resolveWalletOwner';
```

- [ ] **Step 3: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors. Confirm `UserRole.TENANT`/`AGENT`/`LANDLORD` and `AgentInvitationStatus.ACCEPTED` exist (they're used across the codebase).

- [ ] **Step 4: Commit**

```bash
git -C backend add src/middleware/resolveWalletOwner.ts src/middleware/index.ts
git -C backend commit -m "feat(wallet): add resolveWalletOwner middleware (tenant/landlord/agent)"
```

---

## Task 11: WalletController — resolved owner, lazy provisioning, pay-invoice

**Files:**
- Modify: `backend/src/controllers/WalletController.ts`

- [ ] **Step 1: Use the resolved owner + lazy-provision on read**

Replace `getWallet` (lines 10-26) with:

```ts
  /**
   * Get wallet (creates if not exists). Owner is resolved by resolveWalletOwner
   * (self for tenant/landlord, assigned landlord for agent). Kicks DVA
   * provisioning fire-and-forget when funding is enabled and no active DVA yet.
   * GET /wallet
   */
  async getWallet(req: AuthRequestWithLandlord, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.landlordId!.toString();
      const wallet = await WalletService.getOrCreateWallet(ownerId);

      if (
        config.wallet.fundingEnabled &&
        (!wallet.dvaStatus || wallet.dvaStatus === 'pending') &&
        !wallet.dvaAccountNumber
      ) {
        // Fire-and-forget so a Paystack hiccup never blocks the wallet screen.
        WalletService.provisionDVA(ownerId).catch((e) =>
          console.error('DVA provisioning failed:', e)
        );
      }

      res.status(200).json({
        success: true,
        message: 'Wallet retrieved successfully',
        data: wallet,
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }
```

- [ ] **Step 2: Update `getWalletStats` and `getTransactions` to use `req.landlordId`**

In both methods, replace `const userId = req.user!._id.toString();` with `const userId = req.landlordId!.toString();` and change the handler signature type from `AuthRequest` to `AuthRequestWithLandlord`. Leave `updateSettings` using `req.landlordId!` too (it will sit behind `resolveWalletOwner`).

- [ ] **Step 3: Add `payInvoice`**

Add this method (pay-invoice is self-spend, so it uses `req.user._id`, not the resolved owner):

```ts
  /**
   * Pay an invoice from the caller's own wallet balance.
   * POST /wallet/pay-invoice  { invoiceId }
   */
  async payInvoice(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const payerId = req.user!._id.toString();
      const { invoiceId } = req.body;
      if (!invoiceId) throw new AppError('invoiceId is required', 400);

      const result = await PaymentGatewayService.payInvoiceFromWallet({
        invoiceId,
        payerId,
      });

      res.status(200).json({
        success: true,
        message: 'Invoice paid from wallet',
        data: result,
      } as ApiResponse);
    } catch (error) {
      next(error);
    }
  }
```

- [ ] **Step 4: Fix imports**

At the top of `WalletController.ts`, update imports to:

```ts
import { Response, NextFunction } from 'express';
import WalletService from '../services/WalletService';
import PaymentGatewayService from '../services/PaymentGatewayService';
import { config } from '../config';
import { AppError } from '../middleware';
import {
  AuthRequest,
  AuthRequestWithLandlord,
  ApiResponse,
  WalletTransactionType,
} from '../types';
```

- [ ] **Step 5: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git -C backend add src/controllers/WalletController.ts
git -C backend commit -m "feat(wallet): resolved-owner reads, lazy DVA provisioning, pay-invoice endpoint"
```

---

## Task 12: Routes — open `/wallet`, add pay-invoice

**Files:**
- Modify: `backend/src/routes/wallet.ts`

- [ ] **Step 1: Rewrite the router**

Replace the whole file with:

```ts
import { Router } from 'express';
import WalletController from '../controllers/WalletController';
import { protect, requireActiveSubscription } from '../middleware';
import { resolveWalletOwner } from '../middleware/resolveWalletOwner';

const router = Router();

// All routes require authentication. Owner is resolved per-request:
// tenant/landlord → self; agent → the landlord named via ?landlordId=...
router.use(protect);

// GET /wallet — balance + DVA details (lazy-provisions the DVA)
router.get('/', resolveWalletOwner, WalletController.getWallet);

// GET /wallet/stats
router.get('/stats', resolveWalletOwner, WalletController.getWalletStats);

// GET /wallet/transactions
router.get('/transactions', resolveWalletOwner, WalletController.getTransactions);

// POST /wallet/pay-invoice — self-spend from own balance (no owner resolution)
router.post('/pay-invoice', WalletController.payInvoice);

// PATCH /wallet/settings — payout settings (landlord/agent, subscription-gated)
router.patch(
  '/settings',
  resolveWalletOwner,
  requireActiveSubscription,
  WalletController.updateSettings
);

export default router;
```

> Withdrawal stays on the existing `/payouts` router (landlord-only, unchanged). Do not touch it.

- [ ] **Step 2: Typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification (access model)**

With a dev backend: as a **tenant** JWT, `GET /api/v1/wallet` returns the tenant's own wallet (previously 403). As a **landlord** JWT, returns their wallet. As an **agent** JWT without `landlordId`, returns 400; with a valid `?landlordId=`, returns that landlord's wallet; with an unassigned landlord, 403.

- [ ] **Step 4: Commit**

```bash
git -C backend add src/routes/wallet.ts
git -C backend commit -m "feat(wallet): open /wallet to all roles via owner resolver; add pay-invoice route"
```

---

## Task 13: Final verification + funding-gate sweep

**Files:** none (verification only)

- [ ] **Step 1: Confirm the funding gate covers all money-in/spend paths**

Grep and confirm `config.wallet.fundingEnabled` guards: `WalletService.provisionDVA` (Task 5), `PaymentGatewayService.payInvoiceFromWallet` (Task 8), and the lazy-provision trigger in `WalletController.getWallet` (Task 11). Confirm inbound `handleInboundCharge` still credits regardless of the flag if a DVA somehow exists (acceptable — it only fires for accounts we provisioned while enabled).

Run: `cd backend && grep -rn "fundingEnabled" src/`
Expected: matches in `config/index.ts`, `WalletService.ts`, `PaymentGatewayService.ts`, `WalletController.ts`.

- [ ] **Step 2: Full typecheck**

Run: `cd backend && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: End-to-end sandbox checklist (WALLET_FUNDING_ENABLED=true, dev)**

- [ ] Tenant opens wallet → DVA provisions (Wema sync) or goes `pending` (async) then `active` via assign webhook.
- [ ] Simulate `charge.success` on the DVA → one `dva-topup` credit; balance up; redelivery → no double credit.
- [ ] Tenant `POST /wallet/pay-invoice` for an open invoice → wallet debited once (`debit`/`rent-payment`), invoice `paid`, `Transaction.paymentMethod = 'wallet'`, receipt created, landlord wallet credited.
- [ ] Insufficient balance → 400, no partial writes.
- [ ] Existing card payment path still settles correctly (Task 7 check).
- [ ] Landlord `/payouts` withdrawal still works on the (now unified) balance; tenant/agent hitting `/payouts` → 403.
- [ ] Shared-bill creator opening their wallet → `dvaStatus: 'failed'`, reason `dva-conflict-shared-bill`, no crash.
- [ ] With `WALLET_FUNDING_ENABLED=false`: provisioning + pay-invoice endpoints return 403.

- [ ] **Step 4: Final commit / push decision**

Do not push to `main` (auto-deploys to Render) until the sandbox checklist passes and the user approves. When ready, follow the split-repo deploy topology (verify against `origin/main` before fast-forwarding).

---

## Self-Review

- **Spec coverage:** §4 data model → Tasks 2,3. §5 provisioning → Task 5. §6 conflict guard → Tasks 5,6. §7 funding webhook → Tasks 6,9. §8 spend + method choice → Tasks 4,7,8,11,12. §9 withdrawal (reuse /payouts) → unchanged, verified Task 13. §10 API surface → Tasks 10,11,12. §11 idempotency/session → Tasks 3,4,6,8. §3/§13 config gate → Tasks 1,5,8,11,13. §12 clients → follow-on plans.
- **Type consistency:** `settleInvoicePayment` params/return match between Task 7 (definition) and Task 8 (caller). `debitForSpend` signature matches between Task 4 (definition) and Task 8 (caller). `provisionDVA`/`handleInboundCharge`/`handleDVAAssignedWebhook` names consistent across Tasks 5,6,9,11. `req.landlordId` owner convention consistent across Tasks 10,11,12.
- **Placeholders:** none — every code step is complete. Soft "verify the exported name" notes are guardrails against pre-existing naming, not missing content.
- **Method-choice at `initiatePayment`:** the client selects wallet vs Paystack and calls either `/wallet/pay-invoice` or the existing `/payments/initiate`; no backend change to `initiatePayment` is required for Phase A (the wallet path is a separate endpoint). This is intentional and matches the spec.
