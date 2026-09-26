# Tenant Referral Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give tenants a Refer & Earn page in the web portal (`/me`), turn the tenant Wallet page into a referral-earnings wallet with bank accounts and withdrawals, and give admins a Tenant referrals list.

**Architecture:** Plain additions to the existing `tenantApi` / `adminApi` service objects, used directly from `useQuery`/`useMutation` in `"use client"` pages (the codebase has no custom hook files). The tenant withdraw and bank-account pages are copies of the landlord ones with the API object, top bar and routes swapped. The prefilled WhatsApp text and `wa.me` link come from the backend, so wording lives in one place.

**Tech Stack:** Next.js 16 (app router), React 19, TanStack Query 5, axios, Tailwind v4, lucide-react.

**Repo:** `web/` (its own git repo, remote `apcexchange/property360`).

**Spec:** `docs/superpowers/specs/2026-09-23-tenant-referral-design.md`
**Depends on:** backend plan `docs/superpowers/plans/2026-09-23-tenant-referral-backend.md` (endpoints `GET /tenant-referrals`, `POST /tenant-referrals/invites`, `GET /admin/tenant-referrals`, and tenants allowed on `/wallet` and `/payouts`). Build against a backend running that branch.

---

## Before you start

- Worktree off `origin/main`, branch `feat/tenant-referral-web`.
- **No tests exist in web.** Verification is `npx tsc --noEmit`, `npm run lint`, `npm run build`, then the browser walkthrough in Task 8.
- **Decision (option A):** the tenant wallet holds only referral earnings and is withdraw-only. The existing `/me/wallet` page's funding-account card (`WalletFundCard`, DVA) is removed because its backend (`feat/wallet-dva`) was never merged. The "Pay from wallet" button on `/me/payments` is already hidden unless `wallet.dvaStatus` is set, which never happens on this backend, so leave that page alone.
- UI conventions: tenant pages use `TenantTopbar` (`@/components/me/Topbar`) and `PageContainer`, `Card`, `Skeleton`, `ErrorBox`, `EmptyState`, `StatusPill`, `formatNgn`, `formatDate` from `@/components/app/ui`. Toasts: `useToast()` from `@/components/ui/Toast`. Inputs are raw `<input>`/`<select>` with `rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700`.

## File map

| File | Status | Responsibility |
|---|---|---|
| `src/lib/tenant-api.ts` | modify | referral types + methods, payout and bank-account management methods |
| `src/app/me/refer/page.tsx` | create | Refer & Earn page |
| `src/components/me/InviteForm.tsx` | create | invite form card (name, phone, relationship) |
| `src/components/me/Sidebar.tsx` | modify | nav item |
| `src/app/me/wallet/page.tsx` | modify | referral-earnings wallet, withdraw + bank actions |
| `src/app/me/wallet/withdraw/page.tsx` | create | copy of landlord withdraw, tenant API |
| `src/app/me/wallet/bank-accounts/page.tsx` | create | copy of landlord bank accounts, tenant API |
| `src/lib/admin.ts` | modify | `listTenantReferrals` |
| `src/app/admin/(app)/tenant-referrals/page.tsx` | create | admin table |
| `src/components/admin/Sidebar.tsx` | modify | admin nav item |

---

### Task 1: tenantApi additions

**Files:**
- Modify: `web/src/lib/tenant-api.ts` (types after `WalletTransaction` ~line 377; methods at the end of the `tenantApi` object, after `payInvoiceFromWallet`)

- [ ] **Step 1: Add types**

After the `WalletTransaction` interface add:

```ts
export type TenantInviteStatus = "sent" | "joined" | "paid";
export type TenantInviteRelationship = "landlord" | "caretaker";

export interface TenantInvite {
  id: string;
  name: string | null;
  phone: string | null;
  relationship: TenantInviteRelationship;
  status: TenantInviteStatus;
  commissionAmount?: number | null;
  createdAt: string;
}

export interface TenantReferralOverview {
  referralCode: string;
  shareUrl: string;
  ratePercent: number;
  invites: TenantInvite[];
  totals: { invited: number; joined: number; paid: number; earned: number };
}

export interface CreateTenantInviteResult {
  invite: TenantInvite;
  whatsappText: string;
  whatsappUrl: string;
}

export interface TenantPayout {
  _id: string;
  amount: number;
  reference: string;
  status: "pending" | "processing" | "successful" | "failed" | "reversed";
  createdAt: string;
  completedAt?: string;
}
```

