# Tenant Identity Edit Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a landlord/agent fix a tenant's name, email, or phone typo from `TenantDetailsScreen`, calling the new `PUT /tenants/lease/:leaseId/tenant-identity` backend endpoint (see `docs/superpowers/plans/2026-08-04-tenant-identity-edit-backend.md`, must ship first, or at least be reachable on whatever API URL the mobile dev client points at, before this is testable end-to-end).

**Architecture:** A new bottom-sheet component, `EditTenantIdentitySheet`, mirroring the existing `RequestTenantProfileSheet` component's modal shell and styling. A new `tenantIdentity.ts` service (mirroring the per-domain service file convention already used by `tenantProfileRequest.ts`, rather than bolting onto that KYC-scoped file) and a new `useTenantIdentity.ts` hook file. `TenantDetailsScreen` gets a new "Edit tenant details" `MenuRow` entry (same pattern already used for "Request profile info from tenant") that opens the sheet, plus a small local `displayTenant` state that shadows the `tenant` route param so the header (name, avatar initials, call/email links) reflects an edit immediately without navigating away and back.

**Tech Stack:** React Native (Expo 54) / TypeScript / TanStack React Query / React Navigation 7.

**Repo:** `mobile/` (own `.git`, remote `git@github.com:apcexchange/property360-mobile.git`), currently on branch `feat/wallet-ui`, clean working tree, exactly at `origin/main` (verified via `git -C mobile status` and `git -C mobile log origin/main..HEAD` — zero uncommitted changes, zero unpushed commits as of this plan's writing).

**Spec:** `docs/superpowers/specs/2026-08-04-tenant-identity-edit-design.md`

---

## Before you start

- **Work directly on the current branch (`feat/wallet-ui`), no worktree needed.** Unlike backend, this repo has no unrelated in-progress work sitting on its checked-out branch right now — it's clean and matches `origin/main`. If that's changed by the time you start (re-check with `git -C mobile status` and `git -C mobile log origin/main..HEAD`), fall back to an isolated worktree per `superpowers:using-git-worktrees` instead of touching a dirty branch.
- **No test runner exists in this repo either.** Verification is `npx tsc --noEmit` plus a manual walkthrough on a simulator/device if the Expo dev client is running. Per the mobile release pipeline (no OTA, every JS change ships via store re-submit), this code being merged does not make it live for real users until the next tagged release goes through TestFlight/Play review — that's expected, not a blocker for this plan.
- **Scoped shadowing, not a full refactor:** `tenant` arrives as a route param (a snapshot passed at navigation time from whichever screen linked here), it is not backed by a live query, so editing it doesn't automatically refresh this screen. This plan adds a `displayTenant` local-state shadow *only* for the visibly-editable identity fields (header name/avatar-initials, and the `tel:`/`mailto:` links), not for the ~10 other places in this file that read `tenant.firstName`/`tenant.email`/etc. purely to build navigation params or confirm-dialog text for other screens (e.g. `handleRenewLease`, `handleServeQuitNotice`). Those will show the pre-edit value until the user backs out and re-enters this screen (the same staleness that already exists for the KYC "profile" fields today) — acceptable, and rewriting all ~10 call sites is out of scope for what was asked.

---

### Task 1: Add the `IDENTITY` URL to `TENANT_URLS`

**Files:**
- Modify: `mobile/src/api/endpoints/urls.ts`

- [ ] **Step 1: Add the new endpoint constant**

Find:

```ts
export const TENANT_URLS = {
  LIST: '/tenants',
  BY_PROPERTY: (propertyId: string) => `/tenants/property/${propertyId}`,
  VACANT_UNITS: (propertyId: string) => `/tenants/property/${propertyId}/vacant-units`,
  SEARCH: '/tenants/search',
  ASSIGN: (unitId: string) => `/tenants/unit/${unitId}/assign`,
  REMOVE: (unitId: string) => `/tenants/unit/${unitId}`,
  OCCUPIED_UNITS: '/tenants/occupied-units',
  LEASE_RENEW: (leaseId: string) => `/tenants/lease/${leaseId}/renew`,
  GUARANTOR: (leaseId: string) => `/tenants/lease/${leaseId}/guarantor`,
  EMERGENCY_CONTACTS: (leaseId: string) => `/tenants/lease/${leaseId}/emergency-contacts`,
  EMERGENCY_CONTACT: (leaseId: string, index: number) =>
    `/tenants/lease/${leaseId}/emergency-contacts/${index}`,
  PAYMENT_REMINDER: (leaseId: string) => `/tenants/lease/${leaseId}/payment-reminder`,
  PAYMENTS: (leaseId: string) => `/tenants/lease/${leaseId}/payments`,
  PAYMENT: (leaseId: string, paymentId: string) =>
    `/tenants/lease/${leaseId}/payments/${paymentId}`,
  BALANCE: (leaseId: string) => `/tenants/lease/${leaseId}/balance`,
} as const;
```

Replace with:

```ts
export const TENANT_URLS = {
  LIST: '/tenants',
  BY_PROPERTY: (propertyId: string) => `/tenants/property/${propertyId}`,
  VACANT_UNITS: (propertyId: string) => `/tenants/property/${propertyId}/vacant-units`,
  SEARCH: '/tenants/search',
  ASSIGN: (unitId: string) => `/tenants/unit/${unitId}/assign`,
  REMOVE: (unitId: string) => `/tenants/unit/${unitId}`,
  OCCUPIED_UNITS: '/tenants/occupied-units',
  LEASE_RENEW: (leaseId: string) => `/tenants/lease/${leaseId}/renew`,
  GUARANTOR: (leaseId: string) => `/tenants/lease/${leaseId}/guarantor`,
  EMERGENCY_CONTACTS: (leaseId: string) => `/tenants/lease/${leaseId}/emergency-contacts`,
  EMERGENCY_CONTACT: (leaseId: string, index: number) =>
    `/tenants/lease/${leaseId}/emergency-contacts/${index}`,
  PAYMENT_REMINDER: (leaseId: string) => `/tenants/lease/${leaseId}/payment-reminder`,
  PAYMENTS: (leaseId: string) => `/tenants/lease/${leaseId}/payments`,
  PAYMENT: (leaseId: string, paymentId: string) =>
    `/tenants/lease/${leaseId}/payments/${paymentId}`,
  BALANCE: (leaseId: string) => `/tenants/lease/${leaseId}/balance`,
  IDENTITY: (leaseId: string) => `/tenants/lease/${leaseId}/tenant-identity`,
} as const;
```

- [ ] **Step 2: Type-check**

Run: `cd mobile && npx tsc --noEmit`
Expected: no output (clean pass).

- [ ] **Step 3: Commit**

```bash
git -C mobile add src/api/endpoints/urls.ts
git -C mobile commit -m "feat(tenants): add tenant-identity endpoint URL"
```

---

### Task 2: Add the `tenantIdentity` service

**Files:**
- Create: `mobile/src/services/tenantIdentity.ts`

- [ ] **Step 1: Write the service**

```ts
import { api } from './api';
import { TENANT_URLS } from '../api/endpoints/urls';

export interface TenantIdentityUpdateInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export interface TenantIdentityUpdateResult {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  whatsappVerified: boolean;
}

interface Envelope<T> {
  success: boolean;
  message?: string;
  data: T;
}

export const tenantIdentityApi = {
  /**
   * Landlord/agent — direct edit of the tenant's name/email/phone.
   * Distinct from tenantProfileRequestApi, which only covers KYC-adjacent
   * fields (DOB, NIN, address, ID doc). Any subset of the four fields is
   * fine, partial update.
   */
  async update(
    leaseId: string,
    input: TenantIdentityUpdateInput
  ): Promise<TenantIdentityUpdateResult> {
    const res = await api.put<Envelope<TenantIdentityUpdateResult>>(
      TENANT_URLS.IDENTITY(leaseId),
      input
    );
    return res.data.data;
  },
};

export default tenantIdentityApi;
```

- [ ] **Step 2: Type-check**

Run: `cd mobile && npx tsc --noEmit`
Expected: no output (clean pass).

- [ ] **Step 3: Commit**

```bash
git -C mobile add src/services/tenantIdentity.ts
git -C mobile commit -m "feat(tenants): add tenantIdentity service"
```

---

### Task 3: Add the `useUpdateTenantIdentity` hook

**Files:**
- Create: `mobile/src/hooks/useTenantIdentity.ts`

- [ ] **Step 1: Write the hook**

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  tenantIdentityApi,
  TenantIdentityUpdateInput,
} from '../services/tenantIdentity';
import { tenantProfileRequestKeys } from './useTenantProfileRequest';

