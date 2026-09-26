# Tenant Referral Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give tenants in the mobile app a Refer & Earn card and screen (invite landlord/caretaker over WhatsApp, code with copy, invite statuses, earnings) and a withdraw-only referral wallet using the existing bank-account and withdraw screens.

**Architecture:** A small service + React Query hook file for `/tenant-referrals`, a new `TenantReferScreen` with an `InviteLandlordSheet` bottom sheet (same pattern as `EditTenantIdentitySheet`), and registration of the existing landlord `Withdraw`, `PayoutHistory` and `PayoutDetail` screens in the tenant branch of the root stack. The backend writes the WhatsApp text and `wa.me` link; the app opens it with `Linking.openURL`.

**Tech Stack:** Expo 54, React Native 0.81, React Navigation 7 (native stack + bottom tabs), TanStack Query 5, axios, expo-clipboard.

**Repo:** `mobile/` (its own git repo, remote `apcexchange/property360-mobile`).

**Spec:** `docs/superpowers/specs/2026-09-23-tenant-referral-design.md`
**Depends on:** backend plan `docs/superpowers/plans/2026-09-23-tenant-referral-backend.md` deployed (tenant access to `/wallet`, `/payouts`, and the `/tenant-referrals` endpoints).

---

## Before you start

- Worktree off `origin/main` (the local `mobile/` checkout is on an old branch), branch `feat/tenant-referral`. Symlink `node_modules` from `mobile/`.
- **No tests exist in mobile.** Verification is typecheck plus a device/simulator walkthrough (Task 8). `main` already has pre-existing tsc errors (30 at the time of writing, in property-creation screens, `PendingPaymentsScreen`, `responseInterceptor`, `ThemeContext` and a few others). **Record the baseline first** and require "no new errors":

  ```bash
  node_modules/.bin/tsc --noEmit -p . 2>&1 | grep -c "error TS" > /tmp/tsc-baseline.txt; cat /tmp/tsc-baseline.txt
  ```

  After each task: `node_modules/.bin/tsc --noEmit -p . 2>&1 | grep -c "error TS"` must print the same number, and `node_modules/.bin/tsc --noEmit -p . 2>&1 | grep "error TS" | grep -E "tenantReferral|TenantRefer|InviteLandlord|TenantWallet|TenantHome|RootNavigator|navigation/types|WithdrawScreen"` must print nothing.
- **Decision (option A):** the tenant wallet holds only referral earnings and is withdraw-only. Remove the funding-account card (`WalletFundCard`, DVA) from `TenantWalletScreen`: its backend (`feat/wallet-dva`) was never merged. `TenantPaymentsScreen`'s "pay from wallet" is already hidden unless `wallet.dvaStatus` is set, which never happens on this backend, so leave it alone.
- UI conventions: `const { colors } = useTheme()` from `../../context/ThemeContext`; `spacing, fontSize, fontFamily, borderRadius` from `../../constants/theme`; `useToast()` from `../../context/ToastContext` (`toast.success(msg)` / `toast.error(msg)`); `ListRow, SectionHeader, Divider, DotsLoader` from `../../components/ui`; `Button` from `../../components`; currency `formatCurrencyFull` from `../../utils/currencyFormatter`.

## File map

| File | Status | Responsibility |
|---|---|---|
| `src/api/endpoints/urls.ts` | modify | `TENANT_REFERRAL_URLS` |
| `src/services/tenantReferral.ts` | create | API calls + types |
| `src/hooks/useTenantReferral.ts` | create | query + mutation hooks |
| `src/components/InviteLandlordSheet.tsx` | create | invite form bottom sheet |
| `src/screens/tenantApp/TenantReferScreen.tsx` | create | Refer & Earn screen |
| `src/screens/tenantApp/index.ts` | modify | export screen |
| `src/navigation/types.ts` | modify | new root routes |
| `src/navigation/RootNavigator.tsx` | modify | register screens in tenant branch |
| `src/screens/tenantApp/TenantHomeScreen.tsx` | modify | Refer & Earn row |
| `src/screens/tenantApp/TenantWalletScreen.tsx` | modify | referral wallet + withdraw actions |
| `src/screens/finance/WithdrawScreen.tsx` | modify | show backend error text |

---

### Task 1: URLs, service, hooks