- [ ] **Step 2: Add methods**

Inside `export const tenantApi = { ... }`, after `payInvoiceFromWallet`, add:

```ts
  async getReferralOverview(): Promise<TenantReferralOverview> {
    const res = await api.get("/tenant-referrals");
    return unwrap(res.data) as TenantReferralOverview;
  },
  async createReferralInvite(body: {
    relationship: TenantInviteRelationship;
    name?: string;
    phone?: string;
  }): Promise<CreateTenantInviteResult> {
    const res = await api.post("/tenant-referrals/invites", body);
    return unwrap(res.data) as CreateTenantInviteResult;
  },
  async setPrimaryBankAccount(id: string): Promise<TenantBankAccount> {
    const res = await api.patch(`/bank-accounts/${id}/primary`);
    return unwrap(res.data) as TenantBankAccount;
  },
  async deleteBankAccount(id: string): Promise<void> {
    await api.delete(`/bank-accounts/${id}`);
  },
  async requestPayout(body: { amount: number; bankAccountId?: string }): Promise<TenantPayout> {
    const res = await api.post("/payouts", body);
    return unwrap(res.data) as TenantPayout;
  },
  async listPayouts(): Promise<TenantPayout[]> {
    const res = await api.get("/payouts");
    return asList<TenantPayout>(unwrap(res.data));
  },
```

- [ ] **Step 3: Typecheck and commit**

Run: `npx tsc --noEmit` (expect exit 0), then:

```bash
git add src/lib/tenant-api.ts
git commit -m "feat(me): add tenant referral, payout and bank-account API methods"
```

---

### Task 2: Invite form component

**Files:**
- Create: `web/src/components/me/InviteForm.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { MessageCircle } from "lucide-react";
import { Card } from "@/components/app/ui";
import { useToast } from "@/components/ui/Toast";
import { tenantApi, TenantInviteRelationship } from "@/lib/tenant-api";

const inputCls =
  "w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700";

/**
 * "Invite my landlord/caretaker". Saves the invite first (so the backend's
 * duplicate and daily limits apply), then opens WhatsApp with the message the
 * backend wrote. With no number, WhatsApp lets the tenant pick the contact.
 */
export function InviteForm() {
  const qc = useQueryClient();
  const toast = useToast();
  const [relationship, setRelationship] = useState<TenantInviteRelationship>("landlord");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const invite = useMutation({
    mutationFn: () =>
      tenantApi.createReferralInvite({
        relationship,
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
      }),
    onSuccess: (res) => {
      window.open(res.whatsappUrl, "_blank", "noopener");
      qc.invalidateQueries({ queryKey: ["me", "referrals"] });
      setName("");
      setPhone("");
      toast.success("Invite saved. Send the message in WhatsApp.");
    },
  });

  const error = invite.isError
    ? ((invite.error as AxiosError<{ message?: string }>).response?.data?.message ??
      (invite.error as Error).message)
    : null;

  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="text-[15px] font-semibold text-foundation-700">
          Invite my landlord or caretaker
        </h2>
        <p className="mt-1 text-[12.5px] text-ink-muted">
          We open WhatsApp with a message ready to send. Add their number and we&apos;ll also
          send them a reminder from Property360.
        </p>
      </div>

      <div className="flex gap-2">
        {(["landlord", "caretaker"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRelationship(r)}
            className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold transition ${
              relationship === r
                ? "bg-foundation-700 text-paper"
                : "border border-foundation-700/15 bg-paper text-foundation-700 hover:bg-foundation-700/5"
            }`}
          >
            {r === "landlord" ? "Landlord" : "Caretaker"}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className={inputCls}
          placeholder="Their name (optional)"
          value={name}
          maxLength={80}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className={inputCls}
          placeholder="WhatsApp number (optional)"
          inputMode="tel"
          value={phone}
          maxLength={20}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      {error && <p className="text-[12.5px] text-red-700">{error}</p>}

      <button
        type="button"
        disabled={invite.isPending}
        onClick={() => invite.mutate()}
        className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        <MessageCircle className="h-4 w-4" />
        {invite.isPending ? "Saving…" : "Send on WhatsApp"}
      </button>
    </Card>
  );
}
```

Note: `window.open` runs after an `await`, so some browsers treat it as a popup. If it is blocked, the toast still shows; Task 3's page also keeps a "Share my link on WhatsApp" button that opens synchronously.

- [ ] **Step 2: Typecheck and commit**

Run: `npx tsc --noEmit` (expect exit 0), then:

```bash
git add src/components/me/InviteForm.tsx
git commit -m "feat(me): add landlord/caretaker invite form"
```

---

### Task 3: Refer & Earn page

**Files:**
- Create: `web/src/app/me/refer/page.tsx`
- Modify: `web/src/components/me/Sidebar.tsx:24-28`

- [ ] **Step 1: Create the page**

```tsx
"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Gift, Wallet } from "lucide-react";
import { useState } from "react";
import { TenantTopbar } from "@/components/me/Topbar";
import { InviteForm } from "@/components/me/InviteForm";
import {
  Card,
  EmptyState,
  ErrorBox,
  PageContainer,
  Skeleton,
  StatusPill,
  formatDate,
  formatNgn,
} from "@/components/app/ui";
import { useToast } from "@/components/ui/Toast";
import { tenantApi, TenantInvite } from "@/lib/tenant-api";