export function useUpdateTenantIdentity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      leaseId,
      input,
    }: {
      leaseId: string;
      input: TenantIdentityUpdateInput;
    }) => tenantIdentityApi.update(leaseId, input),
    onSuccess: (_, vars) => {
      // The tenant-profile snapshot query also carries firstName/lastName/
      // email/phone, keep it in sync so any screen reading it (not just
      // this one) reflects the edit without a manual refresh.
      qc.invalidateQueries({
        queryKey: tenantProfileRequestKeys.snapshot(vars.leaseId),
      });
    },
  });
}
```

`tenantProfileRequestKeys` is already exported from `mobile/src/hooks/useTenantProfileRequest.ts` (`export const tenantProfileRequestKeys = {...}`), no changes needed there.

- [ ] **Step 2: Type-check**

Run: `cd mobile && npx tsc --noEmit`
Expected: no output (clean pass).

- [ ] **Step 3: Commit**

```bash
git -C mobile add src/hooks/useTenantIdentity.ts
git -C mobile commit -m "feat(tenants): add useUpdateTenantIdentity hook"
```

---

### Task 4: Create the `EditTenantIdentitySheet` component

**Files:**
- Create: `mobile/src/components/EditTenantIdentitySheet.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { spacing, fontSize, fontFamily, borderRadius } from '../constants/theme';
import { useUpdateTenantIdentity } from '../hooks/useTenantIdentity';
import { TenantIdentityUpdateResult } from '../services/tenantIdentity';

