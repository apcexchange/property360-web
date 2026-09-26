# Tenant Referral Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let tenants invite their landlord or caretaker, pay the tenant 30% of the invitee's first paid subscription into a new tenant wallet, and let tenants withdraw it to a bank account whose name matches theirs.

**Architecture:** A new `TenantReferralService` owns invites, signup attribution, commission recording, refund clawback, WhatsApp follow-ups and STOP opt-outs. It plugs into the existing `ReferralService.applyCreditOnFirstPayment` hook (a new tenant branch), reuses the `PartnerCommission` ledger (new `source` field, its unique `referee` index is the double-pay guard), and reuses `WalletService`, `BankAccountService` and `PayoutService`. Pure logic (commission maths, phone normalising, name matching, message text) lives in small util files with unit tests.

**Tech Stack:** Node 22, Express 5, TypeScript 5.9, Mongoose 9, express-validator, node-cron, Node's built-in `node:test` runner via `ts-node`.

**Repo:** `backend/` (its own git repo, remote `apcexchange/property360`).

**Spec:** `docs/superpowers/specs/2026-09-23-tenant-referral-design.md`

---

## Before you start

- Work in an isolated worktree off `origin/main` on a new branch `feat/tenant-referral` (see `superpowers:using-git-worktrees`). Symlink `node_modules` from `backend/` if you don't want to reinstall.
- **Tests:** the repo has no test runner. Task 1 adds Node's built-in runner for pure util files only (`npm test`). Everything else is verified with `npx tsc --noEmit` (hard requirement after every task) plus the manual `curl` walkthrough in Task 17 when a dev server and MongoDB are available.
- **Money units:** Paystack amounts arrive in **kobo**. `PartnerCommission.basisAmount`, `commissionAmount` and all wallet amounts are in **naira**. Convert once, in `computeCommission`.
- **Deviations from the spec, decided while planning (the spec has been updated to match):**
  - The bank-account name match runs when a tenant **requests a payout**, not when they add a bank account. Tenants already add bank accounts for shared-bill withdrawals, and those must keep working for accounts in other names.
  - WhatsApp onboarding signups are attributed by **phone match** (the invitee's WhatsApp number is their account phone), so no referral code needs to be threaded through that flow.
  - There is no global admin commissions view today (commissions are only shown per partner code), so admin gets a new `GET /admin/tenant-referrals` endpoint.
  - The "referee account older than invite" check is dropped: attribution only ever happens at signup, so an existing account can never be attributed. Existing users are instead rejected when the invite is created.
  - An invite moves to `joined`/`paid` only when it can be matched by phone. A landlord who signs up with the tenant's code from a phone-less invite still earns the tenant the reward (it's keyed on `referredBy`), and it shows in the tenant's `totals.earned`, but that invite row stays `sent`.

## File map

| File | Status | Responsibility |
|---|---|---|
| `package.json`, `tsconfig.json` | modify | test script, exclude tests from build |
| `src/utils/phone.ts` | create | Nigerian phone normalising and match candidates |
| `src/utils/phone.test.ts` | create | tests |
| `src/utils/nameMatch.ts` | create | bank account name vs profile name |
| `src/utils/nameMatch.test.ts` | create | tests |
| `src/utils/tenantReferral.ts` | create | commission maths, invite text, WhatsApp URL |
| `src/utils/tenantReferral.test.ts` | create | tests |
| `src/config/index.ts` | modify | `tenantReferral` block, 2 template keys x 3 providers |
| `src/types/index.ts` | modify | commission `source`, `sourceReference`, `needsReview` |
| `src/models/PartnerCommission.ts` | modify | same fields, `partnerCode` optional |
| `src/models/TenantInvite.ts` | create | invite record |
| `src/models/index.ts` | modify | export `TenantInvite` |
| `src/services/WalletService.ts` | modify | `clawbackCredit` |
| `src/services/WhatsAppService.ts` | modify | template keys, `sendTemplateToPhone` |
| `src/services/TenantReferralService.ts` | create | all tenant referral behaviour |
| `src/services/ReferralService.ts` | modify | tenant branch, pass reference |
| `src/services/SubscriptionService.ts` | modify | pass payment reference |
| `src/services/PaymentGatewayService.ts` | modify | route `refund.processed` |
| `src/services/AuthService.ts` | modify | phone-match attribution after register, reuse phone util |
| `src/services/WhatsAppOnboardingService.ts` | modify | attribution after account create |
| `src/services/PayoutService.ts` | modify | tenant name match |
| `src/controllers/TenantReferralController.ts` | create | tenant endpoints |
| `src/validations/tenantReferral.ts` | create | request validation |
| `src/routes/tenantReferral.ts` | create | `/tenant-referrals` |
| `src/routes/index.ts` | modify | mount route |
| `src/routes/wallet.ts`, `src/routes/payouts.ts` | modify | allow tenants |
| `src/controllers/AdminController.ts`, `src/routes/admin.ts` | modify | admin list |
| `src/controllers/WhatsAppWebhookController.ts` | modify | STOP opt-out |
| `src/server.ts` | modify | daily reminder cron |
| `scripts/register-tenant-referral-templates.sh` | create | submit the 2 Meta templates |

---

### Task 1: Add a unit test runner for pure utils

**Files:**
- Modify: `backend/package.json` (the `"test"` script)
- Modify: `backend/tsconfig.json` (`exclude`)

- [ ] **Step 1: Replace the test script**

In `package.json`, replace:

```json
    "test": "echo \"Error: no test specified\" && exit 1",
```

with:

```json
    "test": "node -r ts-node/register/transpile-only --test \"src/**/*.test.ts\"",
```

- [ ] **Step 2: Keep test files out of the build**

In `tsconfig.json`, replace:

```json
  "exclude": ["node_modules", "dist"]
```

with:

```json
  "exclude": ["node_modules", "dist", "src/**/*.test.ts"]
```

- [ ] **Step 3: Check the runner starts**

Run: `cd backend && npm test`
Expected: exits 0 (or reports "0 tests"). Node 22 expands the quoted glob itself.

- [ ] **Step 4: Commit**

```bash
git add package.json tsconfig.json
git commit -m "chore: add node:test runner for pure unit tests"
```

---

### Task 2: Phone utils

**Files:**
- Create: `backend/src/utils/phone.ts`
- Create: `backend/src/utils/phone.test.ts`
- Modify: `backend/src/services/AuthService.ts:164-182` (reuse)

- [ ] **Step 1: Write the failing test**

`src/utils/phone.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toE164NG, phoneMatchCandidates } from './phone';

test('toE164NG normalises common Nigerian formats', () => {
  assert.equal(toE164NG('08031234567'), '+2348031234567');
  assert.equal(toE164NG('2348031234567'), '+2348031234567');
  assert.equal(toE164NG('+234 803 123 4567'), '+2348031234567');
  assert.equal(toE164NG('8031234567'), '+2348031234567');
});

test('toE164NG returns null for junk', () => {
  assert.equal(toE164NG(''), null);
  assert.equal(toE164NG('12345'), null);
  assert.equal(toE164NG('abc'), null);
});

test('phoneMatchCandidates covers every stored format', () => {
  const c = phoneMatchCandidates('0803 123 4567');
  for (const f of ['08031234567', '2348031234567', '+2348031234567', '8031234567']) {
    assert.ok(c.includes(f), `missing ${f}`);
  }
});

test('phoneMatchCandidates is empty for short input', () => {
  assert.deepEqual(phoneMatchCandidates('123'), []);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test`
Expected: FAIL, `Cannot find module './phone'`.

- [ ] **Step 3: Implement**