**Files:**
- Modify: `mobile/src/api/endpoints/urls.ts` (after `PAYOUT_URLS`, ~line 124)
- Create: `mobile/src/services/tenantReferral.ts`
- Create: `mobile/src/hooks/useTenantReferral.ts`

- [ ] **Step 1: URLs**

After the `PAYOUT_URLS` block add:

```ts
export const TENANT_REFERRAL_URLS = {
  OVERVIEW: '/tenant-referrals',
  INVITES: '/tenant-referrals/invites',
} as const;
```

- [ ] **Step 2: Service**

`src/services/tenantReferral.ts`:

```ts
import { api } from './api';
import { TENANT_REFERRAL_URLS } from '../api/endpoints/urls';

export type TenantInviteStatus = 'sent' | 'joined' | 'paid';
export type TenantInviteRelationship = 'landlord' | 'caretaker';

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

export interface CreateTenantInviteInput {
  relationship: TenantInviteRelationship;
  name?: string;
  phone?: string;
}

export interface CreateTenantInviteResult {
  invite: TenantInvite;
  whatsappText: string;
  whatsappUrl: string;
}

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const tenantReferralApi = {
  /** Tenant's Refer & Earn overview: code, link, invites, totals. */
  async getOverview(): Promise<TenantReferralOverview> {
    const res = await api.get<Envelope<TenantReferralOverview>>(TENANT_REFERRAL_URLS.OVERVIEW);
    return res.data.data;
  },

  /** Saves the invite (limits apply) and returns the prefilled WhatsApp link. */
  async createInvite(input: CreateTenantInviteInput): Promise<CreateTenantInviteResult> {
    const res = await api.post<Envelope<CreateTenantInviteResult>>(TENANT_REFERRAL_URLS.INVITES, input);
    return res.data.data;
  },
};

export default tenantReferralApi;
```

- [ ] **Step 3: Hooks**

`src/hooks/useTenantReferral.ts`:

```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tenantReferralApi, CreateTenantInviteInput } from '../services/tenantReferral';

export const tenantReferralKeys = {
  overview: ['tenantReferral', 'overview'] as const,
};

export function useTenantReferralOverview() {
  return useQuery({
    queryKey: tenantReferralKeys.overview,
    queryFn: () => tenantReferralApi.getOverview(),
  });
}

export function useCreateTenantInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTenantInviteInput) => tenantReferralApi.createInvite(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tenantReferralKeys.overview });
    },
  });
}
```

- [ ] **Step 4: Typecheck (no new errors) and commit**

```bash
git add src/api/endpoints/urls.ts src/services/tenantReferral.ts src/hooks/useTenantReferral.ts
git commit -m "feat(tenant-referral): add service and hooks"
```

---

### Task 2: Invite sheet

**Files:**
- Create: `mobile/src/components/InviteLandlordSheet.tsx`

- [ ] **Step 1: Create the component**

