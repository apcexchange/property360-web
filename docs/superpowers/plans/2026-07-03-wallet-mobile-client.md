# User-Fundable Wallet — Mobile Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add the user-fundable-wallet UI to the React Native app: DVA fund-in on the wallet, a tenant wallet screen, and a "pay rent from wallet vs card" choice — all against the already-built backend wallet API.

**Architecture:** Extend the existing `services/wallet.ts` (unified per-user wallet now carries DVA fields). Mirror the proven `BillWalletScreen` (shared-bill DVA escrow) for the fund-in UX and the `TenantPaymentsScreen` `initiate → Linking → verify` pattern for the card path. Add a `wallet:updated` socket listener. Gate all fund/spend affordances on `dvaStatus` so the whole surface degrades to "coming soon" while the backend flag (`WALLET_FUNDING_ENABLED`) is off.

**Tech Stack:** Expo 54 / RN 0.81 / React Navigation 7 / Redux Toolkit / React Query 5 / axios / socket.io-client.

**Repo:** `mobile/` is its own git repo (`property360-mobile.git`), currently on `feat/assistant-actions`. No test runner. Verify with `npx tsc --noEmit` (run in `mobile/`) and by exercising screens. **Do not run `expo prebuild --clean`** (it wipes native config).

**Dependency on backend:** the wallet API (`/wallet` with DVA fields, `POST /wallet/pay-invoice`) ships on the backend branch `feat/wallet-dva` and is gated by `WALLET_FUNDING_ENABLED`. This plan is executable now, but end-to-end testing needs that backend deployed with the flag on. `GET /wallet` already exists and is backward-compatible, so nothing here breaks the current landlord wallet.

**Provider-agnostic note:** the UI shows "a bank account number to transfer into" (`dvaAccountNumber`/`dvaBankName`/`dvaStatus`). This is identical whether the backend custody is Paystack DVA or a licensed partner (Safe Haven/Anchor), so none of this changes if the custody provider changes.

---

## Client `dvaStatus` state model (used across screens)
- `dvaStatus === 'active'` and `dvaAccountNumber` present → show the fund-in account card.
- `dvaStatus === 'pending'` → "We're generating your funding account…" + keep polling `GET /wallet`.
- `dvaStatus === 'failed'` → error state ("Couldn't set up funding, contact support"), no retry button (retry is a backend gap; see backend spec §16).
- `dvaStatus` absent/undefined → funding not enabled yet → "Wallet funding is coming soon" (this is the `WALLET_FUNDING_ENABLED=false` case). Spend/withdraw stay available on the existing balance.

---

## File Structure

**Modify:**
- `src/services/wallet.ts` — add DVA fields to `Wallet`; add `payInvoiceFromWallet`.
- `src/services/chat.ts` — add `onWalletUpdated` to `SocketManager`.
- `src/screens/finance/WalletScreen.tsx` — add a "Fund wallet" section (landlord/agent).
- `src/screens/tenantApp/TenantPaymentsScreen.tsx` — add "Pay from wallet vs card" method choice.
- `src/navigation/TenantNavigator.tsx` + `src/navigation/RootNavigator.tsx` + `src/navigation/types.ts` — mount a tenant Wallet screen.
- `src/screens/tenantApp/TenantHomeScreen.tsx` — add a "Wallet" entry point.
- `package.json` — add `expo-clipboard`.

**Create:**
- `src/hooks/useWallet.ts` — wallet queries + `wallet:updated` invalidation + fund/pay mutations.
- `src/components/WalletFundCard.tsx` — reusable DVA fund-in card (account number + copy + status).
- `src/screens/tenantApp/TenantWalletScreen.tsx` — the tenant wallet (balance + fund + ledger).

---

## Task 1: Extend the wallet service (types + pay-invoice)

**Files:** Modify `src/services/wallet.ts`

- [ ] **Step 1: Add DVA fields to the `Wallet` type.** Find the `Wallet` interface (around line 17) and add the optional DVA fields the backend now returns:

```ts
  // Per-user DVA funding (present once the backend WALLET_FUNDING_ENABLED is on
  // and provisioning has run). Absent → funding not available yet.
  dvaAccountNumber?: string;
  dvaBankName?: string;
  dvaProvider?: string;
  dvaStatus?: 'pending' | 'active' | 'failed';
  dvaFailureReason?: string;
```

- [ ] **Step 2: Add `payInvoiceFromWallet` to `walletApi`.** In the `walletApi` object, add:

```ts
  /** Pay an invoice from the wallet balance. Backend: POST /wallet/pay-invoice */
  async payInvoiceFromWallet(invoiceId: string): Promise<{
    transactionId: string;
    invoiceNumber: string;
    amount: number;
  }> {
    const res = await api.post(WALLET_URLS.PAY_INVOICE, { invoiceId });
    return res.data.data;
  },
```

- [ ] **Step 3: Add the URL constant.** In `src/api/endpoints/urls.ts`, in `WALLET_URLS` (around line 101), add:

```ts
  PAY_INVOICE: '/wallet/pay-invoice',
```

- [ ] **Step 4: Typecheck.** Run: `npx tsc --noEmit` — expect no new errors.

- [ ] **Step 5: Commit.**
```bash
git add src/services/wallet.ts src/api/endpoints/urls.ts
git commit -m "feat(wallet): DVA fields + payInvoiceFromWallet in wallet service"
```

---

## Task 2: Wallet socket event + React Query hook

**Files:** Modify `src/services/chat.ts`; Create `src/hooks/useWallet.ts`

- [ ] **Step 1: Add the socket listener.** In `src/services/chat.ts`, in the `SocketManager` class, mirror `onBillWalletUpdated` (add near it):

```ts
  /** Server emits `wallet:updated` to `user:<id>` on balance/DVA changes. */
  onWalletUpdated(cb: (wallet: unknown) => void): () => void {
    this.socket?.on('wallet:updated', cb);
    return () => this.socket?.off('wallet:updated', cb);
  }
```

- [ ] **Step 2: Create the hook.** Create `src/hooks/useWallet.ts`:

```ts
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletApi } from '../services/wallet';
import { socketManager } from '../services/chat';
import { useToast } from '../context/ToastContext';

export const walletKeys = {
  wallet: ['wallet'] as const,
  stats: ['walletStats'] as const,
  transactions: ['walletTransactions'] as const,
};

/** The unified per-user wallet (balance + DVA funding details). */
export function useWallet() {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: walletKeys.wallet,
    queryFn: () => walletApi.getWallet(),
    // Poll while the DVA is still provisioning so the account number appears
    // as soon as it lands (mirrors the escrow BillWallet 12s refetch).
    refetchInterval: (q) =>
      (q.state.data as { dvaStatus?: string } | undefined)?.dvaStatus === 'pending'
        ? 12_000
        : false,
  });

  // Live updates: invalidate wallet queries when the server broadcasts.
  useEffect(() => {
    const unsub = socketManager.onWalletUpdated(() => {
      qc.invalidateQueries({ queryKey: walletKeys.wallet });
      qc.invalidateQueries({ queryKey: walletKeys.stats });
      qc.invalidateQueries({ queryKey: walletKeys.transactions });
    });
    return unsub;
  }, [qc]);

  return query;
}

/** Pay an invoice from wallet balance. */
export function usePayInvoiceFromWallet() {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (invoiceId: string) => walletApi.payInvoiceFromWallet(invoiceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: walletKeys.wallet });
      qc.invalidateQueries({ queryKey: walletKeys.transactions });
      toast.success('Invoice paid from wallet');
    },
    onError: (e: unknown) => {
      const msg =
        (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Wallet payment failed';
      toast.error(msg);
    },
  });
}
```