`src/utils/phone.ts`:

```ts
/**
 * Nigerian phone helpers. Phones are stored raw in mixed formats
 * (0..., 234..., +234...), so lookups match against a candidate set and
 * new records are stored as E.164 (+234...).
 */

/** National significant number (10 digits, no 0 / 234 prefix), or null. */
function nsnOf(raw: string): string | null {
  let digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('234')) digits = digits.slice(3);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  return /^\d{10}$/.test(digits) ? digits : null;
}

/** "+2348031234567" for any Nigerian format, or null when it isn't a valid number. */
export function toE164NG(raw: string): string | null {
  const nsn = nsnOf(raw);
  return nsn ? `+234${nsn}` : null;
}

/** Every stored format a typed phone could match, for `{ phone: { $in } }` queries. */
export function phoneMatchCandidates(raw: string): string[] {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length < 7) return [];
  let nsn = digits;
  if (nsn.startsWith('234')) nsn = nsn.slice(3);
  else if (nsn.startsWith('0')) nsn = nsn.slice(1);
  if (!nsn) return [];
  return Array.from(
    new Set([raw.trim(), digits, nsn, `0${nsn}`, `234${nsn}`, `+234${nsn}`, `+${digits}`])
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS, 4 tests.

- [ ] **Step 5: Reuse in AuthService**

In `src/services/AuthService.ts`, add the import next to the other utils imports:

```ts
import { phoneMatchCandidates } from '../utils/phone';
```

Replace the whole body of `private phoneLoginCandidates(raw: string): string[] { ... }` (lines ~164-182) with:

```ts
  private phoneLoginCandidates(raw: string): string[] {
    return phoneMatchCandidates(raw);
  }
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no output, exit 0.

- [ ] **Step 7: Commit**

```bash
git add src/utils/phone.ts src/utils/phone.test.ts src/services/AuthService.ts
git commit -m "feat(utils): add Nigerian phone normalising helpers"
```

---

### Task 3: Bank account name match util

**Files:**
- Create: `backend/src/utils/nameMatch.ts`
- Create: `backend/src/utils/nameMatch.test.ts`

- [ ] **Step 1: Write the failing test**

`src/utils/nameMatch.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { accountNameMatches } from './nameMatch';

test('matches regardless of order, case and middle names', () => {
  assert.ok(accountNameMatches('OKAFOR CHINEDU JOHN', 'Chinedu', 'Okafor'));
  assert.ok(accountNameMatches('chinedu okafor', 'Chinedu', 'Okafor'));
  assert.ok(accountNameMatches('OKAFOR, CHINEDU', 'chinedu', 'OKAFOR'));
});

test('handles hyphenated and multi-word profile names', () => {
  assert.ok(accountNameMatches('ADEBAYO-OLA FUNMI GRACE', 'Funmi', 'Adebayo-Ola'));
  assert.ok(accountNameMatches('MARY ANN BELLO', 'Mary Ann', 'Bello'));
});

test('rejects a different person', () => {
  assert.equal(accountNameMatches('EMEKA OKAFOR', 'Chinedu', 'Okafor'), false);
  assert.equal(accountNameMatches('CHINEDU EZE', 'Chinedu', 'Okafor'), false);
});

test('rejects partial word matches', () => {
  assert.equal(accountNameMatches('CHINEDUM OKAFORS', 'Chinedu', 'Okafor'), false);
});

test('rejects empty input', () => {
  assert.equal(accountNameMatches('', 'Chinedu', 'Okafor'), false);
  assert.equal(accountNameMatches('CHINEDU OKAFOR', '', ''), false);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test`
Expected: FAIL, `Cannot find module './nameMatch'`.

- [ ] **Step 3: Implement**

`src/utils/nameMatch.ts`:

```ts
/** Uppercase words with punctuation (including hyphens) treated as separators. */
function words(s: string): string[] {
  return (s || '')
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * True when every word of the profile first and last name appears as a whole
 * word in the bank account name, in any order. Extra words (middle names) are
 * allowed. Used to stop tenants withdrawing referral earnings to someone
 * else's account.
 */
export function accountNameMatches(
  accountName: string,
  firstName: string,
  lastName: string
): boolean {
  const account = new Set(words(accountName));
  const required = [...words(firstName), ...words(lastName)];
  if (account.size === 0 || required.length === 0) return false;
  return required.every((w) => account.has(w));
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/nameMatch.ts src/utils/nameMatch.test.ts
git commit -m "feat(utils): add bank account name match helper"
```

---

### Task 4: Tenant referral pure helpers

**Files:**
- Create: `backend/src/utils/tenantReferral.ts`
- Create: `backend/src/utils/tenantReferral.test.ts`

- [ ] **Step 1: Write the failing test**

`src/utils/tenantReferral.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeCommission, buildInviteMessage, buildWhatsAppUrl } from './tenantReferral';

test('computeCommission converts kobo and applies the rate', () => {
  assert.deepEqual(computeCommission(6_500_000, 30), { basisAmount: 65000, commissionAmount: 19500 });
  assert.deepEqual(computeCommission(1_000_050, 30), { basisAmount: 10001, commissionAmount: 3000 });
});

test('computeCommission returns zeros for bad input', () => {
  assert.deepEqual(computeCommission(0, 30), { basisAmount: 0, commissionAmount: 0 });
  assert.deepEqual(computeCommission(-5, 30), { basisAmount: 0, commissionAmount: 0 });
  assert.deepEqual(computeCommission(Number.NaN, 30), { basisAmount: 0, commissionAmount: 0 });
});

test('buildInviteMessage tailors landlord vs caretaker and includes the link', () => {
  const link = 'https://property360.africa/onboarding?ref=ABCD2345';
  const l = buildInviteMessage({ relationship: 'landlord', link });
  const c = buildInviteMessage({ relationship: 'caretaker', link });
  assert.ok(l.includes(link) && c.includes(link));
  assert.ok(l.includes('your tenant'));
  assert.ok(c.includes('the building'));
  assert.ok(l.includes('first month is free'));
});

test('buildWhatsAppUrl with and without a number', () => {
  assert.equal(buildWhatsAppUrl('+2348031234567', 'hi there'), 'https://wa.me/2348031234567?text=hi%20there');
  assert.equal(buildWhatsAppUrl(null, 'hi'), 'https://wa.me/?text=hi');
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test`
Expected: FAIL, `Cannot find module './tenantReferral'`.

- [ ] **Step 3: Implement**

`src/utils/tenantReferral.ts`:

```ts
export type InviteRelationship = 'landlord' | 'caretaker';

/**
 * Paystack amounts arrive in kobo; the commission ledger and wallets are in
 * naira. Basis is rounded to the naira, commission rounded to the naira.
 */
export function computeCommission(
  amountKobo: number,
  ratePercent: number
): { basisAmount: number; commissionAmount: number } {
  if (!Number.isFinite(amountKobo) || amountKobo <= 0) {
    return { basisAmount: 0, commissionAmount: 0 };
  }
  const basisAmount = Math.round(amountKobo / 100);
  const commissionAmount = Math.round((basisAmount * ratePercent) / 100);
  return { basisAmount, commissionAmount };
}

/**
 * Prefilled WhatsApp text the tenant sends from their own phone. Wording
 * lives here only, so web and mobile show the same message. Property360
 * follows up on rent and records payments; it never collects rent.
 */
export function buildInviteMessage(args: {
  relationship: InviteRelationship;
  link: string;
}): string {
  const pitch =
    'It follows up on rent across WhatsApp, SMS and email and records every payment, so no more chasing.';
  if (args.relationship === 'caretaker') {
    return (
      "Hello, I've started using Property360 for our building. " +
      `${pitch} It makes managing the building much easier for you. ` +
      `Sign up with my link and your first month is free: ${args.link}`
    );
  }
  return (
    "Hello sir/ma, I've been using Property360 as your tenant. " +
    `${pitch} Sign up with my link and your first month is free: ${args.link}`
  );
}

/** wa.me deep link. With no number, WhatsApp lets the sender pick a contact. */
export function buildWhatsAppUrl(phoneE164: string | null, text: string): string {
  const encoded = encodeURIComponent(text);
  if (!phoneE164) return `https://wa.me/?text=${encoded}`;
  return `https://wa.me/${phoneE164.replace(/\D/g, '')}?text=${encoded}`;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/tenantReferral.ts src/utils/tenantReferral.test.ts