function statusPill(invite: TenantInvite) {
  if (invite.status === "paid") {
    return <StatusPill label={`You earned ${formatNgn(invite.commissionAmount ?? 0)}`} tone="good" />;
  }
  if (invite.status === "joined") return <StatusPill label="Joined" tone="info" />;
  return <StatusPill label="Invited" tone="neutral" />;
}

export default function TenantReferPage() {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const q = useQuery({
    queryKey: ["me", "referrals"],
    queryFn: () => tenantApi.getReferralOverview(),
  });

  async function copyLink() {
    if (!q.data) return;
    await navigator.clipboard.writeText(q.data.shareUrl);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 2000);
  }

  function shareOnWhatsApp() {
    if (!q.data) return;
    const text = `Sign up for Property360 with my link and your first month is free: ${q.data.shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  return (
    <>
      <TenantTopbar
        title="Refer & Earn"
        subtitle="Invite your landlord or caretaker and earn from their first subscription"
      />
      <PageContainer>
        {q.isLoading ? (
          <Card className="p-5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-3 h-10 w-full" />
          </Card>
        ) : q.isError ? (
          <ErrorBox message="Couldn't load your referrals" onRetry={() => q.refetch()} />
        ) : (
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <div className="flex items-start gap-3 bg-foundation-700 p-5 text-paper">
                <Gift className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-display text-[18px] font-bold">
                    Earn {q.data!.ratePercent}% of their first subscription
                  </p>
                  <p className="mt-1 text-[12.5px] opacity-80">
                    When your landlord or caretaker joins with your link and pays, the reward
                    lands in your wallet. They get their first month free.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 p-5">
                <code className="min-w-0 flex-1 truncate rounded-xl bg-canvas px-3 py-2 text-[12.5px] text-foundation-700">
                  {q.data!.shareUrl}
                </code>
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 hover:bg-foundation-700/5"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={shareOnWhatsApp}
                  className="rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 hover:bg-foundation-700/5"
                >
                  Share my link on WhatsApp
                </button>
              </div>
              <p className="px-5 pb-5 text-[12px] text-ink-muted">
                Your code: <span className="font-mono font-semibold">{q.data!.referralCode}</span>
              </p>
            </Card>

            <InviteForm />

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Invited", q.data!.totals.invited],
                ["Joined", q.data!.totals.joined],
                ["Paid", q.data!.totals.paid],
                ["Earned", formatNgn(q.data!.totals.earned)],
              ].map(([label, value]) => (
                <Card key={String(label)} className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                    {label}
                  </p>
                  <p className="mt-2 font-amount text-[20px] font-bold text-foundation-700">{value}</p>
                </Card>
              ))}
            </div>

            <Link
              href="/me/wallet"
              className="inline-flex items-center gap-2 text-[13px] font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4"
            >
              <Wallet className="h-4 w-4" /> Go to wallet to withdraw
            </Link>

            <div>
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Your invites
              </h2>
              {q.data!.invites.length === 0 ? (
                <EmptyState title="No invites yet" body="Invite your landlord or caretaker above." />
              ) : (
                <Card className="divide-y divide-foundation-700/10">
                  {q.data!.invites.map((i) => (
                    <div key={i.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-medium text-foundation-700">
                          {i.name || i.phone || "Shared in WhatsApp"}
                          <span className="ml-2 text-[11.5px] font-normal text-ink-muted">
                            {i.relationship === "caretaker" ? "Caretaker" : "Landlord"}
                          </span>
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-ink-muted">{formatDate(i.createdAt)}</p>
                      </div>
                      {statusPill(i)}
                    </div>
                  ))}
                </Card>
              )}
            </div>
          </div>
        )}
      </PageContainer>
    </>
  );
}
```

- [ ] **Step 2: Add the nav item**

In `src/components/me/Sidebar.tsx`, in the `"Overview"` section items, add after `{ href: "/me/notifications", label: "Notifications" },`:

```ts
      { href: "/me/refer", label: "Refer & Earn" },
```

- [ ] **Step 3: Typecheck and commit**

Run: `npx tsc --noEmit` (expect exit 0). If `StatusPill`'s `tone` doesn't accept `"info"`, use `"neutral"`. Then:

```bash
git add src/app/me/refer/page.tsx src/components/me/Sidebar.tsx
git commit -m "feat(me): add Refer & Earn page"
```

---

### Task 4: Referral-earnings wallet page

**Files:**
- Modify: `web/src/app/me/wallet/page.tsx`

- [ ] **Step 1: Swap imports**

Replace:

```tsx
import { useQuery } from "@tanstack/react-query";
import { TenantTopbar } from "@/components/me/Topbar";
import { tenantApi } from "@/lib/tenant-api";
import { WalletFundCard } from "@/components/app/WalletFundCard";
```

with:

```tsx
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownToLine, Landmark } from "lucide-react";
import { TenantTopbar } from "@/components/me/Topbar";
import { tenantApi } from "@/lib/tenant-api";
```

- [ ] **Step 2: Drop DVA polling**

Replace the `wallet` query with:

```tsx
  const wallet = useQuery({
    queryKey: ["wallet"],
    queryFn: () => tenantApi.getWallet(),
  });
```

- [ ] **Step 3: New top bar with actions**

Replace the `<TenantTopbar ... />` element with:

```tsx
      <TenantTopbar
        title="Wallet"
        subtitle="Your referral earnings. Withdraw to your bank anytime (minimum ₦1,000)."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/me/wallet/bank-accounts"
              className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
            >
              <Landmark className="h-4 w-4" /> Bank accounts
            </Link>
            <Link
              href="/me/wallet/withdraw"
              className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800"
            >
              <ArrowDownToLine className="h-4 w-4" /> Withdraw
            </Link>
          </div>
        }
      />
```

- [ ] **Step 4: Replace the funding card with a referral pointer**

Replace:

```tsx
            <div className="mt-4">
              <WalletFundCard wallet={wallet.data} />
            </div>
```

with:

```tsx
            <p className="mt-4 text-[13px] text-ink-muted">
              Earn more by inviting your landlord or caretaker.{" "}
              <Link
                href="/me/refer"
                className="font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4"
              >
                Refer & Earn
              </Link>
            </p>
```

- [ ] **Step 5: Better empty state**

Replace `No transactions yet.` with `No earnings yet. Invite your landlord or caretaker to start earning.`

- [ ] **Step 6: Typecheck and commit**

Run: `npx tsc --noEmit` (expect exit 0), then:

```bash
git add src/app/me/wallet/page.tsx
git commit -m "feat(me): make tenant wallet a referral-earnings wallet"
```

---

### Task 5: Tenant withdraw page

**Files:**
- Create: `web/src/app/me/wallet/withdraw/page.tsx` (from `src/app/app/wallet/withdraw/page.tsx`)

- [ ] **Step 1: Copy and swap to tenant APIs and routes**

```bash
mkdir -p src/app/me/wallet/withdraw
sed -e 's#landlordApi\.wallet()#tenantApi.getWallet()#g' \
    -e 's#landlordApi#tenantApi#g' \
    -e 's#@/lib/landlord-api#@/lib/tenant-api#g' \
    -e 's#AppTopbar#TenantTopbar#g' \
    -e 's#@/components/app/Topbar#@/components/me/Topbar#g' \
    -e 's#"/app/wallet#"/me/wallet#g' \
    -e 's#export default function WithdrawPage#export default function TenantWithdrawPage#' \
    src/app/app/wallet/withdraw/page.tsx > src/app/me/wallet/withdraw/page.tsx
```

- [ ] **Step 2: Enforce the ₦1,000 minimum and explain the name rule**

In the new file, replace:

```tsx
  const canSubmit = amount > 0 && amount <= balance && !!effectiveAccountId;
```

with:

```tsx
  const MINIMUM = 1000;
  const canSubmit = amount >= MINIMUM && amount <= balance && !!effectiveAccountId;
```

Replace the `onSuccess: () => router.push("/me/wallet"),` line with:

```tsx
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["walletTransactions"] });
      router.push("/me/wallet");
    },
```

and add `const qc = useQueryClient();` under `const router = useRouter();`, changing the react-query import to `import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";`.

Directly after the `{amount > balance && ( ... )}` block add:

```tsx
            {amount > 0 && amount < MINIMUM && (
              <p className="text-[12.5px] text-red-700">Minimum withdrawal is ₦1,000.</p>
            )}
            <p className="text-[12px] text-ink-muted">
              The account must be in your own name, matching your profile.
            </p>
```

- [ ] **Step 3: Verify no landlord leftovers**

Run: `grep -n "landlord\|/app/" src/app/me/wallet/withdraw/page.tsx`
Expected: no output.

- [ ] **Step 4: Typecheck and commit**

Run: `npx tsc --noEmit` (expect exit 0), then:

```bash
git add src/app/me/wallet/withdraw/page.tsx
git commit -m "feat(me): add tenant withdraw page"
```

---

### Task 6: Tenant bank accounts page

**Files:**
- Create: `web/src/app/me/wallet/bank-accounts/page.tsx` (from `src/app/app/wallet/bank-accounts/page.tsx`)

- [ ] **Step 1: Copy and swap**

```bash
mkdir -p src/app/me/wallet/bank-accounts
sed -e 's#landlordApi#tenantApi#g' \
    -e 's#@/lib/landlord-api#@/lib/tenant-api#g' \
    -e 's#AppTopbar#TenantTopbar#g' \
    -e 's#@/components/app/Topbar#@/components/me/Topbar#g' \
    -e 's#"/app/wallet#"/me/wallet#g' \
    -e 's#export default function BankAccountsPage#export default function TenantBankAccountsPage#' \
    src/app/app/wallet/bank-accounts/page.tsx > src/app/me/wallet/bank-accounts/page.tsx
```

- [ ] **Step 2: Tenant-specific subtitle**

In the new file, change the top bar subtitle `"Where your wallet withdrawals will land"` to:

```tsx
"Where your referral earnings are paid. Withdrawals need an account in your own name."
```

- [ ] **Step 3: Verify**

Run: `grep -n "landlord\|/app/" src/app/me/wallet/bank-accounts/page.tsx`
Expected: no output. `tenantApi` now has every method this page calls (`listBankAccounts`, `listBanks`, `setPrimaryBankAccount`, `deleteBankAccount`, `verifyBank`, `addBankAccount`).

Run: `npx tsc --noEmit`
Expected: exit 0. If `addBankAccount`'s argument type differs between the two APIs, match the call to `tenantApi.addBankAccount`'s signature (`{ accountNumber, bankCode, bankName, accountName }`).

- [ ] **Step 4: Commit**

```bash
git add src/app/me/wallet/bank-accounts/page.tsx
git commit -m "feat(me): add tenant bank accounts page"
```

---

### Task 7: Admin Tenant referrals list

**Files:**
- Modify: `web/src/lib/admin.ts` (type near `AdminPayoutRow`, method after `listPayouts` ~line 437)
- Create: `web/src/app/admin/(app)/tenant-referrals/page.tsx`
- Modify: `web/src/components/admin/Sidebar.tsx:34-36`

- [ ] **Step 1: Admin API**

Add the type:

```ts
export interface AdminTenantReferralRow {
  _id: string;
  owner: { _id: string; firstName: string; lastName: string; email: string; phone?: string } | null;
  referee: { _id: string; firstName: string; lastName: string; email: string; role: string } | null;
  basisAmount: number;
  rate: number;
  commissionAmount: number;
  status: "accrued" | "paid_out" | "reversed";
  needsReview?: boolean;
  createdAt: string;
}
```

and the method after `listPayouts`:

```ts
  async listTenantReferrals(params: { page?: number }): Promise<Paginated<AdminTenantReferralRow>> {
    const res = await api.get<ApiEnvelope<Paginated<AdminTenantReferralRow>>>("/admin/tenant-referrals", { params });
    return unwrap(res.data);
  },
```

- [ ] **Step 2: Page**

`src/app/admin/(app)/tenant-referrals/page.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Topbar } from "@/components/admin/Topbar";
import { DataTable, StatusBadge } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Pagination } from "@/components/admin/ui/Pagination";
import adminApi from "@/lib/admin";
import { formatDate, formatNgn } from "@/lib/format";

export default function AdminTenantReferralsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "tenant-referrals", { page }],
    queryFn: () => adminApi.listTenantReferrals({ page }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <Topbar />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <PageHeader
            title="Tenant referrals"
            description="Rewards paid to tenants whose landlord or caretaker joined and paid. Rows needing review were refunded after the tenant withdrew."
          />
          <DataTable
            loading={isLoading}
            rows={data?.items ?? []}
            empty="No tenant referral rewards yet"
            columns={[
              { key: "createdAt", header: "Date", render: (r) => formatDate(r.createdAt) },
              {
                key: "owner",
                header: "Tenant",
                render: (r) => (r.owner ? `${r.owner.firstName} ${r.owner.lastName}` : "Deleted user"),
              },
              {
                key: "referee",
                header: "Joined",
                render: (r) =>
                  r.referee ? `${r.referee.firstName} ${r.referee.lastName} (${r.referee.role})` : "Deleted user",
              },
              { key: "basisAmount", header: "Paid", render: (r) => formatNgn(r.basisAmount) },
              { key: "commissionAmount", header: "Reward", render: (r) => formatNgn(r.commissionAmount) },
              {
                key: "status",
                header: "Status",
                render: (r) => (r.needsReview ? <StatusBadge value="failed" /> : <StatusBadge value={r.status === "accrued" ? "paid" : r.status} />),
              },
            ]}
          />
          <Pagination page={page} total={data?.total ?? 0} limit={data?.limit ?? 50} onChange={setPage} />
        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 3: Nav item**

In `src/components/admin/Sidebar.tsx`, change the Growth section items to:

```ts
    items: [
      { href: "/admin/partners", label: "Partners" },
      { href: "/admin/tenant-referrals", label: "Tenant referrals" },
    ],
```

- [ ] **Step 4: Typecheck and commit**

Run: `npx tsc --noEmit` (expect exit 0), then:

```bash
git add src/lib/admin.ts "src/app/admin/(app)/tenant-referrals/page.tsx" src/components/admin/Sidebar.tsx
git commit -m "feat(admin): add tenant referrals list"
```

---

### Task 8: Verify and ship

- [ ] **Step 1: Static checks**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: all pass.

- [ ] **Step 2: Browser walkthrough** (backend on the tenant-referral branch, `NEXT_PUBLIC_API_URL` pointing at it, `npm run dev`)

As a tenant:
1. Sidebar shows **Refer & Earn**. The page shows the share link, code and zero totals.
2. Invite: Landlord, a name, a new number. WhatsApp opens with the prefilled message; the invite appears as "Invited".
3. Invite the same number again: the form shows "You have already invited this number."
4. Invite a number that already has an account: "This person is already on Property360."
5. **Wallet** shows the balance, no funding-account card, and Bank accounts / Withdraw buttons.
6. Bank accounts: add one (verify shows the account name, save works).
7. Withdraw ₦500: button disabled, minimum message shown. With a balance, withdraw to an account in another name: the backend error "doesn't match your profile name" is shown.

As admin: **Growth → Tenant referrals** loads (empty or with rows).

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin feat/tenant-referral-web
gh pr create --base main --title "feat(me): Refer & Earn, referral wallet and withdrawals; admin tenant referrals" --body "Implements docs/superpowers/specs/2026-09-23-tenant-referral-design.md (web). Requires the backend tenant-referral PR to be deployed first."
```
