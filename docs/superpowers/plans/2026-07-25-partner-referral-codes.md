# Partner Referral Codes (Affiliate Program) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let an admin mint custom vanity referral codes for business partners, each with its own commission rate, and pay the partner a percentage of each referred user's first subscription payment as withdrawable wallet credit.

**Architecture:** A dedicated `PartnerCode` entity + `PartnerCommission` ledger, a new `partner` role, and a commission branch inside the *existing* first-paid hook (`ReferralService.applyCreditOnFirstPayment`). Attribution reuses the existing `?ref=CODE` signup path (partner codes resolve ahead of peer codes in one shared namespace). Payout, wallet, and KYC reuse the existing bearer-scoped endpoints. Everything ships behind `PARTNER_PROGRAM_ENABLED` (dark by default). Backend (`property360.git`) + web (`property360-web.git`) only; no mobile.

**Tech Stack:** Node/Express 5 + TypeScript + Mongoose (backend); Next.js App Router + react-query + Tailwind (web, `feat/founding-50` branch, `web/src/` layout). No test runner in any package, so each task gates on `tsc` (backend: `npm run build`; web: `npx tsc --noEmit`) plus explicit manual verification via curl / screen walkthrough. Reference the design at `docs/superpowers/specs/2026-07-25-partner-referral-codes-design.md`.

**Conventions carried from the spec:** amounts stored in NGN (naira); Paystack amounts arrive in kobo (÷100). Commission rate is a **percent** (e.g. `20` = 20%); `commissionAmount = round(basisNaira * rate / 100)`. One shared code namespace: a partner code must not collide with any `User.referralCode` or another `PartnerCode.code`.

---

## File Structure

**Backend (create):**
- `backend/src/models/PartnerCode.ts` — the vanity code entity.
- `backend/src/models/PartnerCommission.ts` — the per-conversion money ledger.
- `backend/src/services/PartnerService.ts` — mint/invite/resolve/record/stats logic (the only place that touches partner models + credits partner wallets).
- `backend/src/controllers/PartnerController.ts` — partner self endpoint (`GET /partner/me`).
- `backend/src/routes/partner.ts` — partner self route.

**Backend (modify):**
- `backend/src/types/index.ts` — `UserRole.PARTNER`, `IUser.referredByPartnerCode`, `IPartnerCode`, `IPartnerCommission`, status unions.
- `backend/src/models/User.ts` — `referredByPartnerCode` field.
- `backend/src/models/index.ts` — register the two new models.
- `backend/src/config/index.ts` — `config.partner` block.
- `backend/src/services/AuthService.ts` — partner-code attribution in `register()`.
- `backend/src/services/ReferralService.ts` — commission branch in `applyCreditOnFirstPayment` + amount param.
- `backend/src/services/SubscriptionService.ts` — pass payment amount at the 3 call sites (add `amount` to the verify inline type).
- `backend/src/services/EmailOtpService.ts` — `sendPartnerInvitation`.
- `backend/src/controllers/AdminController.ts` + `backend/src/services/AdminService.ts` — partner admin methods.
- `backend/src/routes/admin.ts` — partner admin routes.
- `backend/src/routes/payouts.ts`, `backend/src/routes/wallet.ts`, `backend/src/routes/bankAccounts.ts` — widen role authorization to include `PARTNER`.
- `backend/src/routes/index.ts` — mount `/partner`.
- `backend/render.yaml`, `backend/.env.prod.example`, `backend/.env.dev` — new env vars.

**Web (create):**
- `web/src/lib/partner-api.ts` — partner self API client.
- `web/src/app/partner/layout.tsx`, `web/src/components/partner/AuthGate.tsx`, `web/src/components/partner/Sidebar.tsx` — the partner shell.
- `web/src/app/partner/page.tsx` — code + earnings + wallet + withdraw + bank + KYC (consolidated portal).
- `web/src/app/admin/(app)/partners/page.tsx` — admin list + mint + invite.
- `web/src/app/admin/(app)/partners/[id]/page.tsx` — admin per-partner detail.

**Web (modify):**
- `web/src/lib/admin.ts` — partner admin API methods + types.
- `web/src/components/admin/Sidebar.tsx` — "Partners" nav entry.
- `web/src/app/login/page.tsx` — `partner` role dispatch in `safeNext`.
- `web/src/app/app/refer/page.tsx` — partner-earnings section for existing-user partners.

---

## PHASE A — Backend (ships dark behind `PARTNER_PROGRAM_ENABLED`)

### Task A1: Config flag + env

**Files:**
- Modify: `backend/src/config/index.ts` (after the `kyc` block, ~line 327)
- Modify: `backend/render.yaml`, `backend/.env.prod.example`, `backend/.env.dev`

- [ ] **Step 1: Add the `partner` config block**

In `backend/src/config/index.ts`, immediately after the `kyc: { ... }` block, add:

```ts
  partner: {
    // Affiliate partner program. Default OFF so backend + web deploy dark;
    // flip PARTNER_PROGRAM_ENABLED=true once codes are minted.
    programEnabled:
      (process.env.PARTNER_PROGRAM_ENABLED ?? 'false').toLowerCase() === 'true',
    // Commission percent pre-filled in the admin mint form (per-code override
    // always wins). 10 = 10% of the referred user's first payment.
    defaultCommissionRate: Number(process.env.PARTNER_DEFAULT_COMMISSION_RATE || 10),
  },
```

- [ ] **Step 2: Declare the env vars for both services in `render.yaml`**

For each service block that already has `KYC_PAYOUT_GATE_ENABLED`, add alongside it:

```yaml
      - key: PARTNER_PROGRAM_ENABLED
        value: "false"
      - key: PARTNER_DEFAULT_COMMISSION_RATE
        value: "10"
```

- [ ] **Step 3: Add to env example + dev**

Append to `backend/.env.prod.example`:
```
PARTNER_PROGRAM_ENABLED=false
PARTNER_DEFAULT_COMMISSION_RATE=10
```
Append to `backend/.env.dev`:
```
PARTNER_PROGRAM_ENABLED=true
PARTNER_DEFAULT_COMMISSION_RATE=10
```
(Dev on so you can exercise the flow locally.)

- [ ] **Step 4: Compile gate**

Run: `cd backend && npm run build`
Expected: `tsc` exits 0 (config typed object accepts the new block).

- [ ] **Step 5: Commit**

```bash
cd backend && git add src/config/index.ts render.yaml .env.prod.example .env.dev
git commit -m "feat(partner): add PARTNER_PROGRAM_ENABLED flag + default rate config"
```

---

### Task A2: UserRole.PARTNER + attribution field on User

**Files:**
- Modify: `backend/src/types/index.ts` (UserRole enum ~5-10; IUser referral fields ~102-104)
- Modify: `backend/src/models/User.ts` (referral schema fields ~150-162)

- [ ] **Step 1: Add the `PARTNER` role**

In `backend/src/types/index.ts`, extend `UserRole`:

```ts
export enum UserRole {
  LANDLORD = 'landlord',
  TENANT = 'tenant',
  AGENT = 'agent',
  ADMIN = 'admin',
  PARTNER = 'partner',
}
```

- [ ] **Step 2: Add `referredByPartnerCode` to the IUser interface**

In `backend/src/types/index.ts`, right after the existing `referralCreditedAt?: Date;` (line ~104):

```ts
  // Set at signup when the user arrived via a partner (affiliate) code.
  // Distinct from referredBy (which we also stamp to the code's owner so
  // existing referral counts keep working). Drives the commission branch.
  referredByPartnerCode?: IPartnerCode['_id'];
```