git commit -m "feat(tenant-referral): add commission and invite message helpers"
```

---

### Task 5: Config

**Files:**
- Modify: `backend/src/config/index.ts`

- [ ] **Step 1: Add template keys for all three providers**

In `config.termii.whatsappTemplates` (after `maintenanceStatus`, ~line 96) add:

```ts
      tenantReferralInvite: process.env.TERMII_WHATSAPP_TEMPLATE_TENANT_REFERRAL_INVITE || '',
      tenantReferralReminder: process.env.TERMII_WHATSAPP_TEMPLATE_TENANT_REFERRAL_REMINDER || '',
```

In `config.whatsapp.meta.templates` (after `maintenanceStatus`, ~line 189) add:

```ts
        tenantReferralInvite:
          process.env.META_WHATSAPP_TEMPLATE_TENANT_REFERRAL_INVITE || '',
        tenantReferralReminder:
          process.env.META_WHATSAPP_TEMPLATE_TENANT_REFERRAL_REMINDER || '',
```

In `config.whatsapp.sendchamp.templates` (after `maintenanceStatus`, ~line 227) add:

```ts
        tenantReferralInvite:
          process.env.SENDCHAMP_WHATSAPP_TEMPLATE_TENANT_REFERRAL_INVITE || '',
        tenantReferralReminder:
          process.env.SENDCHAMP_WHATSAPP_TEMPLATE_TENANT_REFERRAL_REMINDER || '',
```

- [ ] **Step 2: Add the tenantReferral block**

Directly after the closing `},` of the `partner: { ... }` block (~line 359), add:

```ts
  // Tenant referral: tenants invite their landlord/caretaker and earn a cut of
  // the invitee's first paid subscription. Live on deploy (no master switch).
  // The WhatsApp follow-ups no-op until their template names are set above.
  tenantReferral: {
    ratePercent: Number(process.env.TENANT_REFERRAL_RATE ?? 30),
    attributionWindowDays: Number(process.env.TENANT_REFERRAL_WINDOW_DAYS ?? 60),
    reminderAfterDays: 3,
    maxInvitesPerDay: 10,
  },
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0. (If it complains about `WhatsAppTemplateKey` indexing, that is fixed in Task 8; continue.)

- [ ] **Step 4: Commit**

```bash
git add src/config/index.ts
git commit -m "feat(config): add tenant referral settings and template keys"
```

---

### Task 6: Commission ledger fields

**Files:**
- Modify: `backend/src/types/index.ts:710-723`
- Modify: `backend/src/models/PartnerCommission.ts`

- [ ] **Step 1: Update the type**

In `src/types/index.ts`, replace the `IPartnerCommission` interface with:

```ts
export type CommissionSource = 'partner' | 'tenant_referral';

export interface IPartnerCommission extends Document {
  source: CommissionSource;
  partnerCode?: IPartnerCode['_id']; // set only when source = 'partner'
  owner: IUser['_id'];
  referee: IUser['_id']; // unique — one commission per referred user
  basisAmount: number; // referred user's first payment, in NGN
  rate: number; // percent, frozen at conversion time
  commissionAmount: number; // NGN
  status: PartnerCommissionStatus;
  walletTransaction?: IWalletTransaction['_id'];
  // Paystack reference of the paying charge, used to match refunds.
  sourceReference?: string;
  // Set when a refund could not be clawed back (tenant already withdrew).
  needsReview?: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 2: Update the schema**

In `src/models/PartnerCommission.ts`, replace the `partnerCode` line with:

```ts
    source: {
      type: String,
      enum: ['partner', 'tenant_referral'],
      default: 'partner',
      index: true,
    },
    // Required for partner commissions only; tenant referrals have no code.
    partnerCode: {
      type: Schema.Types.ObjectId,
      ref: 'PartnerCode',
      index: true,
      required: function (this: { source?: string }) {
        return this.source !== 'tenant_referral';
      },
    },
```

and after the `walletTransaction` line add:

```ts
    sourceReference: { type: String, index: true },
    needsReview: { type: Boolean, default: false },
```

Existing rows have no `source` and read back as `'partner'` via the default, so no migration is needed.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/models/PartnerCommission.ts
git commit -m "feat(commission): add source, sourceReference and needsReview"
```

---

### Task 7: TenantInvite model

**Files:**
- Create: `backend/src/models/TenantInvite.ts`
- Modify: `backend/src/models/index.ts` (after line 48)

- [ ] **Step 1: Create the model**

`src/models/TenantInvite.ts`:

```ts
import { Schema, model, Document, Types } from 'mongoose';

export type TenantInviteStatus = 'sent' | 'joined' | 'paid';
export type TenantInviteRelationship = 'landlord' | 'caretaker';

/**
 * One row per "Invite my landlord/caretaker" action by a tenant. Phone is
 * optional (the tenant may pick the contact inside WhatsApp); when present it
 * is stored as E.164 and drives Property360's own follow-up messages and
 * phone-match attribution at signup.
 */
export interface ITenantInvite extends Document {
  tenant: Types.ObjectId;
  name?: string;
  phone?: string;
  relationship: TenantInviteRelationship;
  status: TenantInviteStatus;
  inviteeUser?: Types.ObjectId;
  commissionAmount?: number;
  followUp: {
    inviteSentAt?: Date;
    reminderSentAt?: Date;
    optedOut: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const tenantInviteSchema = new Schema<ITenantInvite>(
  {
    tenant: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, trim: true, maxlength: 80 },
    phone: { type: String, trim: true, index: true },
    relationship: { type: String, enum: ['landlord', 'caretaker'], required: true },
    status: { type: String, enum: ['sent', 'joined', 'paid'], default: 'sent', index: true },
    inviteeUser: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    commissionAmount: { type: Number, min: 0 },
    followUp: {
      inviteSentAt: { type: Date },
      reminderSentAt: { type: Date },
      optedOut: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// One invite per phone per tenant. Partial so phone-less invites don't collide.
tenantInviteSchema.index(
  { tenant: 1, phone: 1 },
  { unique: true, partialFilterExpression: { phone: { $type: 'string' } } }
);

export const TenantInvite = model<ITenantInvite>('TenantInvite', tenantInviteSchema);
export default TenantInvite;
```

- [ ] **Step 2: Export it**

In `src/models/index.ts`, after `export { PartnerCommission } from './PartnerCommission';` add:

```ts
export { TenantInvite } from './TenantInvite';
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/models/TenantInvite.ts src/models/index.ts
git commit -m "feat(tenant-referral): add TenantInvite model"
```

---

### Task 8: WhatsApp send-to-phone

**Files:**
- Modify: `backend/src/services/WhatsAppService.ts:21-27` (template keys) and add a method after `sendTemplate` (~line 478)

- [ ] **Step 1: Add the template keys**

Replace the `WhatsAppTemplateKey` union with:

```ts
export type WhatsAppTemplateKey =
  | 'paymentReminder'
  | 'invoiceSent'
  | 'receiptIssued'
  | 'tenantInvited'
  | 'leaseExpiring'
  | 'maintenanceStatus'
  | 'tenantReferralInvite'
  | 'tenantReferralReminder';
```

- [ ] **Step 2: Add `sendTemplateToPhone`**

`sendTemplate` requires a recipient User and a landlord tier. Referral invitees have no account yet, and Property360 (not a landlord) is the sender, so add a second entry point directly after `sendTemplate`'s closing brace:

```ts
  /**
   * Send a template to a raw phone number that has no Property360 account
   * yet (tenant referral invitees). Property360 is the sender, so the
   * landlord-tier and user-preference gates of sendTemplate don't apply.
   * Callers own opt-out checks. Best-effort: never throws.
   */
  async sendTemplateToPhone(
    phone: string,
    templateKey: WhatsAppTemplateKey,
    variables: string[]
  ): Promise<SendResult> {
    if (!config.whatsapp.enabled) {
      return { delivered: false, reason: 'master_switch_off' };
    }
    const provider = activeProvider();
    if (!provider.isConfigured()) {
      return { delivered: false, reason: 'provider_not_configured' };
    }
    const templateIdentifier = provider.templateIdFor(templateKey);
    if (!templateIdentifier) {
      return { delivered: false, reason: 'no_template_id' };
    }
    const to = digitsOnlyE164(phone);
    if (config.whatsapp.dryRun) {
      console.log(
        `[WhatsApp DRY_RUN provider=${provider.providerName}] template=${templateKey} (${templateIdentifier}) ` +
          `to ${to} vars=${JSON.stringify(variables)}`
      );
      return { delivered: false, reason: 'dry_run' };
    }
    try {
      const result = await provider.send(to, templateIdentifier, variables);
      return result.ok
        ? { delivered: true, providerMessageId: result.providerMessageId }
        : { delivered: false, reason: 'provider_error' };
    } catch (err) {
      console.error('[WhatsApp] sendTemplateToPhone failed:', err);
      return { delivered: false, reason: 'provider_error' };
    }
  }
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0 (this also resolves any Task 5 indexing warning).

- [ ] **Step 4: Commit**

```bash
git add src/services/WhatsAppService.ts
git commit -m "feat(whatsapp): add sendTemplateToPhone for non-user recipients"
```

---

### Task 9: Wallet clawback

**Files:**
- Modify: `backend/src/services/WalletService.ts` (add a method after `reverseTransaction`, ~line 247)

`reverseTransaction` gives money back (it is for failed withdrawals), so a refund of a commission needs the opposite: take a credit back out, atomically, only if the balance still covers it.

- [ ] **Step 1: Add `clawbackCredit`**

```ts
  /**
   * Take back a previously credited amount (e.g. a referral commission whose
   * source payment was refunded). Atomic: only succeeds while the balance
   * still covers the amount, so it can never race a withdrawal into a
   * negative balance. Returns false when funds are gone (caller flags it
   * for manual review).
   */
  async clawbackCredit(walletTransactionId: string, reason: string): Promise<boolean> {
    const original = await WalletTransaction.findById(walletTransactionId);
    if (!original || original.type !== 'credit' || original.status === 'reversed') {
      return false;
    }

    const wallet = await Wallet.findOneAndUpdate(
      { _id: original.wallet, balance: { $gte: original.amount } },
      { $inc: { balance: -original.amount, totalEarnings: -original.amount } },
      { new: true }
    );
    if (!wallet) return false;

    await WalletTransaction.create({
      wallet: wallet._id,
      landlord: original.landlord,
      type: 'debit',
      amount: original.amount,
      balanceBefore: wallet.balance + original.amount,
      balanceAfter: wallet.balance,
      status: 'completed',
      description: `Clawback: ${reason}`,
      reference: this.generateReference('debit'),
      metadata: { originalTransaction: original._id, reason },
    });

    original.status = 'reversed';
    await original.save();
    return true;
  }
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add src/services/WalletService.ts
git commit -m "feat(wallet): add atomic clawbackCredit"
```

---

### Task 10: TenantReferralService

**Files:**
- Create: `backend/src/services/TenantReferralService.ts`

This service must **not** import `ReferralService` (ReferralService imports it; avoid a cycle).

- [ ] **Step 1: Create the service**

```ts
import { PartnerCommission, TenantInvite, User } from '../models';
import { ITenantInvite, TenantInviteRelationship } from '../models/TenantInvite';
import { IUser, UserRole } from '../types';
import { AppError } from '../middleware/errorHandler';
import config from '../config';
import WalletService from './WalletService';
import WhatsAppService from './WhatsAppService';
import { phoneMatchCandidates, toE164NG } from '../utils/phone';
import { buildInviteMessage, buildWhatsAppUrl, computeCommission } from '../utils/tenantReferral';

const DAY_MS = 24 * 60 * 60 * 1000;
const REFEREE_ROLES = [UserRole.LANDLORD, UserRole.AGENT];

export interface CreateInviteInput {
  name?: string;
  phone?: string;
  relationship: TenantInviteRelationship;
}

class TenantReferralService {
  private shareUrl(code: string): string {
    return `${config.web.baseUrl}/onboarding?ref=${code}`;
  }

  private async requireTenant(tenantId: string): Promise<IUser> {
    const tenant = await User.findById(tenantId);
    if (!tenant || tenant.isDeleted) throw new AppError('User not found', 404);
    if (tenant.role !== UserRole.TENANT) throw new AppError('Only tenants can send referral invites', 403);
    if (!tenant.referralCode) await tenant.save(); // pre-save hook mints the code
    return tenant;
  }

  private async isOptedOut(phoneE164: string): Promise<boolean> {
    return Boolean(
      await TenantInvite.exists({ phone: phoneE164, 'followUp.optedOut': true })
    );
  }

  /**
   * Create an invite and return the prefilled WhatsApp text and link. The
   * client opens WhatsApp only after this succeeds, so limits always apply.
   */
  async createInvite(
    tenantId: string,
    input: CreateInviteInput
  ): Promise<{ invite: ITenantInvite; whatsappText: string; whatsappUrl: string }> {
    const tenant = await this.requireTenant(tenantId);

    const since = new Date(Date.now() - DAY_MS);
    const todayCount = await TenantInvite.countDocuments({ tenant: tenant._id, createdAt: { $gte: since } });
    if (todayCount >= config.tenantReferral.maxInvitesPerDay) {
      throw new AppError('You have reached today\'s invite limit. Please try again tomorrow.', 429);
    }

    let phone: string | undefined;
    if (input.phone && input.phone.trim()) {
      const e164 = toE164NG(input.phone);
      if (!e164) throw new AppError('Please enter a valid Nigerian phone number', 400);
      const candidates = phoneMatchCandidates(e164);
      if (tenant.phone && candidates.includes(tenant.phone)) {
        throw new AppError('You cannot invite your own number', 400);
      }
      const existingUser = await User.exists({ phone: { $in: candidates }, isDeleted: { $ne: true } });
      if (existingUser) throw new AppError('This person is already on Property360.', 409);
      phone = e164;
    }

    let invite: ITenantInvite;
    try {
      invite = await TenantInvite.create({
        tenant: tenant._id,
        name: input.name?.trim() || undefined,
        phone,
        relationship: input.relationship,
      });
    } catch (err: unknown) {
      if ((err as { code?: number })?.code === 11000) {
        throw new AppError('You have already invited this number.', 409);
      }
      throw err;
    }

    const link = this.shareUrl(tenant.referralCode!);
    const whatsappText = buildInviteMessage({ relationship: input.relationship, link });
    const whatsappUrl = buildWhatsAppUrl(phone ?? null, whatsappText);

    if (phone) void this.sendFollowUp(invite, tenant, 'tenantReferralInvite');

    return { invite, whatsappText, whatsappUrl };
  }

