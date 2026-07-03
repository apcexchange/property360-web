# User-Fundable Wallet — Web Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add the user-fundable-wallet UI to the Next.js dashboard: DVA fund-in on the landlord wallet page, a new tenant wallet page, and a "pay rent from wallet vs card" choice — against the already-built backend wallet API.

**Architecture:** Reuse the existing `src/lib/api.ts` axios client + `unwrap()` envelope and the role-split API modules. Mirror the proven `EscrowWallet` (shared-bill DVA escrow, `src/app/me/bills/[id]/page.tsx:371`) for the fund-in UX and the `src/app/me/payments/page.tsx` redirect flow for the card path. All fund/spend affordances gate on `dvaStatus` so the surface degrades to "coming soon" while the backend `WALLET_FUNDING_ENABLED` flag is off.

**Tech Stack:** Next.js 16 (App Router) / React 19 / Tailwind 4 / React Query 5 / axios. `"use client"` pages doing their own data fetching.

**Repo + layout:** `web/` is its own git repo (`property360-web.git`), on `feat/assistant-actions`, working tree clean. **Active layout is ROOT `src/`** (alias `@/*` → `./src/*`); do NOT use the `web/src/` prefix (that's only `feat/founding-50`). No test runner. Verify with `npx tsc --noEmit` and `npm run build`.

**Dependency on backend:** same as mobile — the wallet API (`/wallet` with DVA fields, `POST /wallet/pay-invoice`) is on the backend branch `feat/wallet-dva`, gated by `WALLET_FUNDING_ENABLED`. `GET /wallet` already exists and is backward-compatible (the landlord payout page keeps working). Provider-agnostic: the UI shows "an account to transfer into" regardless of Paystack-DVA vs a licensed custody partner.

---

## Client `dvaStatus` state model (shared with mobile)
- `active` + `dvaAccountNumber` → show fund-in account card (copyable).
- `pending` → "generating your funding account…" + poll `GET /wallet` every 12s.
- `failed` → error state, no retry (backend gap).
- absent → "Wallet funding is coming soon" (`WALLET_FUNDING_ENABLED=false`).

---

## File Structure

**Modify:**
- `src/lib/landlord-api.ts` — add DVA fields to `WalletSummary`.
- `src/lib/tenant-api.ts` — add `getWallet`, `getWalletTransactions`, `payInvoiceFromWallet` (+ types).
- `src/app/app/wallet/page.tsx` — render the fund card (landlord/agent).
- `src/app/me/payments/page.tsx` — add "pay from wallet vs card".
- `src/components/me/Sidebar.tsx` — add tenant "Wallet" nav item.

**Create:**
- `src/components/app/WalletFundCard.tsx` — reusable DVA fund-in card (used by both areas).
- `src/app/me/wallet/page.tsx` — tenant wallet page (balance + fund + ledger).

---

## Task 1: API layer — DVA fields + tenant wallet methods

**Files:** Modify `src/lib/landlord-api.ts`, `src/lib/tenant-api.ts`

- [ ] **Step 1: Add DVA fields to `WalletSummary`.** In `src/lib/landlord-api.ts` (type around line 318), add:

```ts
  dvaAccountNumber?: string;
  dvaBankName?: string;
  dvaProvider?: string;
  dvaStatus?: 'pending' | 'active' | 'failed';
  dvaFailureReason?: string;
```

- [ ] **Step 2: Add tenant wallet methods.** In `src/lib/tenant-api.ts`, add a `WalletSummary`/`WalletTransaction` type (or import the landlord one) and these methods to the `tenantApi` object, following the `unwrap(res.data)` convention:

```ts
  async getWallet(): Promise<WalletSummary> {
    const res = await api.get("/wallet");
    return unwrap(res.data) as WalletSummary;
  },
  async getWalletTransactions(): Promise<WalletTransaction[]> {
    const res = await api.get("/wallet/transactions");
    return asList<WalletTransaction>(unwrap(res.data));
  },
  async payInvoiceFromWallet(invoiceId: string): Promise<{
    transactionId: string; invoiceNumber: string; amount: number;
  }> {
    const res = await api.post("/wallet/pay-invoice", { invoiceId });
    return unwrap(res.data) as { transactionId: string; invoiceNumber: string; amount: number };
  },
```

(`asList` + `unwrap` already exist in this module. If `WalletSummary`/`WalletTransaction` aren't exported from `landlord-api.ts`, define minimal local copies with the fields used here: `balance`, plus the DVA fields, and for a transaction `_id`, `type`, `amount`, `description`, `createdAt`.)

- [ ] **Step 3: Typecheck + commit.**
```bash
npx tsc --noEmit
git add src/lib/landlord-api.ts src/lib/tenant-api.ts
git commit -m "feat(wallet): DVA fields + tenant wallet API methods"
```

---

## Task 2: Reusable DVA fund-in card

**Files:** Create `src/components/app/WalletFundCard.tsx`

Mirror the copy-to-clipboard + `dvaStatus` handling in `EscrowWallet` (`src/app/me/bills/[id]/page.tsx:437-459`). Reuse `Card` + `formatNgn` from `@/components/app/ui` and `useToast` from `@/components/ui/Toast`.

- [ ] **Step 1: Create the component:**

```tsx
"use client";
import { Card } from "@/components/app/ui";
import { useToast } from "@/components/ui/Toast";

type FundWallet = {
  dvaAccountNumber?: string;
  dvaBankName?: string;
  dvaStatus?: "pending" | "active" | "failed";
};

export function WalletFundCard({ wallet }: { wallet: FundWallet | undefined }) {
  const toast = useToast();
  const status = wallet?.dvaStatus;

  async function copy(v: string) {
    await navigator.clipboard.writeText(v);
    toast.success("Account number copied");
  }

  return (
    <Card>
      <h3 className="font-display text-lg text-foundation-700">Add money</h3>
      {!status && (
        <p className="mt-2 text-sm text-ink-muted">Wallet funding is coming soon.</p>
      )}
      {status === "pending" && (
        <p className="mt-2 text-sm text-ink-muted">
          We&apos;re setting up your funding account. This usually takes a moment.
        </p>
      )}
      {status === "failed" && (
        <p className="mt-2 text-sm text-red-600">
          We couldn&apos;t set up your funding account. Please contact support.
        </p>
      )}
      {status === "active" && wallet?.dvaAccountNumber && (
        <>
          <p className="mt-2 text-sm text-ink-muted">
            Transfer to this account from any bank. Your wallet is credited automatically.
          </p>
          <div className="mt-4 flex items-center justify-between rounded-xl border border-foundation-700/10 p-4">
            <div>
              <div className="text-xs text-ink-muted">{wallet.dvaBankName ?? "Bank"}</div>
              <div className="font-amount text-2xl font-bold tracking-wide text-foundation-700">
                {wallet.dvaAccountNumber}
              </div>
            </div>
            <button
              type="button"
              onClick={() => copy(wallet.dvaAccountNumber!)}
              className="rounded-lg border border-foundation-700/15 px-3 py-2 text-sm font-semibold text-foundation-700 hover:bg-paper"
            >
              Copy
            </button>
          </div>
        </>
      )}
    </Card>
  );
}
```

- [ ] **Step 2: Typecheck + commit.**
```bash
npx tsc --noEmit
git add src/components/app/WalletFundCard.tsx
git commit -m "feat(wallet): reusable DVA fund-in card (web)"
```

---

## Task 3: Render the fund card on the landlord wallet page

**Files:** Modify `src/app/app/wallet/page.tsx`

- [ ] **Step 1:** The page already `useQuery`s the landlord wallet (`landlordApi.wallet()`). Add DVA polling + render `<WalletFundCard>` under the balance block. Set `refetchInterval` so a pending DVA appears without a manual refresh:

```tsx
import { WalletFundCard } from "@/components/app/WalletFundCard";
// in the existing wallet useQuery options, add:
refetchInterval: (q) => (q.state.data?.dvaStatus === "pending" ? 12_000 : false),
// in the JSX, under the balance/stat cards:
<WalletFundCard wallet={walletData} />
```

- [ ] **Step 2:** Typecheck + `npm run build`; confirm the existing landlord withdraw/balance UI is unchanged and the fund card renders "coming soon" (flag off).
```bash
npx tsc --noEmit
git add src/app/app/wallet/page.tsx
git commit -m "feat(wallet): show DVA fund-in on landlord wallet page"
```

---

## Task 4: Tenant wallet page + nav

**Files:** Create `src/app/me/wallet/page.tsx`; Modify `src/components/me/Sidebar.tsx`

- [ ] **Step 1: Create the page.** `"use client"`, mirrors the structure of `src/app/app/wallet/page.tsx` (Skeleton/ErrorBox states) but tenant-scoped: balance hero + `<WalletFundCard>` + transactions list. No withdraw (tenants can't). Wrap in the `/me` layout (already provides QueryProvider + TenantAuthGate).

```tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { tenantApi } from "@/lib/tenant-api";
import { WalletFundCard } from "@/components/app/WalletFundCard";
import { Card, PageContainer, Skeleton, ErrorBox, formatNgn } from "@/components/app/ui";

export default function TenantWalletPage() {
  const wallet = useQuery({
    queryKey: ["wallet"],
    queryFn: () => tenantApi.getWallet(),
    refetchInterval: (q) => (q.state.data?.dvaStatus === "pending" ? 12_000 : false),
  });
  const txns = useQuery({
    queryKey: ["walletTransactions"],
    queryFn: () => tenantApi.getWalletTransactions(),
  });

  if (wallet.isLoading) return <PageContainer><Skeleton className="h-40" /></PageContainer>;
  if (wallet.isError)
    return <PageContainer><ErrorBox message="Couldn't load your wallet" onRetry={() => wallet.refetch()} /></PageContainer>;

  return (
    <PageContainer>
      <Card>
        <div className="text-xs text-ink-muted">WALLET BALANCE</div>
        <div className="font-amount text-4xl font-extrabold text-foundation-700">
          {formatNgn(wallet.data?.balance ?? 0)}
        </div>
      </Card>
      <div className="mt-4"><WalletFundCard wallet={wallet.data} /></div>
      <div className="mt-6">
        <h3 className="font-display text-lg text-foundation-700">Recent activity</h3>
        {(txns.data ?? []).map((t) => (
          <div key={t._id} className="flex items-center justify-between border-b border-foundation-700/5 py-3">
            <span className="text-sm text-foundation-700">{t.description}</span>
            <span className="font-amount text-sm">{formatNgn(t.amount)}</span>
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
```

- [ ] **Step 2: Add the nav item.** In `src/components/me/Sidebar.tsx`, in the "Payments" section array (~line 36-41), add `{ href: "/me/wallet", label: "Wallet" }`.

- [ ] **Step 3: Typecheck + build + commit.**
```bash
npx tsc --noEmit && npm run build
git add src/app/me/wallet/page.tsx src/components/me/Sidebar.tsx
git commit -m "feat(wallet): tenant wallet page + nav item"
```

---

## Task 5: "Pay from wallet vs card" at tenant checkout

**Files:** Modify `src/app/me/payments/page.tsx`

Today the pay buttons single-shot to Paystack (`initiate → window.location.href = authorizationUrl`). Add a wallet option.

- [ ] **Step 1:** Load the wallet on the payments page:
```tsx
const wallet = useQuery({ queryKey: ["wallet"], queryFn: () => tenantApi.getWallet() });
const payFromWallet = useMutation({
  mutationFn: (invoiceId: string) => tenantApi.payInvoiceFromWallet(invoiceId),
  onSuccess: () => { queryClient.invalidateQueries(); toast.success("Invoice paid from wallet"); },
  onError: (e) => toast.error(getApiErrorMessage(e) ?? "Wallet payment failed"),
});
```

- [ ] **Step 2:** At each pay action (`RentSection` pay, `FeesSection` "Pay all", `FeeRow` "Pay" — `payments/page.tsx:216-370`), when `wallet.data?.dvaStatus` is defined AND `wallet.data.balance >= outstanding`, render a small choice (two buttons or a dropdown): **Pay from wallet** → `payFromWallet.mutate(invoiceId)`; **Pay with card** → the existing redirect. When wallet funding is unavailable or balance is short, keep only the existing card button (no behavior change).

- [ ] **Step 3:** Typecheck + build; exercise both paths (wallet path needs backend flag on).
```bash
npx tsc --noEmit && npm run build
git add src/app/me/payments/page.tsx
git commit -m "feat(wallet): offer pay-from-wallet vs card on tenant payments"
```

---

## Task 6: Final verification

- [ ] **Step 1:** `npx tsc --noEmit` clean; `npm run build` succeeds.
- [ ] **Step 2:** Flag OFF: landlord + tenant wallet pages show "coming soon"; existing landlord payout page and tenant Paystack checkout unchanged.
- [ ] **Step 3:** Flag ON (against a wallet-dva backend): DVA account number appears (poll), a simulated transfer updates the balance on refetch, pay-from-wallet marks an invoice paid, insufficient balance falls back to card.
- [ ] **Step 4:** Do not merge to web `main` (auto-deploys to Vercel) until the backend is deployed with the flag on and the custody decision is made.

## Self-Review
- Spec §12 (web wallet page: balance, DVA fund-in details, transactions; method toggle at checkout) → Tasks 3-5. Provider-agnostic fund-in → Task 2. Coming-soon degradation → Task 2 state model, used everywhere. Landlord payout page + tenant card checkout untouched when funding is off.
- Types: `WalletFundCard`/`FundWallet`, `tenantApi.getWallet`/`payInvoiceFromWallet`, `WalletSummary` DVA fields consistent across Tasks 1-5. `formatNgn` sourced from `@/components/app/ui` (per the map, used across app + me).