(This references `IPartnerCode`, defined in Task A3. If you implement A2 before A3, temporarily type it `Types.ObjectId`; A3 replaces it. To avoid churn, do Task A3 first, then this line — the plan lists A2 before A3 only for narrative order; implement A3's type block first if your build complains.)

- [ ] **Step 3: Add the schema field on the User model**

In `backend/src/models/User.ts`, right after the `referralCreditedAt: { type: Date },` line (~162):

```ts
    referredByPartnerCode: {
      type: Schema.Types.ObjectId,
      ref: 'PartnerCode',
    },
```

- [ ] **Step 4: Compile gate**

Run: `cd backend && npm run build`
Expected: 0 errors (after Task A3's types exist; if running standalone, expect the `IPartnerCode` reference error, which A3 resolves).

- [ ] **Step 5: Commit**

```bash
cd backend && git add src/types/index.ts src/models/User.ts
git commit -m "feat(partner): add PARTNER role + referredByPartnerCode on User"
```

---

### Task A3: PartnerCode model + types

**Files:**
- Create: `backend/src/models/PartnerCode.ts`
- Modify: `backend/src/types/index.ts` (add IPartnerCode + status union)
- Modify: `backend/src/models/index.ts` (export the model)

- [ ] **Step 1: Add types**

In `backend/src/types/index.ts` (near the other model interfaces), add:

```ts
export type PartnerCodeStatus = 'active' | 'disabled';

export interface IPartnerCode extends Document {
  code: string; // uppercase, unique across the shared referral namespace
  owner: IUser['_id']; // the user who earns commission
  commissionRate: number; // percent, 0..100
  status: PartnerCodeStatus;
  label?: string; // admin note, e.g. "Davido IG campaign"
  createdBy: IUser['_id']; // admin who minted it
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 2: Create the model**

Create `backend/src/models/PartnerCode.ts`:

```ts
import { Schema, model } from 'mongoose';
import { IPartnerCode } from '../types';

const partnerCodeSchema = new Schema<IPartnerCode>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    commissionRate: { type: Number, required: true, min: 0, max: 100 },
    status: {
      type: String,
      enum: ['active', 'disabled'],
      default: 'active',
      index: true,
    },
    label: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const PartnerCode = model<IPartnerCode>('PartnerCode', partnerCodeSchema);
export default PartnerCode;
```

- [ ] **Step 3: Register in the models barrel**

In `backend/src/models/index.ts`, add (matching the file's existing export style):

```ts
export { PartnerCode, default as PartnerCodeModel } from './PartnerCode';
```

(If the barrel uses a different style, e.g. `export * from './Wallet';`, use `export * from './PartnerCode';` instead — match the surrounding lines exactly.)

- [ ] **Step 4: Compile gate**

Run: `cd backend && npm run build`
Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
cd backend && git add src/models/PartnerCode.ts src/models/index.ts src/types/index.ts
git commit -m "feat(partner): add PartnerCode model + types"
```

---

### Task A4: PartnerCommission ledger model + types

**Files:**
- Create: `backend/src/models/PartnerCommission.ts`
- Modify: `backend/src/types/index.ts`
- Modify: `backend/src/models/index.ts`

- [ ] **Step 1: Add types**

In `backend/src/types/index.ts`:

```ts
export type PartnerCommissionStatus = 'accrued' | 'paid_out' | 'reversed';

export interface IPartnerCommission extends Document {
  partnerCode: IPartnerCode['_id'];
  owner: IUser['_id'];
  referee: IUser['_id']; // unique — one commission per referred user
  basisAmount: number; // referred user's first payment, in NGN
  rate: number; // percent, frozen at conversion time
  commissionAmount: number; // NGN
  status: PartnerCommissionStatus;
  walletTransaction?: IWalletTransaction['_id'];
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 2: Create the model**

Create `backend/src/models/PartnerCommission.ts`:

```ts
import { Schema, model } from 'mongoose';
import { IPartnerCommission } from '../types';

const partnerCommissionSchema = new Schema<IPartnerCommission>(
  {
    partnerCode: { type: Schema.Types.ObjectId, ref: 'PartnerCode', required: true, index: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Unique referee guarantees one commission per converted user even under
    // concurrent webhook + verify events (the duplicate-key error is caught).
    referee: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    basisAmount: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0, max: 100 },
    commissionAmount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['accrued', 'paid_out', 'reversed'],
      default: 'accrued',
      index: true,
    },
    walletTransaction: { type: Schema.Types.ObjectId, ref: 'WalletTransaction' },
  },
  { timestamps: true }
);

export const PartnerCommission = model<IPartnerCommission>(
  'PartnerCommission',
  partnerCommissionSchema
);
export default PartnerCommission;
```

- [ ] **Step 3: Register in the barrel**

In `backend/src/models/index.ts`, matching style:

```ts
export { PartnerCommission, default as PartnerCommissionModel } from './PartnerCommission';
```

- [ ] **Step 4: Compile gate + confirm `IWalletTransaction` import resolves**

Run: `cd backend && npm run build`
Expected: 0 errors. If `IWalletTransaction` is unresolved in `types/index.ts`, it is already declared there (used by WalletService); confirm the name via `grep -n "IWalletTransaction" src/types/index.ts`.

- [ ] **Step 5: Commit**

```bash
cd backend && git add src/models/PartnerCommission.ts src/models/index.ts src/types/index.ts
git commit -m "feat(partner): add PartnerCommission ledger model + types"
```

---

### Task A5: PartnerService — resolve + record commission

**Files:**
- Create: `backend/src/services/PartnerService.ts`

- [ ] **Step 1: Create the service with resolve + record (the signup + conversion primitives)**

Create `backend/src/services/PartnerService.ts`:

```ts
import { PartnerCode, PartnerCommission, User } from '../models';
import { IPartnerCode, IUser } from '../types';
import WalletService from './WalletService';

class PartnerService {
  /**
   * Resolve a raw code entered at signup to an ACTIVE partner code.
   * Returns null for unknown or disabled codes (attribution then falls
   * through to the peer referral path).
   */
  async resolvePartnerCode(rawCode: string): Promise<IPartnerCode | null> {
    const code = rawCode?.trim().toUpperCase();
    if (!code || code.length < 3) return null;
    return PartnerCode.findOne({ code, status: 'active' });
  }

  /**
   * Record a one-time commission when a partner-referred user makes their
   * first paid subscription. Idempotent via the unique `referee` index:
   * the ledger row is reserved BEFORE crediting the wallet, so concurrent
   * webhook + verify events can never double-credit. Does NOT gate on the
   * code still being active — a code disabled after signup still pays out
   * conversions it already attributed.
   */
  async recordCommissionOnConversion(
    referee: IUser,
    paymentAmountKobo?: number
  ): Promise<void> {
    if (!referee.referredByPartnerCode) return;
    if (!paymentAmountKobo || paymentAmountKobo <= 0) return; // wait for an event carrying the amount

    const partnerCode = await PartnerCode.findById(referee.referredByPartnerCode);
    if (!partnerCode) return;

    const basisAmount = Math.round(paymentAmountKobo / 100); // kobo → naira
    const rate = partnerCode.commissionRate;
    const commissionAmount = Math.round((basisAmount * rate) / 100);

    // Reserve the referee first. A duplicate key means another event already
    // recorded this conversion — bail without crediting again.
    let commissionDoc;
    try {
      commissionDoc = await PartnerCommission.create({
        partnerCode: partnerCode._id,
        owner: partnerCode.owner,
        referee: referee._id,
        basisAmount,
        rate,
        commissionAmount,
        status: 'accrued',
      });
    } catch (err: unknown) {
      if ((err as { code?: number })?.code === 11000) return; // already recorded
      throw err;
    }

    if (commissionAmount > 0) {
      const walletTx = await WalletService.creditWallet(partnerCode.owner.toString(), {
        amount: commissionAmount,
        description: `Partner commission (${partnerCode.code})`,
        metadata: {
          kind: 'partner_commission',
          partnerCode: partnerCode.code,
          referee: referee._id.toString(),
          rate,
          basisAmount,
        },
      });
      commissionDoc.walletTransaction = walletTx._id;
      await commissionDoc.save();
    }
  }
}

export default new PartnerService();
```

- [ ] **Step 2: Compile gate**

Run: `cd backend && npm run build`
Expected: 0 errors. Confirm `WalletService` default export path (`grep -n "export default" src/services/WalletService.ts` → `export default new WalletService();`).

- [ ] **Step 3: Commit**

```bash
cd backend && git add src/services/PartnerService.ts
git commit -m "feat(partner): PartnerService resolve + idempotent commission recording"
```

---

### Task A6: Attribution — resolve partner codes at signup

**Files:**
- Modify: `backend/src/services/AuthService.ts` (register referral block ~67-91)

- [ ] **Step 1: Extend the register attribution block**

In `backend/src/services/AuthService.ts`, replace the existing referral-resolution block (the `let referredBy ...` through the `if (referrer && ...) { referredBy = referrer._id; }`, lines ~67-82) with:

```ts
    // Resolve attribution up front. Partner (affiliate) codes take precedence
    // over peer referral codes in the shared code namespace. Invalid codes are
    // silently dropped — registration always succeeds.
    let referredBy: IUser['_id'] | undefined;
    let referredByPartnerCode: IUser['_id'] | undefined;
    if (data.referralCode && data.role !== UserRole.TENANT) {
      const partnerCode = await PartnerService.resolvePartnerCode(data.referralCode);
      if (partnerCode) {
        // Block redeeming a code you own (owner signing up under themselves).
        const ownsCode = partnerCode.owner.toString();
        // We don't yet have the new user's id; guard on email match against the
        // owner instead (covered again server-side at conversion time).
        const owner = await User.findById(partnerCode.owner).select('email');
        if (!owner || owner.email !== data.email) {
          referredByPartnerCode = partnerCode._id;
          referredBy = partnerCode.owner; // keep existing referral counts working
        }
      } else {
        const referrer = await ReferralService.resolveReferrer(data.referralCode);
        if (referrer && referrer.email !== data.email) {
          referredBy = referrer._id;
        }
      }
    }
```

- [ ] **Step 2: Thread the new field into `User.create`**

In the same method, update the `User.create({ ... })` call (~84-92) to also stamp the partner code:

```ts
    const user = await User.create({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: data.role,
      ...(referredBy ? { referredBy } : {}),
      ...(referredByPartnerCode ? { referredByPartnerCode } : {}),
    });
```

- [ ] **Step 3: Add the import**

At the top of `backend/src/services/AuthService.ts`, add next to the `ReferralService` import:

```ts
import PartnerService from './PartnerService';
```

- [ ] **Step 4: Compile gate**

Run: `cd backend && npm run build`
Expected: 0 errors.

- [ ] **Step 5: Manual verification**

Start the dev server (`npm run dev`). With a partner code seeded (you can insert one via mongo or wait until Task A9 admin endpoint exists — for now seed manually):
```
mongosh "$MONGODB_URI" --eval 'db.partnercodes.insertOne({code:"DAVIDO",owner:ObjectId("<some-landlord-id>"),commissionRate:20,status:"active",createdBy:ObjectId("<admin-id>"),createdAt:new Date(),updatedAt:new Date()})'
```
Then register a landlord with `referralCode:"DAVIDO"`:
```
curl -s localhost:5001/api/v1/auth/register -H 'Content-Type: application/json' \
  -d '{"firstName":"T","lastName":"Est","email":"partner-test1@example.com","password":"Passw0rd!","phone":"+2348100000001","role":"landlord","referralCode":"DAVIDO"}' | jq .success
```
Confirm the new user doc has `referredByPartnerCode` set + `referredBy` = the owner id:
```
mongosh "$MONGODB_URI" --eval 'db.users.findOne({email:"partner-test1@example.com"},{referredBy:1,referredByPartnerCode:1})'
```
Expected: both fields populated.

- [ ] **Step 6: Commit**

```bash
cd backend && git add src/services/AuthService.ts
git commit -m "feat(partner): resolve partner codes ahead of peer codes at signup"
```

---

### Task A7: Commission on conversion — branch the first-paid hook

**Files:**
- Modify: `backend/src/services/ReferralService.ts` (`applyCreditOnFirstPayment` ~signature + body)
- Modify: `backend/src/services/SubscriptionService.ts` (3 call sites: verify inline type + calls at ~412, ~529, ~570)

- [ ] **Step 1: Add the partner branch + amount param to `applyCreditOnFirstPayment`**

In `backend/src/services/ReferralService.ts`, replace the `applyCreditOnFirstPayment` method with:

```ts
  async applyCreditOnFirstPayment(
    refereeId: string,
    paymentAmountKobo?: number
  ): Promise<void> {
    try {
      const referee = await User.findById(refereeId);
      if (!referee) return;

      // Partner (affiliate) path: cash commission to the code owner, and NO
      // 30-day peer bonus (a partner is not a peer). Idempotency is owned by
      // PartnerCommission's unique referee index, so we do not use
      // referralCreditedAt here.
      if (referee.referredByPartnerCode) {
        await PartnerService.recordCommissionOnConversion(referee, paymentAmountKobo);
        return;
      }

      // Peer path (unchanged): 30 free days to both sides.
      if (!referee.referredBy) return; // No referrer to credit.
      if (referee.referralCreditedAt) return; // Already credited.

      const referrer = await User.findById(referee.referredBy);
      if (!referrer || referrer.isDeleted) return;

      referee.referralCreditedAt = new Date();
      await referee.save();

      await Promise.all([
        this.extendSubscriptionByDays(refereeId, REFERRAL_BONUS_DAYS),
        this.extendSubscriptionByDays(referrer._id.toString(), REFERRAL_BONUS_DAYS),
      ]);
    } catch (err) {
      console.error('ReferralService.applyCreditOnFirstPayment failed:', err);
    }
  }
```

- [ ] **Step 2: Import PartnerService**

At the top of `backend/src/services/ReferralService.ts`:

```ts
import PartnerService from './PartnerService';
```

- [ ] **Step 3: Add `amount` to the verify inline response type (call site 1)**

In `backend/src/services/SubscriptionService.ts`, in `verifyByReference` (~line 355), add `amount: number;` to the inline `data: { ... }` type so `tx.amount` is readable:

```ts
      data: {
        status: string;
        amount: number; // kobo — added for partner commission basis
        plan?: string;
        plan_object?: { plan_code?: string };
        customer?: { customer_code?: string; email?: string };
        metadata?: { userId?: string; subscriptionId?: string; tier?: SubscriptionTier; interval?: BillingInterval; type?: string };
      };
```

- [ ] **Step 4: Pass the amount at all 3 call sites**

Call site 1 (~line 412):
```ts
    void ReferralService.applyCreditOnFirstPayment(userId, tx.amount);
```
Call site 2 (~line 529):
```ts
        void ReferralService.applyCreditOnFirstPayment(sub.user.toString(), data.amount);
```
Call site 3 (~line 570):
```ts
        void ReferralService.applyCreditOnFirstPayment(sub.user.toString(), data.amount);
```
(At call site 3, `subscription.create` may not carry `amount`; passing `undefined` is safe — `recordCommissionOnConversion` no-ops and the `charge.success` event at call site 2 records the commission for the same conversion.)

- [ ] **Step 5: Confirm `tx` is the variable holding the verify data at call site 1**

Run: `grep -n "tx\." backend/src/services/SubscriptionService.ts | head`
Expected: existing `tx.customer?.customer_code` etc., confirming `tx` = the verify `data`. If the local is named differently (e.g. `data.data`), pass that variable's `.amount` instead.

- [ ] **Step 6: Compile gate**

Run: `cd backend && npm run build`
Expected: 0 errors.

- [ ] **Step 7: Manual verification (end to end, dev)**

Using the `partner-test1@example.com` user from Task A6 (attributed to `DAVIDO`, rate 20), simulate a first paid activation. Easiest: hit the charge.success webhook path with a test payload that resolves to that user's subscription and `amount` in kobo (e.g. 2000000 kobo = ₦20,000):
```
curl -s localhost:5001/api/v1/webhooks/paystack -H 'Content-Type: application/json' \
  -H 'x-paystack-signature: <compute per your webhook verifier or temporarily bypass in dev>' \
  -d '{"event":"charge.success","data":{"amount":2000000,"metadata":{"type":"subscription","userId":"<partner-test1 id>"},"plan":{"plan_code":"<a real plan code>"}}}'
```
Then confirm:
```
mongosh "$MONGODB_URI" --eval 'db.partnercommissions.findOne({},{basisAmount:1,rate:1,commissionAmount:1,status:1})'
```
Expected: `basisAmount: 20000, rate: 20, commissionAmount: 4000, status: "accrued"`. And the owner's wallet balance increased by 4000:
```
mongosh "$MONGODB_URI" --eval 'db.wallets.findOne({landlord:ObjectId("<owner-id>")},{balance:1})'
```
Re-fire the same webhook and confirm no second commission row + no further balance change (idempotency).

- [ ] **Step 8: Commit**

```bash
cd backend && git add src/services/ReferralService.ts src/services/SubscriptionService.ts
git commit -m "feat(partner): pay commission on first paid conversion, skip peer bonus"
```

---

### Task A8: Partner invitation email

**Files:**
- Modify: `backend/src/services/EmailOtpService.ts` (add `sendPartnerInvitation`, mirror `sendPartnershipInvitation` ~1124)

- [ ] **Step 1: Add the email method**

In `backend/src/services/EmailOtpService.ts`, add a method mirroring `sendPartnershipInvitation`'s shape (params object → subject/html/text → `this.send`):

```ts
  async sendPartnerInvitation(params: {
    to: string;
    partnerName: string;
    code: string;
    commissionRate: number;
    loginUrl: string;
  }): Promise<void> {
    const { to, partnerName, code, commissionRate, loginUrl } = params;
    const subject = `You're a Property360 partner — your code is ${code}`;
    const html = `
      <p>Hi ${partnerName},</p>
      <p>You've been set up as a Property360 referral partner.</p>
      <p>Your code: <strong>${code}</strong><br/>
         Your commission: <strong>${commissionRate}%</strong> of each referred
         landlord's first plan payment.</p>
      <p>Share your link: <a href="https://property360.africa/onboarding?ref=${code}">property360.africa/onboarding?ref=${code}</a></p>
      <p>Track earnings and withdraw here: <a href="${loginUrl}">${loginUrl}</a>.
         Use "Forgot password" on that page to set your password the first time.</p>
    `;
    const text =
      `Hi ${partnerName},\n\nYou're a Property360 referral partner.\n` +
      `Code: ${code}\nCommission: ${commissionRate}% of each referred landlord's first plan payment.\n` +
      `Share: https://property360.africa/onboarding?ref=${code}\n` +
      `Portal: ${loginUrl} (use Forgot password to set your password).\n`;
    await this.send({ to, subject, html, text });
  }
```

- [ ] **Step 2: Compile gate**

Run: `cd backend && npm run build`
Expected: 0 errors. Confirm the private `send` signature via `grep -n "private.*send" src/services/EmailOtpService.ts` and match its `{ to, subject, html, text }` shape.

- [ ] **Step 3: Commit**

```bash
cd backend && git add src/services/EmailOtpService.ts
git commit -m "feat(partner): partner invitation email"
```

---

### Task A9: Admin endpoints — mint / list / detail / status / invite

**Files:**
- Modify: `backend/src/services/PartnerService.ts` (add admin methods)
- Modify: `backend/src/controllers/AdminController.ts`
- Modify: `backend/src/routes/admin.ts`

- [ ] **Step 1: Add admin logic to PartnerService**

Append these methods to the `PartnerService` class in `backend/src/services/PartnerService.ts` (above `export default`):

```ts
  private normalizeCode(raw: string): string {
    return raw.trim().toUpperCase();
  }

  private async assertCodeFree(code: string): Promise<void> {
    // Shared namespace: no collision with user referral codes or partner codes.
    const [userClash, partnerClash] = await Promise.all([
      User.exists({ referralCode: code }),
      PartnerCode.exists({ code }),
    ]);
    if (userClash || partnerClash) {
      throw new AppError('That code is already taken', 400);
    }
  }

  async mintCode(input: {
    code: string;
    ownerId: string;
    commissionRate: number;
    label?: string;
    createdBy: string;
  }): Promise<IPartnerCode> {
    const code = this.normalizeCode(input.code);
    if (!/^[A-Z0-9]{3,20}$/.test(code)) {
      throw new AppError('Code must be 3-20 letters or digits', 400);
    }
    if (input.commissionRate < 0 || input.commissionRate > 100) {
      throw new AppError('Commission rate must be between 0 and 100', 400);
    }
    const owner = await User.findById(input.ownerId).select('_id');
    if (!owner) throw new AppError('Owner user not found', 404);
    await this.assertCodeFree(code);
    return PartnerCode.create({
      code,
      owner: owner._id,
      commissionRate: input.commissionRate,
      label: input.label,
      createdBy: input.createdBy,
    });
  }

  async invitePartner(input: {
    email: string;
    firstName: string;
    lastName: string;
    code: string;
    commissionRate: number;
    label?: string;
    createdBy: string;
  }): Promise<IPartnerCode> {
    const email = input.email.trim().toLowerCase();
    let owner = await User.findOne({ email });
    if (!owner) {
      owner = await User.create({
        email,
        firstName: input.firstName,
        lastName: input.lastName,
        // Random unusable password; partner sets their own via Forgot password.
        password: `Pk-${Math.random().toString(36).slice(2)}-${Date.now()}`,
        phone: '',
        role: UserRole.PARTNER,
      });
    }
    const partnerCode = await this.mintCode({
      code: input.code,
      ownerId: owner._id.toString(),
      commissionRate: input.commissionRate,
      label: input.label,
      createdBy: input.createdBy,
    });
    await emailOtpService
      .sendPartnerInvitation({
        to: email,
        partnerName: input.firstName,
        code: partnerCode.code,
        commissionRate: partnerCode.commissionRate,
        loginUrl: `${config.web.baseUrl}/partner/login`,
      })
      .catch((err) => console.error('[PartnerService] invite email failed:', err));
    return partnerCode;
  }

  async listCodesWithStats(): Promise<
    Array<{
      _id: string;
      code: string;
      status: string;
      commissionRate: number;
      label?: string;
      owner: { _id: string; firstName: string; lastName: string; email: string; role: string };
      signups: number;
      paidConversions: number;
      totalEarned: number;
    }>
  > {
    const codes = await PartnerCode.find()
      .populate('owner', 'firstName lastName email role')
      .sort({ createdAt: -1 })
      .lean();
    const results = await Promise.all(
      codes.map(async (c: any) => {
        const [signups, agg] = await Promise.all([
          User.countDocuments({ referredByPartnerCode: c._id, isDeleted: { $ne: true } }),
          PartnerCommission.aggregate([
            { $match: { partnerCode: c._id } },
            { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$commissionAmount' } } },
          ]),
        ]);
        return {
          _id: c._id.toString(),
          code: c.code,
          status: c.status,
          commissionRate: c.commissionRate,
          label: c.label,
          owner: {
            _id: c.owner?._id?.toString(),
            firstName: c.owner?.firstName,
            lastName: c.owner?.lastName,
            email: c.owner?.email,
            role: c.owner?.role,
          },
          signups,
          paidConversions: agg[0]?.count ?? 0,
          totalEarned: agg[0]?.total ?? 0,
        };
      })
    );
    return results;
  }

  async setStatus(codeId: string, status: 'active' | 'disabled'): Promise<IPartnerCode> {
    const code = await PartnerCode.findByIdAndUpdate(
      codeId,
      { $set: { status } },
      { new: true }
    );
    if (!code) throw new AppError('Partner code not found', 404);
    return code;
  }

  async getCodeDetail(codeId: string) {
    const code = await PartnerCode.findById(codeId)
      .populate('owner', 'firstName lastName email role')
      .lean();
    if (!code) throw new AppError('Partner code not found', 404);
    const commissions = await PartnerCommission.find({ partnerCode: codeId })
      .populate('referee', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();
    return { code, commissions };
  }
```

Add the imports at the top of `PartnerService.ts`:
```ts
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '../types';
import config from '../config';
import emailOtpService from './EmailOtpService';
```
(Confirm `AppError`'s path with `grep -rn "export class AppError" src/middleware`.)

- [ ] **Step 2: Add controller methods**

In `backend/src/controllers/AdminController.ts`, add (mirroring the `listPendingKyc` / `approveKyc` shape):

```ts
  async listPartnerCodes(_req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await PartnerService.listCodesWithStats();
      res.status(200).json({ success: true, message: 'Partner codes', data });
    } catch (error) {
      next(error);
    }
  }

  async mintPartnerCode(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await PartnerService.mintCode({
        code: String(req.body.code),
        ownerId: String(req.body.ownerId),
        commissionRate: Number(req.body.commissionRate),
        label: req.body.label ? String(req.body.label) : undefined,
        createdBy: req.user!._id.toString(),
      });
      res.status(201).json({ success: true, message: 'Partner code created', data });
    } catch (error) {
      next(error);
    }
  }

  async invitePartner(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await PartnerService.invitePartner({
        email: String(req.body.email),
        firstName: String(req.body.firstName),
        lastName: String(req.body.lastName),
        code: String(req.body.code),
        commissionRate: Number(req.body.commissionRate),
        label: req.body.label ? String(req.body.label) : undefined,
        createdBy: req.user!._id.toString(),
      });
      res.status(201).json({ success: true, message: 'Partner invited', data });
    } catch (error) {
      next(error);
    }
  }

  async setPartnerCodeStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.body.status === 'disabled' ? 'disabled' : 'active';
      const data = await PartnerService.setStatus(String(req.params.id), status);
      res.status(200).json({ success: true, message: 'Partner code updated', data });
    } catch (error) {
      next(error);
    }
  }

  async getPartnerCodeDetail(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await PartnerService.getCodeDetail(String(req.params.id));
      res.status(200).json({ success: true, message: 'Partner code detail', data });
    } catch (error) {
      next(error);
    }
  }