  /** Property360's own message to the invitee. Never throws. */
  private async sendFollowUp(
    invite: ITenantInvite,
    tenant: IUser,
    key: 'tenantReferralInvite' | 'tenantReferralReminder'
  ): Promise<void> {
    try {
      if (!invite.phone || (await this.isOptedOut(invite.phone))) return;
      // Invitee already has an account (e.g. joined with the code from another
      // phone): they're no longer a prospect, and their own WhatsApp
      // preferences apply, so don't message them from here.
      const alreadyUser = await User.exists({
        phone: { $in: phoneMatchCandidates(invite.phone) },
        isDeleted: { $ne: true },
      });
      if (alreadyUser) return;
      const result = await WhatsAppService.sendTemplateToPhone(invite.phone, key, [
        tenant.firstName,
        this.shareUrl(tenant.referralCode!),
      ]);
      // Stamp even when no template is configured yet, so a template approved
      // later doesn't blast every old invite at once.
      const field = key === 'tenantReferralInvite' ? 'followUp.inviteSentAt' : 'followUp.reminderSentAt';
      await TenantInvite.updateOne({ _id: invite._id }, { $set: { [field]: new Date() } });
      if (!result.delivered) {
        console.warn(`[TenantReferral] ${key} not delivered to invite ${invite._id}: ${result.reason}`);
      }
    } catch (err) {
      console.error('[TenantReferral] follow-up failed:', err);
    }
  }

  /** Daily cron: one reminder, N days after the first follow-up, if they haven't joined. */
  async sendDueReminders(): Promise<number> {
    const cutoff = new Date(Date.now() - config.tenantReferral.reminderAfterDays * DAY_MS);
    const due = await TenantInvite.find({
      status: 'sent',
      phone: { $type: 'string' },
      'followUp.optedOut': { $ne: true },
      'followUp.inviteSentAt': { $lte: cutoff },
      'followUp.reminderSentAt': { $exists: false },
    }).limit(500);

    let sent = 0;
    for (const invite of due) {
      const tenant = await User.findById(invite.tenant);
      if (!tenant || tenant.isDeleted) continue;
      await this.sendFollowUp(invite, tenant, 'tenantReferralReminder');
      sent++;
    }
    return sent;
  }

  /**
   * Inbound WhatsApp STOP from an invitee: suppress all further referral
   * messages to that number. Returns true when it was a STOP we handled.
   */
  async handleInboundOptOut(waId: string, text: string | undefined): Promise<boolean> {
    if (!text || !/^\s*stop\s*$/i.test(text)) return false;
    const e164 = toE164NG(waId);
    if (!e164) return false;
    const res = await TenantInvite.updateMany({ phone: e164 }, { $set: { 'followUp.optedOut': true } });
    return res.matchedCount > 0;
  }

  /**
   * Called right after any landlord/agent account is created. If the account
   * has no referrer yet, attribute it to the earliest tenant invite for its
   * phone inside the attribution window. Then mark the invite joined. Never throws.
   */
  async attributeSignup(user: IUser): Promise<void> {
    try {
      if (!REFEREE_ROLES.includes(user.role)) return;

      if (!user.referredBy && user.phone) {
        const since = new Date(Date.now() - config.tenantReferral.attributionWindowDays * DAY_MS);
        const candidates = phoneMatchCandidates(user.phone);
        const invite = await TenantInvite.findOne({
          phone: { $in: candidates },
          status: 'sent',
          createdAt: { $gte: since },
        }).sort({ createdAt: 1 });
        if (invite && String(invite.tenant) !== String(user._id)) {
          user.referredBy = invite.tenant;
          await user.save();
        }
      }

      if (!user.referredBy) return;
      const referrer = await User.findById(user.referredBy).select('role');
      if (referrer?.role !== UserRole.TENANT) return;

      const candidates = user.phone ? phoneMatchCandidates(user.phone) : [];
      const match = await TenantInvite.findOne({
        tenant: user.referredBy,
        status: 'sent',
        ...(candidates.length ? { phone: { $in: candidates } } : { _id: null }),
      });
      if (match) {
        match.status = 'joined';
        match.inviteeUser = user._id;
        await match.save();
      }
    } catch (err) {
      console.error('[TenantReferral] attributeSignup failed:', err);
    }
  }

  /**
   * First paid payment by a tenant-referred landlord/agent. Reserves the
   * commission row first (unique `referee` index = double-pay guard), then
   * credits the tenant's wallet; on credit failure the reservation is removed
   * so a retry can succeed. Returns true only when a new commission was
   * recorded, so the caller grants the referee's 30 days exactly once.
   */
  async recordCommissionOnConversion(
    referee: IUser,
    tenant: IUser,
    paymentAmountKobo: number | undefined,
    paymentReference: string | undefined
  ): Promise<boolean> {
    if (!paymentAmountKobo || paymentAmountKobo <= 0) return false;
    if (!REFEREE_ROLES.includes(referee.role)) return false;
    if (referee.email === tenant.email) return false;
    if (referee.phone && tenant.phone && phoneMatchCandidates(referee.phone).includes(tenant.phone)) {
      return false;
    }

    const rate = config.tenantReferral.ratePercent;
    const { basisAmount, commissionAmount } = computeCommission(paymentAmountKobo, rate);
    if (commissionAmount <= 0) return false;

    let commission;
    try {
      commission = await PartnerCommission.create({
        source: 'tenant_referral',
        owner: tenant._id,
        referee: referee._id,
        basisAmount,
        rate,
        commissionAmount,
        status: 'accrued',
        sourceReference: paymentReference,
      });
    } catch (err: unknown) {
      if ((err as { code?: number })?.code === 11000) return false; // already recorded
      throw err;
    }

    try {
      const refereeName = `${referee.firstName} ${referee.lastName?.[0] ?? ''}.`.trim();
      const walletTx = await WalletService.creditWallet(tenant._id.toString(), {
        amount: commissionAmount,
        description: `Referral reward: ${refereeName} joined`,
        metadata: {
          kind: 'tenant_referral_commission',
          referee: referee._id.toString(),
          rate,
          basisAmount,
        },
      });
      commission.walletTransaction = walletTx._id;
      await commission.save();
    } catch (creditErr) {
      await PartnerCommission.deleteOne({ _id: commission._id }).catch(() => {});
      throw creditErr;
    }

    await TenantInvite.updateOne(
      { tenant: tenant._id, inviteeUser: referee._id },
      { $set: { status: 'paid', commissionAmount } }
    ).catch((err) => console.error('[TenantReferral] invite paid update failed:', err));

    return true;
  }