```tsx
import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { spacing, fontSize, fontFamily, borderRadius } from '../constants/theme';
import { useCreateTenantInvite } from '../hooks/useTenantReferral';
import { TenantInviteRelationship } from '../services/tenantReferral';

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * "Invite my landlord/caretaker". Saves the invite first so the backend's
 * duplicate and daily limits apply, then opens WhatsApp with the message the
 * backend wrote. With no number, WhatsApp lets the tenant pick the contact.
 */
export function InviteLandlordSheet({ visible, onClose }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const createInvite = useCreateTenantInvite();
  const [relationship, setRelationship] = useState<TenantInviteRelationship>('landlord');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Reset every time the sheet opens, not just on first mount.
  useEffect(() => {
    if (visible) {
      setRelationship('landlord');
      setName('');
      setPhone('');
    }
  }, [visible]);

  const send = () => {
    createInvite.mutate(
      {
        relationship,
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
      },
      {
        onSuccess: async (res) => {
          onClose();
          try {
            await Linking.openURL(res.whatsappUrl);
          } catch {
            Alert.alert('Could not open WhatsApp', 'Your invite was saved. Please make sure WhatsApp is installed.');
          }
        },
        onError: (e: any) => {
          Alert.alert("Couldn't send invite", e?.response?.data?.message ?? 'Please try again.');
        },
      }
    );
  };

  const inputStyle = [
    styles.input,
    { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.inputBackground },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.sheet,
            { backgroundColor: colors.cardBackground, paddingBottom: insets.bottom + spacing.lg },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Invite my landlord or caretaker
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            We open WhatsApp with a message ready to send. Add their number and we'll also
            send them a reminder from Property360.
          </Text>

          <View style={styles.segmentRow}>
            {(['landlord', 'caretaker'] as const).map((r) => {
              const active = relationship === r;
              return (
                <TouchableOpacity
                  key={r}
                  onPress={() => setRelationship(r)}
                  style={[
                    styles.segment,
                    { borderColor: colors.border },
                    active && { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      { color: active ? '#FFFFFF' : colors.textPrimary },
                    ]}
                  >
                    {r === 'landlord' ? 'Landlord' : 'Caretaker'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            style={inputStyle}
            placeholder="Their name (optional)"
            placeholderTextColor={colors.textMuted}
            value={name}
            maxLength={80}
            onChangeText={setName}
          />
          <TextInput
            style={inputStyle}
            placeholder="WhatsApp number (optional)"
            placeholderTextColor={colors.textMuted}
            keyboardType="phone-pad"
            value={phone}
            maxLength={20}
            onChangeText={setPhone}
          />

          <TouchableOpacity
            onPress={send}
            disabled={createInvite.isPending}
            style={[styles.sendButton, createInvite.isPending && { opacity: 0.6 }]}
          >
            {createInvite.isPending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                <Text style={styles.sendText}>Send on WhatsApp</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: spacing.sm },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: fontSize.lg, fontFamily: fontFamily.semibold, flex: 1 },
  hint: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, lineHeight: 18 },
  segmentRow: { flexDirection: 'row', gap: spacing.sm },
  segment: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  segmentText: { fontSize: fontSize.sm, fontFamily: fontFamily.semibold },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.base,
    fontFamily: fontFamily.regular,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#25D366',
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  sendText: { color: '#FFFFFF', fontSize: fontSize.base, fontFamily: fontFamily.semibold },
});
```

- [ ] **Step 2: Typecheck (no new errors) and commit**

```bash
git add src/components/InviteLandlordSheet.tsx
git commit -m "feat(tenant-referral): add invite landlord/caretaker sheet"
```

---

### Task 3: Refer & Earn screen

**Files:**
- Create: `mobile/src/screens/tenantApp/TenantReferScreen.tsx`
- Modify: `mobile/src/screens/tenantApp/index.ts`

- [ ] **Step 1: Create the screen**