```

Add the import at the top of `AdminController.ts`:
```ts
import PartnerService from '../services/PartnerService';
```

- [ ] **Step 3: Add routes**

In `backend/src/routes/admin.ts`, after the KYC routes:

```ts
router.get('/partners', AdminController.listPartnerCodes);
router.post('/partners', AdminController.mintPartnerCode);
router.post('/partners/invite', AdminController.invitePartner);
router.get('/partners/:id', AdminController.getPartnerCodeDetail);
router.patch('/partners/:id/status', AdminController.setPartnerCodeStatus);
```

- [ ] **Step 4: Compile gate**

Run: `cd backend && npm run build`
Expected: 0 errors.

- [ ] **Step 5: Manual verification**

As an admin (get an admin JWT), mint a code and list:
```
TOKEN=<admin jwt>
curl -s localhost:5001/api/v1/admin/partners -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"code":"WIZKID","ownerId":"<existing landlord id>","commissionRate":15}' | jq '.data.code'
curl -s localhost:5001/api/v1/admin/partners -H "Authorization: Bearer $TOKEN" | jq '.data[] | {code,signups,paidConversions,totalEarned}'
```
Expected: `"WIZKID"` created; list shows it with zeroed stats. Then invite an external partner:
```
curl -s localhost:5001/api/v1/admin/partners/invite -X POST -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"email":"star@example.com","firstName":"Star","lastName":"Boy","code":"STARBOY","commissionRate":25}' | jq '.data.code'
```
Expected: `"STARBOY"`; a `partner`-role user exists for `star@example.com`; invite email attempted (check logs).

- [ ] **Step 6: Commit**

```bash
cd backend && git add src/services/PartnerService.ts src/controllers/AdminController.ts src/routes/admin.ts
git commit -m "feat(partner): admin mint/list/detail/status/invite endpoints"
```

---

### Task A10: Partner self endpoint + widen money-route roles

**Files:**
- Modify: `backend/src/services/PartnerService.ts` (add `getEarningsForUser`)
- Create: `backend/src/controllers/PartnerController.ts`, `backend/src/routes/partner.ts`
- Modify: `backend/src/routes/index.ts`
- Modify: `backend/src/routes/payouts.ts`, `backend/src/routes/wallet.ts`, `backend/src/routes/bankAccounts.ts`

- [ ] **Step 1: Add `getEarningsForUser` to PartnerService**

Append to the `PartnerService` class:

```ts
  async getEarningsForUser(userId: string): Promise<{
    isPartner: boolean;
    codes: Array<{ code: string; commissionRate: number; status: string }>;
    shareUrls: string[];
    signups: number;
    paidConversions: number;
    totalEarned: number;
  }> {
    const codes = await PartnerCode.find({ owner: userId }).lean();
    if (codes.length === 0) {
      return { isPartner: false, codes: [], shareUrls: [], signups: 0, paidConversions: 0, totalEarned: 0 };
    }
    const codeIds = codes.map((c: any) => c._id);
    const [signups, agg] = await Promise.all([
      User.countDocuments({ referredByPartnerCode: { $in: codeIds }, isDeleted: { $ne: true } }),
      PartnerCommission.aggregate([
        { $match: { owner: codes[0].owner } },
        { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$commissionAmount' } } },
      ]),
    ]);
    return {
      isPartner: true,
      codes: codes.map((c: any) => ({ code: c.code, commissionRate: c.commissionRate, status: c.status })),
      shareUrls: codes.map((c: any) => `${config.web.baseUrl}/onboarding?ref=${c.code}`),
      signups,
      paidConversions: agg[0]?.count ?? 0,
      totalEarned: agg[0]?.total ?? 0,
    };
  }
```

- [ ] **Step 2: Create the controller**

Create `backend/src/controllers/PartnerController.ts`:

```ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import PartnerService from '../services/PartnerService';

class PartnerController {
  async getMyPartner(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await PartnerService.getEarningsForUser(req.user!._id.toString());
      res.status(200).json({ success: true, message: 'Partner earnings', data });
    } catch (error) {
      next(error);
    }
  }
}