  /**
   * Paystack `refund.processed`. Matches the refunded charge to a tenant
   * referral commission by reference (or, for commissions recorded from a
   * subscription.create event with no reference, by the customer's email)
   * and claws the reward back. If the tenant already withdrew it, the row is
   * flagged for manual review. Never throws.
   */
  async reverseOnRefund(data: any): Promise<void> {
    try {
      const reference: string | undefined =
        data?.transaction_reference ?? data?.transaction?.reference ?? undefined;

      let commission = reference
        ? await PartnerCommission.findOne({ source: 'tenant_referral', sourceReference: reference, status: 'accrued' })
        : null;

      if (!commission && data?.customer?.email) {
        const referee = await User.findOne({ email: String(data.customer.email).toLowerCase() }).select('_id');
        if (referee) {
          commission = await PartnerCommission.findOne({
            source: 'tenant_referral',
            referee: referee._id,
            status: 'accrued',
            sourceReference: { $exists: false },
          });
        }
      }
      if (!commission) return;

      // Claim the commission atomically so a retried refund webhook can't
      // process it twice.
      const claimed = await PartnerCommission.findOneAndUpdate(
        { _id: commission._id, status: 'accrued' },
        { $set: { status: 'reversed' } },
        { new: true }
      );
      if (!claimed) return;

      const result = claimed.walletTransaction
        ? await WalletService.clawbackCredit(String(claimed.walletTransaction), 'referral payment refunded')
        : 'clawed';
      // Only a missing balance needs a human; already_reversed/not_found are no-ops.
      if (result === 'insufficient_funds') {
        await PartnerCommission.updateOne({ _id: claimed._id }, { $set: { needsReview: true } });
      }
    } catch (err) {
      console.error('[TenantReferral] reverseOnRefund failed:', err);
    }
  }

  /** Tenant's Refer & Earn screen. */
  async getOverview(tenantId: string) {
    const tenant = await this.requireTenant(tenantId);
    const [invites, earnedAgg] = await Promise.all([
      TenantInvite.find({ tenant: tenant._id }).sort({ createdAt: -1 }).limit(100).lean(),
      PartnerCommission.aggregate([
        { $match: { owner: tenant._id, source: 'tenant_referral', status: { $ne: 'reversed' } } },
        { $group: { _id: null, total: { $sum: '$commissionAmount' } } },
      ]),
    ]);
    return {
      referralCode: tenant.referralCode,
      shareUrl: this.shareUrl(tenant.referralCode!),
      ratePercent: config.tenantReferral.ratePercent,
      invites: invites.map((i) => ({
        id: String(i._id),
        name: i.name ?? null,
        phone: i.phone ?? null,
        relationship: i.relationship,
        status: i.status,
        commissionAmount: i.commissionAmount ?? null,
        createdAt: i.createdAt,
      })),
      totals: {
        invited: invites.length,
        joined: invites.filter((i) => i.status !== 'sent').length,
        paid: invites.filter((i) => i.status === 'paid').length,
        earned: earnedAgg[0]?.total ?? 0,
      },
    };
  }

  /** Admin: every tenant referral commission, newest first. */
  async listForAdmin(page = 1, limit = 50) {
    const filter = { source: 'tenant_referral' };
    const [items, total] = await Promise.all([
      PartnerCommission.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('owner', 'firstName lastName email phone')
        .populate('referee', 'firstName lastName email role')
        .lean(),
      PartnerCommission.countDocuments(filter),
    ]);
    // Same shape as the other admin list endpoints (web `Paginated<T>`).
    return { items, total, page, limit, pages: Math.ceil(total / limit) };
  }
}

export default new TenantReferralService();
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0. If `user.role` is typed as `string` rather than `UserRole` and `REFEREE_ROLES.includes` complains, cast: `REFEREE_ROLES.includes(user.role as UserRole)`.

- [ ] **Step 3: Commit**

```bash
git add src/services/TenantReferralService.ts
git commit -m "feat(tenant-referral): add TenantReferralService"
```

---

### Task 11: Wire the reward into the payment hook

**Files:**
- Modify: `backend/src/services/ReferralService.ts:41-79`
- Modify: `backend/src/services/SubscriptionService.ts` (3 call sites: ~413, ~530, ~571)

- [ ] **Step 1: Add the tenant branch**

In `ReferralService.ts`, add the import:

```ts
import TenantReferralService from './TenantReferralService';
import { UserRole } from '../types';
```

(`IUser, SubscriptionStatus` are already imported from `'../types'`; merge `UserRole` into that import line instead of adding a second one.)

Change the method signature to accept the reference:

```ts
  async applyCreditOnFirstPayment(
    refereeId: string,
    paymentAmountKobo?: number,
    paymentReference?: string
  ): Promise<void> {
```

Replace the peer-path block, from `// Peer path (unchanged): 30 free days to both sides.` down to the end of the `await Promise.all([...]);` call, with:

```ts
      if (!referee.referredBy) return; // No referrer to credit.

      const referrer = await User.findById(referee.referredBy);
      if (!referrer || referrer.isDeleted) return; // Referrer gone — drop quietly.

      // Tenant path: cash commission to the tenant, 30 days to the referee only
      // (tenants have no subscription). The commission ledger's unique referee
      // index guards against double-firing; days are granted only when a new
      // commission was actually recorded.
      if (referrer.role === UserRole.TENANT) {
        const recorded = await TenantReferralService.recordCommissionOnConversion(
          referee,
          referrer,
          paymentAmountKobo,
          paymentReference
        );
        if (recorded) {
          referee.referralCreditedAt = new Date();
          await referee.save();
          await this.extendSubscriptionByDays(refereeId, REFERRAL_BONUS_DAYS);
        }
        return;
      }

      // Peer path (unchanged): 30 free days to both sides.
      if (referee.referralCreditedAt) return; // Already credited.

      // Stamp first so a concurrent webhook + verify doesn't double-fire.
      referee.referralCreditedAt = new Date();
      await referee.save();

      await Promise.all([
        this.extendSubscriptionByDays(refereeId, REFERRAL_BONUS_DAYS),
        this.extendSubscriptionByDays(
          referrer._id.toString(),
          REFERRAL_BONUS_DAYS
        ),
      ]);
```

- [ ] **Step 2: Pass the payment reference from SubscriptionService**

In `SubscriptionService.ts`:

- In `verifyByReference` (~line 413), change `void ReferralService.applyCreditOnFirstPayment(userId, tx.amount);` to:

```ts
    void ReferralService.applyCreditOnFirstPayment(userId, tx.amount, reference);
```

- In the `charge.success` branch of `handlePaystackEvent` (~line 530), change the call to:

```ts
        void ReferralService.applyCreditOnFirstPayment(sub.user.toString(), data.amount, data?.reference);
```

- Leave the `subscription.create` call (~line 571) as is: that event carries no charge reference. `reverseOnRefund` falls back to matching by customer email for commissions recorded from it.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/services/ReferralService.ts src/services/SubscriptionService.ts
git commit -m "feat(referral): pay tenants 30% of the referee's first payment"
```

---

### Task 12: Refund webhook

**Files:**
- Modify: `backend/src/services/PaymentGatewayService.ts:410` (inside `handleWebhook`, right after `const { event, data } = payload;`)

- [ ] **Step 1: Route refunds**

Insert directly after `const { event, data } = payload;`:

```ts
    // Refunds: claw back any tenant referral reward earned on the refunded
    // charge. No-op for refunds that didn't produce a reward.
    if (event === 'refund.processed') {
      const TenantReferralService = (await import('./TenantReferralService')).default;
      await TenantReferralService.reverseOnRefund(data);
      return;
    }