- [ ] **Step 3: Typecheck + commit.**
```bash
npx tsc --noEmit
git add src/services/chat.ts src/hooks/useWallet.ts
git commit -m "feat(wallet): wallet:updated socket listener + useWallet hook"
```

---

## Task 3: Add `expo-clipboard` + the reusable fund-in card

**Files:** Modify `package.json` (via installer); Create `src/components/WalletFundCard.tsx`

- [ ] **Step 1: Install expo-clipboard** (one-tap copy for the account number; the codebase currently lacks a clipboard util):

Run: `npx expo install expo-clipboard`
Note: this is an Expo native module — it requires a dev-client rebuild (`npx expo run:ios` / `run:android`), NOT `expo prebuild --clean`. Flag in the PR that CI/testers must rebuild.

- [ ] **Step 2: Create the fund-in card.** Create `src/components/WalletFundCard.tsx`. It renders the four `dvaStatus` states (see the state model at the top of this plan). Mirror the visual structure of `src/screens/building/BillWalletScreen.tsx`'s "Transfer to this account" block for styling (colors via `useTheme()`, `Card`, spacing).

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import type { Wallet } from '../services/wallet';

export function WalletFundCard({ wallet }: { wallet: Wallet | undefined }) {
  const { colors } = useTheme();
  const toast = useToast();
  const status = wallet?.dvaStatus;

  async function copy(value: string) {
    await Clipboard.setStringAsync(value);
    toast.success('Account number copied');
  }

  // Funding not enabled yet (backend flag off → no DVA ever provisioned).
  if (!status) {
    return (
      <Card>
        <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>Add money</Text>
        <Text style={{ color: colors.textMuted, marginTop: 6 }}>
          Wallet funding is coming soon.
        </Text>
      </Card>
    );
  }

  if (status === 'pending') {
    return (
      <Card>
        <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>Add money</Text>
        <Text style={{ color: colors.textMuted, marginTop: 6 }}>
          We're setting up your funding account. This usually takes a moment.
        </Text>
      </Card>
    );
  }

  if (status === 'failed') {
    return (
      <Card>
        <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>Add money</Text>
        <Text style={{ color: colors.error, marginTop: 6 }}>
          We couldn't set up your funding account. Please contact support.
        </Text>
      </Card>
    );
  }

  // active
  return (
    <Card>
      <Text style={{ color: colors.textPrimary, fontWeight: '600' }}>Add money</Text>
      <Text style={{ color: colors.textMuted, marginTop: 6 }}>
        Transfer to this account from any bank. Your wallet is credited automatically.
      </Text>
      <View style={[styles.row, { borderColor: colors.foundation500 + '22' }]}>
        <View>
          <Text style={{ color: colors.textMuted, fontSize: 12 }}>
            {wallet?.dvaBankName ?? 'Bank'}
          </Text>
          <Text
            selectable
            style={{ color: colors.textPrimary, fontSize: 22, fontWeight: '700', letterSpacing: 1 }}
          >
            {wallet?.dvaAccountNumber}
          </Text>
        </View>
        <TouchableOpacity onPress={() => copy(wallet!.dvaAccountNumber!)} hitSlop={12}>
          <Ionicons name="copy-outline" size={22} color={colors.accent} />
        </TouchableOpacity>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
```

- [ ] **Step 3: Typecheck + commit.**
```bash
npx tsc --noEmit
git add package.json package-lock.json src/components/WalletFundCard.tsx
git commit -m "feat(wallet): reusable DVA fund-in card + expo-clipboard"
```

---

## Task 4: Add the fund section to the landlord Wallet screen

**Files:** Modify `src/screens/finance/WalletScreen.tsx`

- [ ] **Step 1:** Switch the screen to consume `useWallet()` alongside the existing `walletStats` query so it live-updates and can render funding. Import `WalletFundCard` and `useWallet`. Render `<WalletFundCard wallet={wallet} />` directly under the balance hero (above the existing "Recent activity" list). Keep everything else (Withdraw/Bank accounts buttons, transaction list) unchanged.

```tsx
// near the other imports
import { useWallet } from '../../hooks/useWallet';
import { WalletFundCard } from '../../components/WalletFundCard';
// inside the component, alongside the existing walletStats query:
const { data: wallet } = useWallet();
// in the JSX, right after the balance/stat block and before "Recent activity":
<WalletFundCard wallet={wallet} />
```

- [ ] **Step 2:** Typecheck, run the landlord Wallet screen in the app, confirm it renders the "coming soon" fund card (backend flag off) without breaking the existing balance/withdraw UI.

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit.**
```bash
git add src/screens/finance/WalletScreen.tsx
git commit -m "feat(wallet): show DVA fund-in on landlord wallet screen"
```

---

## Task 5: Create the tenant Wallet screen

**Files:** Create `src/screens/tenantApp/TenantWalletScreen.tsx`; export it from `src/screens/tenantApp/index.ts`

- [ ] **Step 1: Build the screen.** It shows: a balance hero (mirror `WalletScreen.tsx` lines ~120-150 for the hero styling), the `<WalletFundCard>`, and a recent-transactions list (reuse `walletApi.getWalletTransactions()` + the `TransactionItem` component). No withdraw button (tenants can't withdraw). Use `useWallet()` for the balance + live updates.

```tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { walletApi } from '../../services/wallet';
import { useWallet, walletKeys } from '../../hooks/useWallet';
import { WalletFundCard } from '../../components/WalletFundCard';
import { TransactionItem } from '../../components';
import { SectionHeader, DotsLoader } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { formatCurrencyFull } from '../../utils/currencyFormatter';

export function TenantWalletScreen() {
  const { colors } = useTheme();
  const { data: wallet, isLoading } = useWallet();
  const txns = useQuery({
    queryKey: walletKeys.transactions,
    queryFn: () => walletApi.getWalletTransactions({ page: 1, limit: 20 }),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.screenBackground }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>WALLET BALANCE</Text>
        {isLoading ? (
          <DotsLoader />
        ) : (
          <Text style={{ color: colors.textPrimary, fontSize: 34, fontWeight: '800' }}>
            {formatCurrencyFull(wallet?.balance ?? 0)}
          </Text>
        )}

        <View style={{ height: 16 }} />
        <WalletFundCard wallet={wallet} />

        <View style={{ height: 20 }} />
        <SectionHeader title="Recent activity" />
        {(txns.data?.transactions ?? []).map((t) => (
          <TransactionItem key={t._id} transaction={t as never} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
```

> If `TransactionItem`'s prop shape doesn't match `WalletTransaction`, render a simple row inline (description + `formatCurrencyFull(amount)` + a +/- sign from `type`) mirroring `WalletScreen.tsx` lines ~207-248 instead.

- [ ] **Step 2:** Add `export { TenantWalletScreen } from './TenantWalletScreen';` to `src/screens/tenantApp/index.ts`.

- [ ] **Step 3: Typecheck + commit.**
```bash
npx tsc --noEmit
git add src/screens/tenantApp/TenantWalletScreen.tsx src/screens/tenantApp/index.ts
git commit -m "feat(wallet): tenant wallet screen (balance + fund + ledger)"
```

---

## Task 6: Mount the tenant Wallet screen in navigation

**Files:** Modify `src/navigation/types.ts`, `src/navigation/RootNavigator.tsx`, `src/screens/tenantApp/TenantHomeScreen.tsx`

- [ ] **Step 1: Add the route to the param list.** In `src/navigation/types.ts`, add `TenantWallet: undefined;` to `RootStackParamList` (near the other tenant root screens, ~line 404-504).

- [ ] **Step 2: Register the screen.** In `src/navigation/RootNavigator.tsx`, in the **tenant branch** (the block around lines 145-180 that already mounts `BillWallet`, `BankAccounts`, etc.), add:

```tsx
<Stack.Screen name="TenantWallet" component={TenantWalletScreen} />
```
(Import `TenantWalletScreen` from `../screens/tenantApp` at the top.)

- [ ] **Step 3: Add an entry point.** In `src/screens/tenantApp/TenantHomeScreen.tsx`, add a "Wallet" quick-action/card that does `navigation.navigate('TenantWallet')` (mirror an existing quick action on that screen).

- [ ] **Step 4: Typecheck, run the tenant app, confirm Wallet opens from Home.**
```bash
npx tsc --noEmit
git add src/navigation/types.ts src/navigation/RootNavigator.tsx src/screens/tenantApp/TenantHomeScreen.tsx
git commit -m "feat(wallet): mount tenant wallet screen + home entry point"
```

---

## Task 7: "Pay from wallet vs card" on the tenant payments screen

**Files:** Modify `src/screens/tenantApp/TenantPaymentsScreen.tsx`

Today each pay action single-shots to Paystack via `initiateOnlinePayment(...) → Linking.openURL(authorizationUrl)`. Add a method choice: **Wallet** (calls `payInvoiceFromWallet`, stays in-app) or **Card/Bank** (existing browser redirect).

- [ ] **Step 1:** Import the wallet hook + balance:
```tsx
import { useWallet, usePayInvoiceFromWallet } from '../../hooks/useWallet';
// in the component:
const { data: wallet } = useWallet();
const payFromWallet = usePayInvoiceFromWallet();
```

- [ ] **Step 2:** When the user taps "Pay" on an invoice, present an ActionSheet / `BottomSheet` (the app has `useBottomSheet`) with two options, but only offer "Pay from wallet" when `wallet?.balance >= amountDue` AND `wallet?.dvaStatus` is defined (funding live). Wire:
  - **Wallet** → `payFromWallet.mutate(invoiceId)` (no browser; the mutation's `onSuccess` refetches balances + toasts). After success, refetch the tenant payments/invoice list so the invoice shows paid.
  - **Card/Bank** → the existing `initiateOnlinePayment(...) → Linking.openURL(...)` path, unchanged.

  If `wallet` funding is not live or balance is insufficient, skip the sheet and go straight to the existing card flow (no behavior change).

- [ ] **Step 3:** Typecheck; exercise both branches in the app (wallet path needs the backend flag on; card path must be unchanged when wallet is unavailable).
```bash
npx tsc --noEmit
git add src/screens/tenantApp/TenantPaymentsScreen.tsx
git commit -m "feat(wallet): offer pay-from-wallet vs card at tenant checkout"
```

---

## Task 8: Final verification

- [ ] **Step 1:** `npx tsc --noEmit` clean.
- [ ] **Step 2:** Manual pass (backend flag OFF): landlord + tenant wallet screens show "funding coming soon", existing landlord withdraw/balance unaffected, tenant checkout still redirects to Paystack.
- [ ] **Step 3:** Manual pass (backend flag ON, against a wallet-dva backend): open wallet → DVA account number appears (poll), simulate a transfer credit → balance updates live via `wallet:updated`; pay an invoice from wallet → invoice marks paid in-app; insufficient balance falls back to card.
- [ ] **Step 4:** Do not merge to the mobile `main` / do not tag a release until the backend is deployed with the flag on and the custody decision is made.

## Self-Review
- Spec §12 (mobile: balance, copyable DVA fund-in, transaction list, pay-from-wallet toggle, landlord withdraw unchanged) → Tasks 3-7. Provider-agnostic fund-in → Task 3. Live balance → Task 2. Coming-soon degradation → Task 3 state model, used everywhere. Withdrawal stays on the existing landlord payout screens (untouched).
- Types: `walletKeys`, `useWallet`, `usePayInvoiceFromWallet`, `WalletFundCard` names consistent across Tasks 2-7. `Wallet` DVA fields (Task 1) consumed by `WalletFundCard` (Task 3).