export default new PartnerController();
```

- [ ] **Step 3: Create the route + mount**

Create `backend/src/routes/partner.ts`:

```ts
import { Router } from 'express';
import { protect } from '../middleware/auth';
import PartnerController from '../controllers/PartnerController';

const router = Router();
router.use(protect);
router.get('/me', PartnerController.getMyPartner);

export default router;
```

In `backend/src/routes/index.ts`, add the import next to `referralRoutes` and mount it next to the `/referrals` mount:
```ts
import partnerRoutes from './partner';
// ...
router.use('/partner', partnerRoutes);
```

- [ ] **Step 4: Widen money routes to allow the partner role**

In `backend/src/routes/payouts.ts`, change:
```ts
router.use(authorize(UserRole.LANDLORD));
```
to:
```ts
router.use(authorize(UserRole.LANDLORD, UserRole.AGENT, UserRole.PARTNER));
```
Then locate the equivalent `authorize(...)` lines in `backend/src/routes/wallet.ts` and `backend/src/routes/bankAccounts.ts`:
```
grep -n "authorize(" backend/src/routes/wallet.ts backend/src/routes/bankAccounts.ts
```
Add `UserRole.PARTNER` (and `UserRole.AGENT` if not present) to each so a partner can view their wallet, add a bank account, and withdraw. (Confirm the real filenames first: `ls backend/src/routes | grep -iE 'wallet|bank'`.)

- [ ] **Step 5: Compile gate**

Run: `cd backend && npm run build`
Expected: 0 errors.

- [ ] **Step 6: Manual verification**

Log in as the invited partner (after setting a password via forgot-password, or set one directly in mongo for the test). Call:
```
curl -s localhost:5001/api/v1/partner/me -H "Authorization: Bearer <partner jwt>" | jq '{isPartner,totalEarned,signups}'
curl -s localhost:5001/api/v1/wallet -H "Authorization: Bearer <partner jwt>" | jq '.data.balance'
```
Expected: `isPartner:true`; wallet endpoint returns 200 (no 403 from role gate).

- [ ] **Step 7: Commit**

```bash
cd backend && git add src/services/PartnerService.ts src/controllers/PartnerController.ts src/routes/partner.ts src/routes/index.ts src/routes/payouts.ts src/routes/wallet.ts src/routes/bankAccounts.ts
git commit -m "feat(partner): GET /partner/me + allow partner role on wallet/payout/bank routes"
```

---

## PHASE B — Web admin (`property360-web.git`, feat/founding-50)

### Task B1: Admin API client methods + types

**Files:**
- Modify: `web/src/lib/admin.ts`

- [ ] **Step 1: Add types + methods**

In `web/src/lib/admin.ts`, add the types near the other admin row types and the methods inside the `adminApi` object (mirroring `listPendingKyc` / `approveKyc`):

```ts
export interface AdminPartnerRow {
  _id: string;
  code: string;
  status: "active" | "disabled";
  commissionRate: number;
  label?: string;
  owner: { _id: string; firstName: string; lastName: string; email: string; role: string };
  signups: number;
  paidConversions: number;
  totalEarned: number;
}