```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { Divider, SectionHeader, DotsLoader } from '../../components/ui';
import { InviteLandlordSheet } from '../../components/InviteLandlordSheet';
import { spacing, fontSize, fontFamily, borderRadius } from '../../constants/theme';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrencyFull } from '../../utils/currencyFormatter';
import { useTenantReferralOverview } from '../../hooks/useTenantReferral';
import { TenantInvite } from '../../services/tenantReferral';

export function TenantReferScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const toast = useToast();
  const navigation = useNavigation();
  const [inviteOpen, setInviteOpen] = useState(false);
  const { data, isLoading, isError, refetch, isRefetching } = useTenantReferralOverview();

  const copyLink = async () => {
    if (!data) return;
    await Clipboard.setStringAsync(data.shareUrl);
    toast.success('Link copied');
  };

  const statusLabel = (i: TenantInvite): { text: string; color: string } => {
    if (i.status === 'paid') {
      return { text: `You earned ${formatCurrencyFull(i.commissionAmount ?? 0)}`, color: colors.success };
    }
    if (i.status === 'joined') return { text: 'Joined', color: colors.accent };
    return { text: 'Invited', color: colors.textMuted };
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.screenBackground, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Refer & Earn</Text>
        <View style={{ width: 26 }} />
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <DotsLoader />
        </View>
      ) : isError || !data ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textMuted }}>Couldn't load your referrals.</Text>
          <TouchableOpacity onPress={() => refetch()} style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.accent, fontFamily: fontFamily.semibold }}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        >
          <View style={[styles.hero, { backgroundColor: colors.accent + '15' }]}>
            <Ionicons name="gift-outline" size={28} color={colors.accent} />
            <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
              Earn {data.ratePercent}% of their first subscription
            </Text>
            <Text style={[styles.heroText, { color: colors.textMuted }]}>
              When your landlord or caretaker joins with your link and pays, the reward lands in
              your wallet. They get their first month free.
            </Text>
            <TouchableOpacity style={styles.inviteButton} onPress={() => setInviteOpen(true)}>
              <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
              <Text style={styles.inviteText}>Invite my landlord or caretaker</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.linkRow, { borderColor: colors.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.linkLabel, { color: colors.textMuted }]}>Your code</Text>
              <Text style={[styles.code, { color: colors.textPrimary }]} selectable>
                {data.referralCode}
              </Text>
            </View>
            <TouchableOpacity onPress={copyLink} style={[styles.copyButton, { borderColor: colors.border }]}>
              <Ionicons name="copy-outline" size={16} color={colors.textPrimary} />
              <Text style={[styles.copyText, { color: colors.textPrimary }]}>Copy link</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsRow}>
            {[
              ['Invited', String(data.totals.invited)],
              ['Joined', String(data.totals.joined)],
              ['Earned', formatCurrencyFull(data.totals.earned)],
            ].map(([label, value]) => (
              <View key={label} style={styles.stat}>
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.walletLink}
            onPress={() => navigation.navigate('TenantWallet' as never)}
          >
            <Ionicons name="wallet-outline" size={18} color={colors.accent} />
            <Text style={[styles.walletLinkText, { color: colors.accent }]}>Go to wallet to withdraw</Text>
          </TouchableOpacity>

          <View style={{ marginTop: spacing.lg }}>
            <SectionHeader title="Your invites" />
            {data.invites.length === 0 ? (
              <Text style={[styles.empty, { color: colors.textMuted }]}>
                No invites yet. Tap the button above to invite your landlord or caretaker.
              </Text>
            ) : (
              data.invites.map((i, idx) => {
                const s = statusLabel(i);
                return (
                  <View key={i.id}>
                    <View style={styles.inviteRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.inviteName, { color: colors.textPrimary }]} numberOfLines={1}>
                          {i.name || i.phone || 'Shared in WhatsApp'}
                        </Text>
                        <Text style={[styles.inviteMeta, { color: colors.textMuted }]}>
                          {i.relationship === 'caretaker' ? 'Caretaker' : 'Landlord'} ·{' '}
                          {new Date(i.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                      <Text style={[styles.inviteStatus, { color: s.color }]}>{s.text}</Text>
                    </View>
                    {idx < data.invites.length - 1 && <Divider />}
                  </View>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

      <InviteLandlordSheet visible={inviteOpen} onClose={() => setInviteOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: { fontSize: fontSize.xl, fontFamily: fontFamily.semibold },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingBottom: 120 },
  hero: { borderRadius: borderRadius.xl, padding: spacing.lg, gap: spacing.sm },
  heroTitle: { fontSize: fontSize.lg, fontFamily: fontFamily.bold },
  heroText: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, lineHeight: 18 },
  inviteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: '#25D366',
    borderRadius: borderRadius.full,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  inviteText: { color: '#FFFFFF', fontSize: fontSize.base, fontFamily: fontFamily.semibold },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  linkLabel: { fontSize: fontSize.xs, fontFamily: fontFamily.medium, letterSpacing: 0.6 },
  code: { fontSize: fontSize.lg, fontFamily: fontFamily.bold, marginTop: 2 },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  copyText: { fontSize: fontSize.sm, fontFamily: fontFamily.semibold },
  statsRow: { flexDirection: 'row', marginTop: spacing.lg },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: fontSize.lg, fontFamily: fontFamily.bold },
  statLabel: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, marginTop: 2 },
  walletLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.lg },
  walletLinkText: { fontSize: fontSize.sm, fontFamily: fontFamily.semibold },
  empty: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, paddingVertical: spacing.lg },
  inviteRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.md },
  inviteName: { fontSize: fontSize.base, fontFamily: fontFamily.medium },
  inviteMeta: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, marginTop: 2 },
  inviteStatus: { fontSize: fontSize.sm, fontFamily: fontFamily.semibold },
});
```

- [ ] **Step 2: Export it**

In `src/screens/tenantApp/index.ts` add:

```ts
export { TenantReferScreen } from './TenantReferScreen';
```

- [ ] **Step 3: Typecheck (no new errors) and commit**

```bash
git add src/screens/tenantApp/TenantReferScreen.tsx src/screens/tenantApp/index.ts
git commit -m "feat(tenant-referral): add Refer & Earn screen"
```

---