```

(Dynamic import for the same circular-dependency reason as the SubscriptionService import below it.)

- [ ] **Step 2: Confirm the Paystack payload shape**

Open https://paystack.com/docs/payments/webhooks/ (refund events) and confirm the refunded charge's reference is at `data.transaction_reference` and the customer email at `data.customer.email`. If Paystack's current payload differs, adjust the two lookups at the top of `reverseOnRefund` (Task 10) to match. Also make sure `refund.processed` is enabled for the webhook in the Paystack dashboard.

- [ ] **Step 3: Typecheck and commit**

Run: `npx tsc --noEmit` (expect exit 0), then:

```bash
git add src/services/PaymentGatewayService.ts src/services/TenantReferralService.ts
git commit -m "feat(tenant-referral): claw back rewards on subscription refunds"
```

---

### Task 13: Attribute signups

**Files:**
- Modify: `backend/src/services/AuthService.ts:90-100` (after `User.create` in `register`)
- Modify: `backend/src/services/WhatsAppOnboardingService.ts:258-276` (after `User.create` in `createAccount`)

- [ ] **Step 1: Register path**

In `AuthService.ts`, add the import:

```ts
import TenantReferralService from './TenantReferralService';
```

Directly after the `const user = await User.create({ ... });` statement in `register`, add:

```ts
    // Phone-match fallback for tenant referral invites + mark the invite
    // joined. Best-effort and quick; never blocks registration.
    if (data.role !== UserRole.TENANT) {
      await TenantReferralService.attributeSignup(user);
    }
```

- [ ] **Step 2: WhatsApp onboarding path**

In `WhatsAppOnboardingService.ts`, add the import:

```ts
import TenantReferralService from './TenantReferralService';
```

Directly after `await WhatsAppOnboarding.deleteOne({ _id: doc._id });` that follows the successful `User.create` (the one before the set-password email block, ~line 276), add:

```ts
    // Invitees messaged by a tenant's referral usually register right here;
    // their WhatsApp number is their phone, so phone-match attribution applies.
    await TenantReferralService.attributeSignup(user);
```

(`attributeSignup` returns early for tenant accounts itself.)

- [ ] **Step 3: Typecheck and commit**

Run: `npx tsc --noEmit` (expect exit 0), then:

```bash
git add src/services/AuthService.ts src/services/WhatsAppOnboardingService.ts
git commit -m "feat(tenant-referral): attribute signups to tenant invites"
```

---

### Task 14: Tenant API

**Files:**
- Create: `backend/src/validations/tenantReferral.ts`
- Create: `backend/src/controllers/TenantReferralController.ts`
- Create: `backend/src/routes/tenantReferral.ts`
- Modify: `backend/src/routes/index.ts` (import + mount)

- [ ] **Step 1: Validation**

`src/validations/tenantReferral.ts`:

```ts
import { body } from 'express-validator';

export const createTenantInviteValidation = [
  body('relationship')
    .isIn(['landlord', 'caretaker'])
    .withMessage('Relationship must be landlord or caretaker'),
  body('name').optional({ values: 'falsy' }).isString().trim().isLength({ max: 80 }),
  body('phone').optional({ values: 'falsy' }).isString().trim().isLength({ min: 7, max: 20 }),
];
```

- [ ] **Step 2: Controller**

`src/controllers/TenantReferralController.ts`:

```ts
import { Response, NextFunction } from 'express';
import { AuthRequest, ApiResponse } from '../types';
import TenantReferralService from '../services/TenantReferralService';

class TenantReferralController {
  /** GET /tenant-referrals: code, share link, invites and totals. */
  async getOverview(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await TenantReferralService.getOverview(req.user!._id.toString());
      const response: ApiResponse = { success: true, message: 'Tenant referral overview', data };
      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }

  /** POST /tenant-referrals/invites: save an invite, return WhatsApp text + link. */
  async createInvite(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, phone, relationship } = req.body;
      const result = await TenantReferralService.createInvite(req.user!._id.toString(), {
        name,
        phone,
        relationship,
      });
      const response: ApiResponse = {
        success: true,
        message: 'Invite created',
        data: {
          invite: {
            id: String(result.invite._id),
            name: result.invite.name ?? null,
            phone: result.invite.phone ?? null,
            relationship: result.invite.relationship,
            status: result.invite.status,
            createdAt: result.invite.createdAt,
          },
          whatsappText: result.whatsappText,
          whatsappUrl: result.whatsappUrl,
        },
      };
      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new TenantReferralController();
```

- [ ] **Step 3: Route**

`src/routes/tenantReferral.ts`:

```ts
import { Router } from 'express';
import TenantReferralController from '../controllers/TenantReferralController';
import { protect, authorize, validate } from '../middleware';
import { UserRole } from '../types';
import { createTenantInviteValidation } from '../validations/tenantReferral';

const router = Router();

router.use(protect);
router.use(authorize(UserRole.TENANT));

// GET /tenant-referrals - Refer & Earn overview
router.get('/', TenantReferralController.getOverview);

// POST /tenant-referrals/invites - Invite a landlord or caretaker
router.post('/invites', validate(createTenantInviteValidation), TenantReferralController.createInvite);

export default router;
```

- [ ] **Step 4: Mount**

In `src/routes/index.ts`, after `import referralRoutes from './referral';` add:

```ts
import tenantReferralRoutes from './tenantReferral';
```

and next to the existing `router.use('/referrals', referralRoutes);` line (search for `referralRoutes`) add:

```ts
router.use('/tenant-referrals', tenantReferralRoutes);
```

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit` (expect exit 0), then:

```bash
git add src/validations/tenantReferral.ts src/controllers/TenantReferralController.ts src/routes/tenantReferral.ts src/routes/index.ts
git commit -m "feat(tenant-referral): add tenant invite and overview endpoints"
```

---

### Task 15: Tenant wallet access and payout name match

**Files:**
- Modify: `backend/src/routes/wallet.ts:12`
- Modify: `backend/src/routes/payouts.ts:11`
- Modify: `backend/src/services/PayoutService.ts:64` (after the `isVerified` check)

`bankAccounts.ts` needs no change: it has no role gate and `requireActiveSubscription` already skips tenants. `requireVerifiedKyc` on `POST /payouts` already skips tenants (spec: no KYC for tenants).

- [ ] **Step 1: Allow tenants on wallet and payouts**

In both `routes/wallet.ts` and `routes/payouts.ts`, replace:

```ts
router.use(authorize(UserRole.LANDLORD, UserRole.PARTNER));
```

with:

```ts
// Tenants own a wallet for tenant referral earnings (withdraw only).
router.use(authorize(UserRole.LANDLORD, UserRole.PARTNER, UserRole.TENANT));
```

- [ ] **Step 2: Name match on tenant payouts**

In `PayoutService.ts`, add imports:

```ts
import { User } from '../models';
import { UserRole } from '../types';
import { accountNameMatches } from '../utils/nameMatch';
```

(Merge `User` into the existing `'../models'` import and `UserRole` into the existing `'../types'` import.)

Directly after:

```ts
    if (!bankAccount.isVerified) {
      throw new AppError('Bank account is not verified', 400);
    }
```

add:

```ts
    // Tenants skip KYC, so their referral earnings may only go to an account
    // in their own name (Paystack-resolved accountName vs profile name).
    const owner = await User.findById(landlordId).select('role firstName lastName');
    if (
      owner?.role === UserRole.TENANT &&
      !accountNameMatches(bankAccount.accountName, owner.firstName, owner.lastName)
    ) {
      throw new AppError("This account name doesn't match your profile name.", 400);
    }
```

- [ ] **Step 3: Typecheck and commit**

Run: `npx tsc --noEmit` (expect exit 0), then:

```bash
git add src/routes/wallet.ts src/routes/payouts.ts src/services/PayoutService.ts
git commit -m "feat(wallet): let tenants withdraw referral earnings to own-name accounts"
```

---

### Task 16: Admin list, STOP opt-out, reminder cron, template script

**Files:**
- Modify: `backend/src/controllers/AdminController.ts` (new method)
- Modify: `backend/src/routes/admin.ts:51` (new route)
- Modify: `backend/src/controllers/WhatsAppWebhookController.ts:88-101`
- Modify: `backend/src/server.ts:97-130` (inside the 1 AM daily cron)
- Create: `backend/scripts/register-tenant-referral-templates.sh`

- [ ] **Step 1: Admin endpoint**

In `AdminController.ts`, add the import `import TenantReferralService from '../services/TenantReferralService';` and this method inside the class (next to the partner methods):

```ts
  async listTenantReferrals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, Number(req.query.page) || 1);
      const data = await TenantReferralService.listForAdmin(page);
      res.status(200).json({ success: true, message: 'Tenant referrals', data });
    } catch (error) {
      next(error);
    }
  }
```

(Use the same `req` type the neighbouring partner methods use; if they take `AuthRequest`, use that.)

In `routes/admin.ts`, after the `router.delete('/partners/:id', ...)` line add:

```ts
router.get('/tenant-referrals', AdminController.listTenantReferrals);
```

- [ ] **Step 2: STOP opt-out in the WhatsApp webhook**

In `WhatsAppWebhookController.ts`, add `import TenantReferralService from '../services/TenantReferralService';`. Replace the `// Inbound messages (assistant channel).` block with:

```ts
        // Inbound messages. A bare STOP from a tenant-referral invitee opts the
        // number out of referral follow-ups, regardless of the assistant switch.
        for (const msg of change.value?.messages ?? []) {
          if (!msg?.id || !msg?.from) continue;
          const handledStop = await TenantReferralService.handleInboundOptOut(
            msg.from,
            msg.text?.body
          );
          if (handledStop || !config.whatsapp.assistant.enabled) continue;
          // Sequential on purpose: the 200 is already out, processInbound
          // never throws, and one pipeline at a time bounds batch spikes.
          await WhatsAppAssistantService.processInbound(
            msg.from,
            msg.id,
            msg.type,
            msg.text?.body
          );
        }
```

- [ ] **Step 3: Daily reminder cron**

In `server.ts`, add `import TenantReferralService from './services/TenantReferralService';` with the other service imports. Inside the `cron.schedule('0 1 * * *', ...)` callback, after the subscription renewal `try { ... } catch { ... }` block, add:

```ts
      // Tenant referral: one reminder to invitees who haven't joined after 3 days.
      try {
        const sent = await TenantReferralService.sendDueReminders();
        if (sent > 0) console.log(`[Cron] Sent ${sent} tenant referral reminder(s)`);
      } catch (err) {
        console.error('[Cron] Tenant referral reminders failed:', err);
      }
```

- [ ] **Step 4: Template registration script**

`scripts/register-tenant-referral-templates.sh`:

```bash
#!/usr/bin/env bash
#
# Register the 2 tenant-referral WhatsApp templates with Meta (Cloud API).
# These go to people who have not opted in yet, so they are MARKETING
# templates (unlike the UTILITY ones in register-whatsapp-templates.sh).
#
# Usage:
#   WABA_ID=xxxxxxxxxxxx TOKEN=EAAxxxx ./register-tenant-referral-templates.sh
#
# After approval set:
#   META_WHATSAPP_TEMPLATE_TENANT_REFERRAL_INVITE=tenant_referral_invite
#   META_WHATSAPP_TEMPLATE_TENANT_REFERRAL_REMINDER=tenant_referral_reminder
#
# Variables (must match TenantReferralService.sendFollowUp):
#   {{1}} tenant first name   {{2}} referral link

set -euo pipefail

: "${WABA_ID:?Set WABA_ID (WhatsApp Business Account ID)}"
: "${TOKEN:?Set TOKEN (Meta access token)}"
API_VERSION="${API_VERSION:-v21.0}"
LANG_CODE="${LANG_CODE:-en}"
BASE="https://graph.facebook.com/${API_VERSION}/${WABA_ID}/message_templates"

create() {
  local name="$1" body="$2"
  echo "=== Creating ${name} ==="
  curl -sS -X POST "$BASE" \
    -H "Authorization: Bearer ${TOKEN}" \
    -H "Content-Type: application/json" \
    -d "$(cat <<JSON
{
  "name": "${name}",
  "language": "${LANG_CODE}",
  "category": "MARKETING",
  "components": [
    { "type": "BODY", "text": "${body}",
      "example": { "body_text": [ [ "Chinedu", "https://property360.africa/onboarding?ref=ABCD2345" ] ] } },
    { "type": "FOOTER", "text": "Reply STOP to opt out" }
  ]
}
JSON
)"
  echo; echo
}

create "tenant_referral_invite" \
  "{{1}} invited you to Property360, the easy way to follow up on rent and record every payment. Sign up with their link and your first month is free: {{2}}"

create "tenant_referral_reminder" \
  "Hi, a reminder that {{1}} invited you to Property360. Your free first month is still waiting: {{2}}"
```

Then: `chmod +x scripts/register-tenant-referral-templates.sh`

- [ ] **Step 5: Typecheck and commit**

Run: `npx tsc --noEmit` (expect exit 0), then:

```bash
git add src/controllers/AdminController.ts src/routes/admin.ts src/controllers/WhatsAppWebhookController.ts src/server.ts scripts/register-tenant-referral-templates.sh
git commit -m "feat(tenant-referral): admin list, STOP opt-out, reminder cron, template script"
```

---

### Task 17: End-to-end check

Requires a local dev server with a reachable MongoDB and Paystack **test** keys. If unavailable, stop after Step 1 and hand off: `tsc` and `npm test` passing is the minimum bar.

- [ ] **Step 1: Full checks**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: all tests pass, no type errors, build succeeds.

- [ ] **Step 2: Start the server**

Run: `WHATSAPP_DRY_RUN=true npm run dev` (use whatever env var `config.whatsapp.dryRun` reads, check `src/config/index.ts`).
Expected: `Server running on port ...`.

- [ ] **Step 3: Tenant creates an invite**

```bash
TOKEN=$(curl -s -X POST http://localhost:5001/api/v1/auth/login -H 'Content-Type: application/json' \
  -d '{"identifier":"<tenant-email>","password":"<pw>"}' | jq -r '.data.accessToken')
curl -s -X POST http://localhost:5001/api/v1/tenant-referrals/invites \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"relationship":"landlord","name":"Mr Bello","phone":"08035550101"}' | jq
```

Expected: 201 with `whatsappUrl` starting `https://wa.me/2348035550101?text=`, and a `[WhatsApp DRY_RUN ...] template=tenantReferralInvite` log line (or a `no_template_id` warning if template names aren't set). Repeat the same call: expect 409 "already invited".

- [ ] **Step 4: Invitee signs up and pays**

Register a landlord with phone `08035550101` and **no** referral code, then complete a test subscription checkout. Check in MongoDB:
- the landlord's `referredBy` is the tenant (phone-match attribution)
- the invite went `sent` → `joined` → `paid`
- one `partnercommissions` row with `source: 'tenant_referral'`, `commissionAmount` = 30% of the naira amount
- the tenant's wallet balance increased by that amount
- the landlord's `renewsAt` is 30 days later than normal
Re-send the same Paystack webhook: no second commission, no second credit.

- [ ] **Step 5: Withdraw**

As the tenant, add a bank account in a different name and `POST /api/v1/payouts` with `{"amount":1000}`: expect 400 "doesn't match your profile name". With an own-name account: expect success.

- [ ] **Step 6: Push and open the PR**

```bash
git push -u origin feat/tenant-referral
gh pr create --base main --title "feat: tenant referral (invite landlord/caretaker, 30% reward, tenant wallet)" --body "Implements docs/superpowers/specs/2026-09-23-tenant-referral-design.md (backend)."
```