export interface AdminPartnerDetail {
  code: {
    _id: string; code: string; status: string; commissionRate: number; label?: string;
    owner: { _id: string; firstName: string; lastName: string; email: string; role: string };
  };
  commissions: Array<{
    _id: string; basisAmount: number; rate: number; commissionAmount: number; status: string;
    createdAt: string; referee?: { firstName: string; lastName: string; email: string };
  }>;
}
```

```ts
  async listPartnerCodes(): Promise<AdminPartnerRow[]> {
    return unwrap((await api.get("/admin/partners")).data);
  },
  async mintPartnerCode(input: { code: string; ownerId: string; commissionRate: number; label?: string }): Promise<AdminPartnerRow> {
    return unwrap((await api.post("/admin/partners", input)).data);
  },
  async invitePartner(input: { email: string; firstName: string; lastName: string; code: string; commissionRate: number; label?: string }): Promise<{ code: string }> {
    return unwrap((await api.post("/admin/partners/invite", input)).data);
  },
  async getPartnerDetail(id: string): Promise<AdminPartnerDetail> {
    return unwrap((await api.get(`/admin/partners/${id}`)).data);
  },
  async setPartnerStatus(id: string, status: "active" | "disabled"): Promise<AdminPartnerRow> {
    return unwrap((await api.patch(`/admin/partners/${id}/status`, { status })).data);
  },