### Task 4: Register routes for tenants

**Files:**
- Modify: `mobile/src/navigation/types.ts:500-506` (inside `RootStackParamList`)
- Modify: `mobile/src/navigation/RootNavigator.tsx:58`, `:72`, `:174-176`

- [ ] **Step 1: Route types**

In `RootStackParamList`, directly after `AddBankAccount: undefined;` (the tenant-reuse block ~line 505) add:

```ts
  // Tenant referral: Refer & Earn, plus the finance withdraw screens reused
  // so tenants can cash out referral earnings.
  TenantRefer: undefined;
  Withdraw: undefined;
  PayoutHistory: undefined;
  PayoutDetail: { payoutId: string };
```

- [ ] **Step 2: Imports**

In `RootNavigator.tsx` line 58, add `TenantReferScreen` to the `'../screens/tenantApp'` import:

```ts
import { NotificationsScreen, LeaseInvitationScreen, TenantRequestsScreen, CompleteProfileScreen, TenantWalletScreen, TenantReferScreen } from '../screens/tenantApp';
```

Line 72, extend the finance import:

```ts
import { BankAccountsScreen, AddBankAccountScreen, WithdrawScreen, PayoutHistoryScreen, PayoutDetailScreen } from '../screens/finance';
```

- [ ] **Step 3: Register in the tenant branch**

After `<Stack.Screen name="TenantWallet" component={TenantWalletScreen} />` (~line 176) add:

```tsx
        <Stack.Screen name="TenantRefer" component={TenantReferScreen} />
        <Stack.Screen name="Withdraw" component={WithdrawScreen} />
        <Stack.Screen name="PayoutHistory" component={PayoutHistoryScreen} />
        <Stack.Screen name="PayoutDetail" component={PayoutDetailScreen} />
```

These finance screens type their `navigation` prop against `FinanceStackParamList`; mounting them in the root stack is the same pattern already used for `BankAccounts` / `AddBankAccount`, and their internal `navigate('AddBankAccount')` / `navigate('PayoutDetail', …)` targets are all registered here.

- [ ] **Step 4: Typecheck (no new errors)**

If tsc reports a new error on these `Stack.Screen` lines (component prop type mismatch), cast the same way any existing reused screen is cast in this file; if none is cast, use `component={WithdrawScreen as any}` for the three finance screens only.

- [ ] **Step 5: Commit**

```bash
git add src/navigation/types.ts src/navigation/RootNavigator.tsx
git commit -m "feat(tenant-referral): register Refer & Earn and withdraw screens for tenants"
```

---

### Task 5: Home screen entry point

**Files:**
- Modify: `mobile/src/screens/tenantApp/TenantHomeScreen.tsx:281-282`

Visible to every tenant, with or without a lease, so it goes just above the `{leaseInfo ? (` conditional.

- [ ] **Step 1: Add the row**

Directly before the line `      {leaseInfo ? (` (~line 282) insert:

```tsx
      {/* Refer & Earn: tenants invite their landlord/caretaker for a reward */}
      <View style={styles.section}>
        <ListRow
          icon="gift-outline"
          title="Refer & Earn"
          subtitle="Invite your landlord or caretaker, earn 30% of their first subscription"
          onPress={() => navigation.navigate('TenantRefer' as any)}
          numberOfLinesSubtitle={2}
        />
      </View>
```

(`ListRow` and `styles.section` already exist in this file.)

- [ ] **Step 2: Typecheck (no new errors) and commit**

```bash
git add src/screens/tenantApp/TenantHomeScreen.tsx
git commit -m "feat(tenant-referral): add Refer & Earn row to tenant home"
```

---

### Task 6: Referral-earnings wallet screen

**Files:**
- Modify: `mobile/src/screens/tenantApp/TenantWalletScreen.tsx`

- [ ] **Step 1: Remove the funding card**

Delete the import `import { WalletFundCard } from '../../components/WalletFundCard';` and replace the block:

```tsx
        {/* Fund-in (DVA) */}
        <View style={styles.section}>
          <WalletFundCard wallet={wallet} />
        </View>
```

with:

```tsx
        {/* Referral earnings: withdraw-only wallet */}
        <Text style={[styles.walletHint, { color: colors.textMuted }]}>
          Your referral earnings. Withdraw to a bank account in your own name (minimum ₦1,000).
        </Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.primaryAction, { backgroundColor: colors.buttonPrimary }]}
            onPress={() => navigation.navigate('Withdraw' as never)}
          >
            <Ionicons name="arrow-up-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryActionText}>Withdraw</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryAction, { borderColor: colors.border }]}
            onPress={() => navigation.navigate('BankAccounts' as never)}
          >
            <Text style={[styles.secondaryActionText, { color: colors.textPrimary }]}>Bank accounts</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryAction, { borderColor: colors.border }]}
            onPress={() => navigation.navigate('PayoutHistory' as never)}
          >
            <Text style={[styles.secondaryActionText, { color: colors.textPrimary }]}>History</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('TenantRefer' as never)}>
          <Text style={[styles.referLink, { color: colors.accent }]}>
            Earn more: invite your landlord or caretaker
          </Text>
        </TouchableOpacity>
```

- [ ] **Step 2: Empty-state copy**

Replace `Your wallet activity will appear here.` with `Invite your landlord or caretaker to start earning.`

- [ ] **Step 3: Styles**

Add to the `StyleSheet.create({ ... })` object:

```ts
  walletHint: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    marginTop: spacing.lg,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  primaryAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 9999,
  },
  primaryActionText: { color: '#FFFFFF', fontSize: fontSize.sm, fontFamily: fontFamily.semibold },
  secondaryAction: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 9999,
    borderWidth: 1,
  },
  secondaryActionText: { fontSize: fontSize.sm, fontFamily: fontFamily.semibold },
  referLink: { fontSize: fontSize.sm, fontFamily: fontFamily.semibold, marginTop: spacing.md },
```

- [ ] **Step 4: Typecheck (no new errors) and commit**

```bash
git add src/screens/tenantApp/TenantWalletScreen.tsx
git commit -m "feat(tenant-referral): make tenant wallet a referral-earnings wallet"
```

---

### Task 7: Show backend errors on withdraw

**Files:**
- Modify: `mobile/src/screens/finance/WithdrawScreen.tsx:59-61`

The tenant name-match rejection ("This account name doesn't match your profile name.") comes back in the response body; the screen currently shows only `error.message`.

- [ ] **Step 1: Prefer the server message**

Replace:

```ts
    onError: (error: any) => {
      Alert.alert('Withdrawal failed', error.message || 'Failed to process withdrawal');
    },
```

with:

```ts
    onError: (error: any) => {
      Alert.alert(
        'Withdrawal failed',
        error?.response?.data?.message || error?.message || 'Failed to process withdrawal'
      );
    },
```

- [ ] **Step 2: Typecheck (no new errors) and commit**

```bash
git add src/screens/finance/WithdrawScreen.tsx
git commit -m "fix(withdraw): show the server's error message"
```

---

### Task 8: Verify and ship

- [ ] **Step 1: Typecheck against baseline**

```bash
node_modules/.bin/tsc --noEmit -p . 2>&1 | grep -c "error TS"; cat /tmp/tsc-baseline.txt
```

Expected: the two numbers are equal.

- [ ] **Step 2: Device walkthrough** (Expo dev build pointed at a backend running the tenant-referral branch)

As a tenant:
1. Home shows **Refer & Earn** (also for a tenant with no lease).
2. Refer & Earn shows the code; **Copy link** puts the link on the clipboard.
3. **Invite**: pick Caretaker, add a number, send. WhatsApp opens to that chat with the prefilled message. Back in the app, pull to refresh: the invite shows "Invited".
4. Invite the same number again: alert "You have already invited this number."
5. Invite with no number: WhatsApp opens the contact picker.
6. **Wallet**: no funding-account card; Withdraw, Bank accounts and History buttons work; Add bank account from Withdraw's empty state works.
7. Withdraw to an account in a different name: alert shows "This account name doesn't match your profile name."

As a landlord: the Finance tab's Withdraw screen still works as before.

- [ ] **Step 3: Push and open the PR**

```bash
git push -u origin feat/tenant-referral
gh pr create --base main --title "feat: tenant Refer & Earn and referral wallet withdrawals" --body "Implements docs/superpowers/specs/2026-09-23-tenant-referral-design.md (mobile). Requires the backend tenant-referral PR deployed. Ships to users with the next store build."
```

- [ ] **Step 4: Clean up**

Remove the worktree after the PR is merged (`git worktree remove <path>`).