interface Props {
  visible: boolean;
  leaseId: string;
  initial: { firstName: string; lastName: string; email: string; phone: string };
  onClose: () => void;
  onSuccess?: (updated: TenantIdentityUpdateResult) => void;
}

export function EditTenantIdentitySheet({
  visible,
  leaseId,
  initial,
  onClose,
  onSuccess,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const { mutate: update, isPending } = useUpdateTenantIdentity();

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    /\S+@\S+\.\S+/.test(email.trim()) &&
    phone.trim().length > 0;

  function submit() {
    if (!canSubmit) return;
    update(
      {
        leaseId,
        input: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
        },
      },
      {
        onSuccess: (result) => {
          onSuccess?.(result);
          onClose();
        },
        onError: (e: any) => {
          Alert.alert(
            "Couldn't update tenant details",
            e?.response?.data?.message ?? 'Please try again.'
          );
        },
      }
    );
  }

  const styles = createStyles(colors);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Edit tenant details</Text>
              <Text style={styles.subtitle}>
                Changing the phone number resets WhatsApp verification, the
                tenant will need to re-verify.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>First name</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={styles.fieldLabel}>Last name</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={styles.fieldLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor={colors.textSecondary}
          />
          <Text style={styles.fieldLabel}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            placeholder="+234..."
            placeholderTextColor={colors.textSecondary}
          />

          <TouchableOpacity
            style={[styles.submit, (isPending || !canSubmit) && { opacity: 0.6 }]}
            onPress={submit}
            disabled={isPending || !canSubmit}
          >
            {isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Save changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: colors.screenBackground,
      borderTopLeftRadius: borderRadius.lg,
      borderTopRightRadius: borderRadius.lg,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: spacing.md,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      marginBottom: spacing.md,
    },
    title: {
      fontSize: fontSize.lg,
      fontFamily: fontFamily.bold,
      color: colors.heading,
    },
    subtitle: {
      marginTop: 4,
      fontSize: fontSize.sm,
      fontFamily: fontFamily.regular,
      color: colors.textSecondary,
    },
    fieldLabel: {
      marginTop: spacing.md,
      marginBottom: 6,
      fontSize: fontSize.xs,
      fontFamily: fontFamily.semibold,
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    input: {
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      fontFamily: fontFamily.regular,
      fontSize: fontSize.sm,
      color: colors.heading,
    },
    submit: {
      marginTop: spacing.lg,
      backgroundColor: colors.accent,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      alignItems: 'center',
    },
    submitText: {
      color: '#fff',
      fontSize: fontSize.md,
      fontFamily: fontFamily.semibold,
    },
  });
```

This mirrors `mobile/src/components/RequestTenantProfileSheet.tsx`'s modal shell (backdrop, sheet, handle, header with close button, styling tokens) exactly, trimmed to four plain text fields.

- [ ] **Step 2: Type-check**

Run: `cd mobile && npx tsc --noEmit`
Expected: no output (clean pass).

- [ ] **Step 3: Commit**

```bash
git -C mobile add src/components/EditTenantIdentitySheet.tsx
git -C mobile commit -m "feat(tenants): add EditTenantIdentitySheet component"
```

---

### Task 5: Wire it into `TenantDetailsScreen`

**Files:**
- Modify: `mobile/src/screens/main/TenantDetailsScreen.tsx`

- [ ] **Step 1: Import the new component**

Find:

```tsx
import { RequestTenantProfileSheet } from '../../components/RequestTenantProfileSheet';
```

Replace with:

```tsx
import { RequestTenantProfileSheet } from '../../components/RequestTenantProfileSheet';
import { EditTenantIdentitySheet } from '../../components/EditTenantIdentitySheet';
```

- [ ] **Step 2: Add `displayTenant` shadow state and the sheet-open flag**

Find:

```tsx
  const { data: tenantProfile } = useTenantProfileSnapshot(lease?.id);
  const { data: profileRequests = [] } = useTenantProfileRequests(lease?.id);
  const { mutate: cancelProfileRequest } = useCancelTenantProfileRequest();
  const [profileSheetOpen, setProfileSheetOpen] = React.useState(false);
```

Replace with:

```tsx
  const { data: tenantProfile } = useTenantProfileSnapshot(lease?.id);
  const { data: profileRequests = [] } = useTenantProfileRequests(lease?.id);
  const { mutate: cancelProfileRequest } = useCancelTenantProfileRequest();
  const [profileSheetOpen, setProfileSheetOpen] = React.useState(false);
  const [editIdentityOpen, setEditIdentityOpen] = React.useState(false);
  // tenant arrives as a route param (a snapshot from wherever this screen
  // was opened from), it isn't backed by a live query. Shadow it locally so
  // an identity edit reflects immediately in this screen's header without
  // navigating away and back.
  const [displayTenant, setDisplayTenant] = React.useState(tenant);
```

- [ ] **Step 3: Use `displayTenant` for initials and the call/email deep links**

Find:

```tsx
  const initials = `${tenant.firstName[0]}${tenant.lastName[0]}`.toUpperCase();

  const handleCall = () => Linking.openURL(`tel:${tenant.phone}`);
  const handleEmail = () => Linking.openURL(`mailto:${tenant.email}`);
```

Replace with:

```tsx
  const initials = `${displayTenant.firstName[0]}${displayTenant.lastName[0]}`.toUpperCase();

  const handleCall = () => Linking.openURL(`tel:${displayTenant.phone}`);
  const handleEmail = () => Linking.openURL(`mailto:${displayTenant.email}`);
```

- [ ] **Step 4: Use `displayTenant` in the profile hero header**

Find:

```tsx
          <Text style={[styles.tenantName, { color: colors.textPrimary }]}>
            {tenant.firstName} {tenant.lastName}
          </Text>
          <Text style={[styles.tenantContact, { color: colors.textMuted }]}>
            {tenant.email}
          </Text>
          <Text style={[styles.tenantContact, { color: colors.textMuted }]}>
            {tenant.phone}
          </Text>
```

Replace with:

```tsx
          <Text style={[styles.tenantName, { color: colors.textPrimary }]}>
            {displayTenant.firstName} {displayTenant.lastName}
          </Text>
          <Text style={[styles.tenantContact, { color: colors.textMuted }]}>
            {displayTenant.email}
          </Text>
          <Text style={[styles.tenantContact, { color: colors.textMuted }]}>
            {displayTenant.phone}
          </Text>
```

- [ ] **Step 5: Add the "Edit tenant details" menu row**

Find:

```tsx
              {pendingProfileRequest ? (
                <MenuRow
                  icon="close-outline"
                  label="Cancel profile request"
                  tint="warning"
                  onPress={() => cancelProfileRequest(pendingProfileRequest._id)}
                />
              ) : (
                <MenuRow
                  icon="person-add-outline"
                  label="Request profile info from tenant"
                  tint="accent"
                  onPress={() => setProfileSheetOpen(true)}
                />
              )}
            </View>
```

Replace with:

```tsx
              {pendingProfileRequest ? (
                <MenuRow
                  icon="close-outline"
                  label="Cancel profile request"
                  tint="warning"
                  onPress={() => cancelProfileRequest(pendingProfileRequest._id)}
                />
              ) : (
                <MenuRow
                  icon="person-add-outline"
                  label="Request profile info from tenant"
                  tint="accent"
                  onPress={() => setProfileSheetOpen(true)}
                />
              )}
              <MenuRow
                icon="create-outline"
                label="Edit tenant details"
                tint="accent"
                onPress={() => setEditIdentityOpen(true)}
              />
            </View>
```

- [ ] **Step 6: Render the sheet**

Find:

```tsx
      <BottomSheet {...sheetState} onClose={hideSheet} />
      {lease && (
        <RequestTenantProfileSheet
          visible={profileSheetOpen}
          leaseId={lease.id}
          filledFields={filledProfileFields}
          onClose={() => setProfileSheetOpen(false)}
        />
      )}
    </View>
  );
}
```

Replace with:

```tsx
      <BottomSheet {...sheetState} onClose={hideSheet} />
      {lease && (
        <RequestTenantProfileSheet
          visible={profileSheetOpen}
          leaseId={lease.id}
          filledFields={filledProfileFields}
          onClose={() => setProfileSheetOpen(false)}
        />
      )}
      {lease && (
        <EditTenantIdentitySheet
          visible={editIdentityOpen}
          leaseId={lease.id}
          initial={{
            firstName: displayTenant.firstName,
            lastName: displayTenant.lastName,
            email: displayTenant.email,
            phone: displayTenant.phone,
          }}
          onClose={() => setEditIdentityOpen(false)}
          onSuccess={(updated) =>
            setDisplayTenant((prev) => ({ ...prev, ...updated }))
          }
        />
      )}
    </View>
  );
}
```

- [ ] **Step 7: Type-check**

Run: `cd mobile && npx tsc --noEmit`
Expected: no output (clean pass). If you see a type error on `setDisplayTenant((prev) => ({ ...prev, ...updated }))` about excess/mismatched properties, check the `tenant` route-param type in `mobile/src/navigation/types.ts` — it likely has more fields than the four `TenantIdentityUpdateResult` carries (e.g. `id`, `avatar`), the spread pattern above should satisfy that as long as `tenant`'s type declares `firstName`/`lastName`/`email`/`phone` as plain `string`, which it does (used the same way as `initials` above already assumes non-optional strings).

- [ ] **Step 8: Commit**

```bash
git -C mobile add src/screens/main/TenantDetailsScreen.tsx
git -C mobile commit -m "feat(tenants): add edit action for tenant name/email/phone"
```

---

### Task 6: Manual verification (only if a dev client is running against a backend with the new route)

**Files:** none (verification only)

- [ ] **Step 1: Start Expo**

Run: `cd mobile && npm start`, open the app in a simulator or on a device via the dev client. If there's no backend reachable with the tenant-identity route yet, skip the rest of this task, `tsc` passing across Tasks 1-5 is sufficient to hand off.

- [ ] **Step 2: Open a tenant's details**

As a landlord, navigate to an occupied unit's tenant details screen. In the "Tenant profile" section, confirm a new "Edit tenant details" row appears below "Request profile info from tenant".

- [ ] **Step 3: Edit and save**

Tap it, change the last name only, tap "Save changes". Expected: the sheet closes, the header at the top of the screen immediately shows the new last name (no need to leave and re-enter the screen).

- [ ] **Step 4: Trigger the duplicate-email error path**

Reopen the sheet, set the email to one you know belongs to a different existing user, submit. Expected: an `Alert` showing the backend's "This email is already in use" message, sheet stays open.

- [ ] **Step 5: Confirm the phone-change warning copy**

Reopen the sheet, note the subtitle already reads "Changing the phone number resets WhatsApp verification, the tenant will need to re-verify." before you even submit.

**No release-lane trigger for this plan** — per the release pipeline, this ships to real users only via the next tagged release (`mobile-v*`/`mobile-staging-v*`), not automatically on merge.