```

- [ ] **Step 2: Compile gate**

Run: `cd web && npx tsc --noEmit`
Expected: 0 errors (ignore any pre-existing borrowed-node_modules artifacts unrelated to these files).

- [ ] **Step 3: Commit**

```bash
cd web && git add src/lib/admin.ts
git commit -m "feat(partner): admin API client methods + types"
```

---

### Task B2: Admin Partners list page + nav

**Files:**
- Create: `web/src/app/admin/(app)/partners/page.tsx`
- Modify: `web/src/components/admin/Sidebar.tsx`

- [ ] **Step 1: Add the nav entry**

In `web/src/components/admin/Sidebar.tsx`, inside `NAV_SECTIONS`, add a "Partners" item to the `Finance` section (or a new `Growth` section):

```ts
  { label: "Growth", items: [{ href: "/admin/partners", label: "Partners" }] },
```

- [ ] **Step 2: Create the list page**

Create `web/src/app/admin/(app)/partners/page.tsx`. Mirror the KYC page structure (`Topbar` → `main` → `DataTable` + `PageHeader`), fetching via react-query and rendering a mint/invite form. Full component:

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import adminApi, { AdminPartnerRow } from "@/lib/admin";
import Topbar from "@/components/admin/Topbar";
import { DataTable } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/ui/PageHeader";

export default function AdminPartnersPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "partners"],
    queryFn: () => adminApi.listPartnerCodes(),
  });

  const [showForm, setShowForm] = useState(false);
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "disabled" }) =>
      adminApi.setPartnerStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "partners"] }),
  });

  const columns = [
    { key: "code", header: "Code", render: (r: AdminPartnerRow) => (
        <Link href={`/admin/partners/${r._id}`} className="font-semibold text-foundation-700">{r.code}</Link>
      ) },
    { key: "owner", header: "Owner", render: (r: AdminPartnerRow) =>
        `${r.owner.firstName} ${r.owner.lastName} (${r.owner.role})` },
    { key: "commissionRate", header: "Rate", render: (r: AdminPartnerRow) => `${r.commissionRate}%` },
    { key: "signups", header: "Signups", render: (r: AdminPartnerRow) => r.signups },
    { key: "paidConversions", header: "Paid", render: (r: AdminPartnerRow) => r.paidConversions },
    { key: "totalEarned", header: "Earned", render: (r: AdminPartnerRow) => `₦${r.totalEarned.toLocaleString("en-NG")}` },
    { key: "status", header: "Status", render: (r: AdminPartnerRow) => (
        <button
          className="text-xs underline"
          onClick={() => setStatus.mutate({ id: r._id, status: r.status === "active" ? "disabled" : "active" })}
        >
          {r.status === "active" ? "Active — disable" : "Disabled — enable"}
        </button>
      ) },
  ];

  return (
    <>
      <Topbar />
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-6xl">
          <PageHeader
            title="Partners"
            action={<button className="rounded-lg bg-foundation-700 px-3 py-2 text-sm text-white" onClick={() => setShowForm((s) => !s)}>New partner code</button>}
          />
          {showForm && <PartnerForm onDone={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ["admin", "partners"] }); }} />}
          <DataTable columns={columns} rows={data ?? []} loading={isLoading} />
        </div>
      </main>
    </>
  );
}
```

(Confirm `PageHeader`'s prop names via `grep -n "PageHeader" web/src/components/admin/ui/PageHeader.tsx`; adjust `action`/`title` to match. Confirm `DataTable` accepts `loading` or use the KYC page's exact prop name.)

- [ ] **Step 3: Add the mint/invite form component (same file, below the page)**

```tsx
function PartnerForm({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<"existing" | "invite">("existing");
  const [code, setCode] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [rate, setRate] = useState(10);
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const mint = useMutation({
    mutationFn: () =>
      mode === "existing"
        ? adminApi.mintPartnerCode({ code, ownerId, commissionRate: rate })
        : adminApi.invitePartner({ code, email, firstName, lastName, commissionRate: rate }),
    onSuccess: onDone,
    onError: (e: unknown) => setErr((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed"),
  });

  return (
    <div className="mb-4 rounded-xl border border-line/60 bg-white p-4">
      <div className="mb-3 flex gap-3 text-sm">
        <label><input type="radio" checked={mode === "existing"} onChange={() => setMode("existing")} /> Existing user</label>
        <label><input type="radio" checked={mode === "invite"} onChange={() => setMode("invite")} /> Invite new partner</label>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <input className="rounded border px-3 py-2" placeholder="Code (e.g. DAVIDO)" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <input className="rounded border px-3 py-2" type="number" placeholder="Commission %" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
        {mode === "existing" ? (
          <input className="rounded border px-3 py-2 md:col-span-2" placeholder="Owner user id" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} />
        ) : (
          <>
            <input className="rounded border px-3 py-2" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            <input className="rounded border px-3 py-2" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <input className="rounded border px-3 py-2 md:col-span-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </>
        )}
      </div>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <button className="mt-3 rounded-lg bg-foundation-700 px-3 py-2 text-sm text-white disabled:opacity-50" disabled={mint.isPending || !code} onClick={() => { setErr(null); mint.mutate(); }}>
        {mint.isPending ? "Saving…" : "Create code"}
      </button>
    </div>
  );
}
```

(For v1, "Owner user id" is a raw id paste. A user-search typeahead is a later polish — note it, don't build it now.)

- [ ] **Step 4: Compile gate**

Run: `cd web && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 5: Manual verification**

Run `cd web && npm run dev`, log in at `/admin/login`, open `/admin/partners`. Mint a code for an existing landlord id; confirm it appears in the table with 0 stats and a working disable/enable toggle.

- [ ] **Step 6: Commit**

```bash
cd web && git add src/app/admin/\(app\)/partners/page.tsx src/components/admin/Sidebar.tsx
git commit -m "feat(partner): admin partners list + mint/invite form + nav"
```

---

### Task B3: Admin partner detail page

**Files:**
- Create: `web/src/app/admin/(app)/partners/[id]/page.tsx`

- [ ] **Step 1: Create the detail page**

```tsx
"use client";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import adminApi from "@/lib/admin";
import Topbar from "@/components/admin/Topbar";
import { DataTable } from "@/components/admin/DataTable";

export default function AdminPartnerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "partners", id],
    queryFn: () => adminApi.getPartnerDetail(id),
  });

  const columns = [
    { key: "referee", header: "Referred user", render: (r: any) => r.referee ? `${r.referee.firstName} ${r.referee.lastName}` : "—" },
    { key: "basisAmount", header: "First payment", render: (r: any) => `₦${r.basisAmount.toLocaleString("en-NG")}` },
    { key: "rate", header: "Rate", render: (r: any) => `${r.rate}%` },
    { key: "commissionAmount", header: "Commission", render: (r: any) => `₦${r.commissionAmount.toLocaleString("en-NG")}` },
    { key: "status", header: "Status", render: (r: any) => r.status },
    { key: "createdAt", header: "Date", render: (r: any) => new Date(r.createdAt).toLocaleDateString("en-NG") },
  ];

  return (
    <>
      <Topbar />
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-5xl">
          {isLoading || !data ? (
            <p className="text-sm text-ink-muted">Loading…</p>
          ) : (
            <>
              <h1 className="font-display text-2xl font-extrabold text-foundation-700">{data.code.code}</h1>
              <p className="mt-1 text-sm text-ink-muted">
                {data.code.owner.firstName} {data.code.owner.lastName} · {data.code.commissionRate}% · {data.code.status}
              </p>
              <div className="mt-6"><DataTable columns={columns} rows={data.commissions} /></div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Compile gate**

Run: `cd web && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Manual verification**

Click a code in the list; confirm the detail page renders owner + rate + an (initially empty) conversions table.

- [ ] **Step 4: Commit**

```bash
cd web && git add src/app/admin/\(app\)/partners/\[id\]/page.tsx
git commit -m "feat(partner): admin partner detail page"
```

---

## PHASE C — Web partner portal

### Task C1: Partner API client

**Files:**
- Create: `web/src/lib/partner-api.ts`

- [ ] **Step 1: Create the client**

```ts
import { api, unwrap } from "./api";

export interface PartnerEarnings {
  isPartner: boolean;
  codes: Array<{ code: string; commissionRate: number; status: string }>;
  shareUrls: string[];
  signups: number;
  paidConversions: number;
  totalEarned: number;
}

export const partnerApi = {
  async getMyPartner(): Promise<PartnerEarnings> {
    return unwrap((await api.get("/partner/me")).data) as PartnerEarnings;
  },
};
export default partnerApi;
```

- [ ] **Step 2: Compile gate**

Run: `cd web && npx tsc --noEmit`
Expected: 0 errors. Confirm `./api` exports `api` and `unwrap` (`grep -n "export" web/src/lib/api.ts`).

- [ ] **Step 3: Commit**

```bash
cd web && git add src/lib/partner-api.ts
git commit -m "feat(partner): partner self API client"
```

---

### Task C2: Partner shell (layout + auth gate + sidebar + login dispatch)

**Files:**
- Create: `web/src/components/partner/AuthGate.tsx`, `web/src/components/partner/Sidebar.tsx`, `web/src/app/partner/layout.tsx`
- Modify: `web/src/app/login/page.tsx`

- [ ] **Step 1: Create the auth gate (copy `components/me/AuthGate.tsx`, gate on `partner`)**

Create `web/src/components/partner/AuthGate.tsx` mirroring the tenant gate but replacing the role check with `user.role !== "partner"`:

```tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { session, AdminUser } from "@/lib/session";

export function PartnerAuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "ok">("checking");

  useEffect(() => {
    const token = session.getToken();
    if (!token) { router.replace("/partner/login"); return; }
    api.get("/auth/profile")
      .then((res) => {
        const user = (res.data?.data ?? res.data) as AdminUser;
        if (!user || user.role !== "partner") { session.clear(); router.replace("/partner/login"); return; }
        session.set(token, user);
        setState("ok");
      })
      .catch(() => { session.clear(); router.replace("/partner/login"); });
  }, [router]);

  if (state !== "ok") return <div className="p-8 text-sm text-ink-muted">Checking session…</div>;
  return <>{children}</>;
}
```

(Confirm the profile endpoint the other gates call — the web report says `GET /auth/profile`; verify with `grep -rn "auth/profile\|/auth/me" web/src/components/*/AuthGate.tsx`.)

- [ ] **Step 2: Create a minimal sidebar**

Create `web/src/components/partner/Sidebar.tsx` with just the portal's own links (mirror the structure of `components/me/Sidebar.tsx`, but items are `Dashboard` → `/partner`):

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [{ href: "/partner", label: "Earnings & payout" }];

export function PartnerSidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden w-56 shrink-0 border-r border-line/60 bg-white p-4 md:block">
      <p className="mb-4 font-display text-lg font-extrabold text-foundation-700">Partner</p>
      <nav className="space-y-1">
        {ITEMS.map((it) => (
          <Link key={it.href} href={it.href}
            className={`block rounded-lg px-3 py-2 text-sm ${pathname === it.href ? "bg-cryola-300/30 font-semibold text-foundation-700" : "text-ink-muted"}`}>
            {it.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

- [ ] **Step 3: Create the layout**

Create `web/src/app/partner/layout.tsx` (mirror `me/layout.tsx`):

```tsx
import { QueryProvider } from "@/lib/queryClient";
import { PartnerAuthGate } from "@/components/partner/AuthGate";
import { PartnerSidebar } from "@/components/partner/Sidebar";

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <PartnerAuthGate>
        <div className="flex min-h-screen bg-canvas">
          <PartnerSidebar />
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>
        </div>
      </PartnerAuthGate>
    </QueryProvider>
  );
}
```

(Confirm `QueryProvider`'s export path/name via `grep -n "QueryProvider" web/src/lib/queryClient.ts` or wherever `me/layout.tsx` imports it; match exactly.)

- [ ] **Step 4: Route login to `/partner` for partner role**

In `web/src/app/login/page.tsx`, update `safeNext(role)`:
```tsx
  if (role === "partner") return "/partner";
  return role === "tenant" ? "/me" : "/app/dashboard";
```

- [ ] **Step 5: Add a partner login page (reuse the admin/login pattern)**

Create `web/src/app/partner/login/page.tsx` mirroring `admin/login/page.tsx` but calling the shared login (`POST /auth/login`) and redirecting to `/partner`. Simplest reuse: copy `admin/login/page.tsx`, change the success redirect to `router.replace("/partner")` and drop the `role === "admin"` assertion (or assert `role === "partner"`).

- [ ] **Step 6: Compile gate**

Run: `cd web && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
cd web && git add src/components/partner src/app/partner/layout.tsx src/app/partner/login/page.tsx src/app/login/page.tsx
git commit -m "feat(partner): partner portal shell (layout, auth gate, sidebar, login)"
```

---

### Task C3: Partner portal page (earnings + wallet + withdraw + bank + KYC)

**Files:**
- Create: `web/src/app/partner/page.tsx`

- [ ] **Step 1: Build the consolidated portal page**

This one page reuses the existing generic money + KYC API methods on `landlordApi` (they hit bearer-scoped `/wallet`, `/bank-accounts`, `/payouts`, `/kyc/*` endpoints, now allowed for the partner role from Task A10). Mirror the exact field logic in `web/src/app/app/wallet/withdraw/page.tsx` (amount + bank select + `requestPayout`) and `web/src/app/app/profile/kyc/page.tsx` (KYC gate). Full page:

```tsx
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import partnerApi from "@/lib/partner-api";
import { landlordApi } from "@/lib/landlord-api";
import { Card, formatNgn } from "@/components/app/ui";

export default function PartnerPage() {
  const qc = useQueryClient();
  const earnings = useQuery({ queryKey: ["partner", "me"], queryFn: () => partnerApi.getMyPartner() });
  const wallet = useQuery({ queryKey: ["wallet"], queryFn: () => landlordApi.wallet() });
  const banks = useQuery({ queryKey: ["bank-accounts"], queryFn: () => landlordApi.listBankAccounts() });
  const kyc = useQuery({ queryKey: ["kyc", "status"], queryFn: () => landlordApi.kycStatus() });

  const [amount, setAmount] = useState("");
  const primaryBank = (banks.data ?? []).find((b) => b.isPrimary && b.isVerified) ?? (banks.data ?? []).find((b) => b.isVerified);

  const withdraw = useMutation({
    mutationFn: () => landlordApi.requestPayout({ amount: Number(amount), bankAccountId: primaryBank!._id }),
    onSuccess: () => { setAmount(""); qc.invalidateQueries({ queryKey: ["wallet"] }); },
  });

  if (earnings.isLoading) return <div className="p-8 text-sm text-ink-muted">Loading…</div>;
  const e = earnings.data!;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-foundation-700">Your partner earnings</h1>

      {e.isPartner && e.codes.length > 0 && (
        <Card className="p-5">
          <p className="text-sm text-ink-muted">Your code{e.codes.length > 1 ? "s" : ""}</p>
          {e.codes.map((c, i) => (
            <div key={c.code} className="mt-2 flex items-center justify-between">
              <span className="font-display text-xl font-extrabold text-foundation-700">{c.code}</span>
              <span className="text-sm text-ink-muted">{c.commissionRate}% · {c.status}</span>
              <button className="text-xs underline" onClick={() => navigator.clipboard.writeText(e.shareUrls[i])}>Copy link</button>
            </div>
          ))}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-5"><p className="text-xs uppercase text-ink-muted">Signups</p><p className="mt-1 text-2xl font-extrabold text-foundation-700">{e.signups}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase text-ink-muted">Paid conversions</p><p className="mt-1 text-2xl font-extrabold text-foundation-700">{e.paidConversions}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase text-ink-muted">Total earned</p><p className="mt-1 text-2xl font-extrabold text-foundation-700">{formatNgn(e.totalEarned)}</p></Card>
      </div>

      <Card className="p-5">
        <p className="text-sm text-ink-muted">Wallet balance</p>
        <p className="mt-1 font-display text-3xl font-extrabold text-foundation-700">{formatNgn(wallet.data?.balance ?? 0)}</p>

        {kyc.data?.status !== "verified" ? (
          <p className="mt-3 text-sm text-amber-700">Complete identity verification to withdraw. <a className="underline" href="/partner/kyc">Verify now</a>.</p>
        ) : !primaryBank ? (
          <p className="mt-3 text-sm text-amber-700">Add a bank account to withdraw. <a className="underline" href="/partner/bank">Add bank</a>.</p>
        ) : (
          <div className="mt-3 flex gap-2">
            <input className="rounded border px-3 py-2" placeholder="Amount (₦)" value={amount} onChange={(ev) => setAmount(ev.target.value)} />
            <button className="rounded-lg bg-foundation-700 px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={withdraw.isPending || !amount || Number(amount) <= 0}
              onClick={() => withdraw.mutate()}>
              {withdraw.isPending ? "Requesting…" : `Withdraw to ${primaryBank.bankName}`}
            </button>
          </div>
        )}
      </Card>
    </main>
  );
}
```

- [ ] **Step 2: Reuse KYC + bank pages under `/partner`**

Rather than rebuild, create thin route wrappers that render the existing landlord pages' logic. For v1, copy `web/src/app/app/profile/kyc/page.tsx` to `web/src/app/partner/kyc/page.tsx` and `web/src/app/app/wallet/bank-accounts/page.tsx` to `web/src/app/partner/bank/page.tsx`, changing only the topbar/back-link targets to stay within `/partner`. (These call the same generic `landlordApi` KYC + bank methods, which work for the partner token.) Confirm no landlord-only imports break under the partner shell.

- [ ] **Step 3: Compile gate**

Run: `cd web && npx tsc --noEmit`
Expected: 0 errors. Confirm `formatNgn` and `Card` are exported from `@/components/app/ui` (`grep -n "formatNgn\|export function Card\|export const Card" web/src/components/app/ui*`).

- [ ] **Step 4: Manual verification**

Log in as the partner at `/partner/login`. Confirm: earnings + wallet render; before KYC the withdraw is gated with a "Verify now" prompt; after KYC + adding a bank, the withdraw form appears and `requestPayout` returns 200.

- [ ] **Step 5: Commit**

```bash
cd web && git add src/app/partner/page.tsx src/app/partner/kyc/page.tsx src/app/partner/bank/page.tsx
git commit -m "feat(partner): partner portal page (earnings, wallet, withdraw, kyc, bank)"
```

---

## PHASE D — Existing-user partner earnings on the refer page

### Task D1: Show partner earnings on the landlord refer page

**Files:**
- Modify: `web/src/app/app/refer/page.tsx`

- [ ] **Step 1: Fetch partner earnings and render a section when the user owns a code**

In `web/src/app/app/refer/page.tsx`, add a second query and a conditional section (reusing the existing `StatCard`):

```tsx
import partnerApi from "@/lib/partner-api";
// ...inside the component, alongside the existing referral query `q`:
const partner = useQuery({ queryKey: ["partner", "me"], queryFn: () => partnerApi.getMyPartner() });
```

Then, above or below the existing referral stat grid, add:

```tsx
{partner.data?.isPartner && (
  <div className="space-y-3">
    <h2 className="font-display text-lg font-extrabold text-foundation-700">Partner earnings</h2>
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <StatCard icon={Sparkles} label="Referred signups" value={partner.data.signups} hint="Signed up with your partner code" />
      <StatCard icon={Clock} label="Paid conversions" value={partner.data.paidConversions} hint="Picked a plan, commission credited" />
      <StatCard icon={Calendar} label="Total earned (₦)" value={partner.data.totalEarned} hint="Credited to your wallet" />
    </div>
  </div>
)}
```

(Reuse whatever icons the file already imports; if `Calendar`/`Sparkles`/`Clock` are already imported for the referral grid, no new import is needed.)

- [ ] **Step 2: Compile gate**

Run: `cd web && npx tsc --noEmit`
Expected: 0 errors.

- [ ] **Step 3: Manual verification**

Mint a code for your logged-in landlord (admin → partners → existing user = your id). Reload `/app/refer`; confirm the "Partner earnings" section appears with the code's stats, and does NOT appear for a landlord who owns no code.

- [ ] **Step 4: Commit**

```bash
cd web && git add src/app/app/refer/page.tsx
git commit -m "feat(partner): show partner earnings on refer page for partner-owning users"
```

---

## Rollout

1. Backend: open a PR onto `property360.git` main (mirrors the KYC/OTP flow). Ships dark: `PARTNER_PROGRAM_ENABLED=false` in `render.yaml`, so partner attribution + commission are inert until flipped. (Note: with the flag off, the resolve/record code still runs; the flag primarily gates client exposure. If you want attribution itself inert until launch, add `if (!config.partner.programEnabled) return null;` at the top of `resolvePartnerCode` and `return;` at the top of `recordCommissionOnConversion` — recommended, add in Task A5.)
2. Web: PR onto `property360-web.git` (deploy branch → main), same as `deploy/kyc-web`.
3. Flip `PARTNER_PROGRAM_ENABLED=true` (both services) after minting the first codes.
4. Confirm the KYC payout gate is on (`KYC_PAYOUT_GATE_ENABLED=true`) before partners withdraw, so unverified partners can accrue but not cash out.

## Manual end-to-end acceptance (run once, dev)

1. Admin mints `TESTCODE` (existing landlord, 20%) and invites an external partner `STARBOY` (25%).
2. Sign up a new landlord with `?ref=TESTCODE`; confirm `referredByPartnerCode` stamped.
3. Complete a first paid subscription (Paystack test mode); confirm a `PartnerCommission` row (basis, 20%, commission), the owner wallet credited, admin list/detail stats updated.
4. Re-fire the webhook; confirm no double commission (idempotency).
5. External partner sets a password (forgot-password), logs into `/partner`, sees earnings, verifies KYC, adds a bank, withdraws; confirm the payout is created.
6. Disable `TESTCODE`; confirm a NEW signup with it is not attributed, but an already-attributed pending user still converts and pays out.

---

## Self-Review

**Spec coverage:** PartnerCode (A3) ✓, PartnerCommission ledger (A4) ✓, partner role + attribution field (A2) ✓, vanity codes + per-partner rate (A9 mint) ✓, attribution precedence + guards (A6) ✓, commission = % of first payment, one-time, idempotent, skip peer bonus (A5/A7) ✓, wallet credit + withdraw via existing payout, KYC-gated (A10/C3) ✓, admin mint/list/detail/status/invite (A9) ✓, external partner invite + role (A9) ✓, partner portal web-first (C1-C3) ✓, existing-user partner earnings (D1) ✓, `PARTNER_PROGRAM_ENABLED` flag + default rate (A1) ✓, disabled-code-still-pays-attributed (A5 record ignores status) ✓, compliance/co-mingled wallet (uses same Wallet model, A5) ✓. Non-goals (recurring, reversal, fee-netting, separate sub-balance, mobile) intentionally excluded.

**Placeholder scan:** No "TBD"/"handle errors" placeholders; every code step has concrete code. The few `grep`/`confirm` steps are verification of exact existing names, not deferred logic.

**Type consistency:** `IPartnerCode`, `IPartnerCommission`, `PartnerCodeStatus`, `PartnerCommissionStatus`, `UserRole.PARTNER`, `referredByPartnerCode` used identically across backend tasks; `AdminPartnerRow`/`AdminPartnerDetail`/`PartnerEarnings` consistent across web tasks; `applyCreditOnFirstPayment(refereeId, paymentAmountKobo?)` signature matches all 3 call sites; commission stored in naira, basis derived from kobo/100 consistently.
