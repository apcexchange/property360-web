# Account Verification (KYC) — Mobile Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Turn the mobile KYC stub into the approved "Verify your account" flow: verify the phone (existing WhatsApp-first OTP), collect gender/address/ID/consent and upload the ID (+ optional selfie), and show a "Verified" badge and live status.

**Architecture:** Gap-fill. Mobile already has `kycApi` (`src/services/api.ts`), real ID/selfie upload screens (`IDUploadScreen`, `SelfieCaptureScreen`), a stub `KYCScreen` (the profile-linked route, currently a fake `setTimeout` with no pickers/API), a working `PhoneVerifyModal`, and the `"KYC"` route already registered for both roles. We flesh out the stub and extend the API client.

**Tech Stack:** React Native / Expo, Redux Toolkit (`authSlice`) + React Query (`useAuth`), axios (`src/api/client/axiosInstance.ts`), `expo-image-picker`.

**Verification gate (no unit tests):** after each task run `cd mobile && npx tsc --noEmit` (exit 0). Exercise the screen in the app where noted.

**Git:** `mobile/` is its OWN nested git repo, currently on branch `feat/wallet-ui`, working tree clean. Run git from inside `mobile/`. Commit with `--no-verify`, staging only the listed files. Do NOT push. Do NOT `git add -A`.

**Backend contract reminder:** `POST /kyc/document` (multipart) fields = `document` (file), `documentType`, `documentNumber`, `consent` (`'true'`), optional `gender`, optional `address` (JSON string). `POST /kyc/selfie` field = `selfie` (file). `GET /kyc/status`. `KYCStatus` verified value is `verified`.

---

### Task 1: Add `kyc`, `gender`, `address` to the client `User` type

**Files:**
- Modify: `mobile/src/types/index.ts` (the `User` interface, ~lines 125-142)

- [ ] **Step 1: Extend the interface**

```ts
  gender?: 'male' | 'female' | 'other';
  address?: { street?: string; city?: string; state?: string; postalCode?: string };
  kyc?: { status: 'not_started' | 'pending' | 'verified' | 'rejected'; rejectionReason?: string };
```

- [ ] **Step 2: Gate + commit**

Run: `cd /Users/peter/Desktop/project/dev/property360/mobile && npx tsc --noEmit` (exit 0).
```bash
cd /Users/peter/Desktop/project/dev/property360/mobile
git add src/types/index.ts
git commit --no-verify -m "feat(kyc-mobile): expose kyc status + gender + address on User type"
```

---

### Task 2: Extend `kycApi.uploadDocument` with gender/consent/address

**Files:**
- Modify: `mobile/src/services/api.ts` (`kycApi.uploadDocument`, ~lines 53-82)

- [ ] **Step 1: Widen the signature and append the new fields**

Change `uploadDocument` to accept the extra fields and append them to the FormData (keeping the existing `document`/`documentType`/`documentNumber` fields):

```ts
async uploadDocument(args: {
  imageUri: string;
  documentType: IDDocumentType;
  documentNumber: string;
  consent: boolean;
  gender?: 'male' | 'female' | 'other';
  address?: { street?: string; city?: string; state?: string; postalCode?: string };
}): Promise<KYCUploadResponse> {
  const { imageUri, documentType, documentNumber, consent, gender, address } = args;
  const formData = new FormData();
  const filename = imageUri.split('/').pop() || 'document.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : 'image/jpeg';
  formData.append('document', { uri: imageUri, name: filename, type } as unknown as Blob);
  formData.append('documentType', documentType);
  formData.append('documentNumber', documentNumber);
  formData.append('consent', String(consent));
  if (gender) formData.append('gender', gender);
  if (address) formData.append('address', JSON.stringify(address));
  const response = await api.post<KYCUploadResponse>(KYC_URLS.DOCUMENT, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: UPLOAD_TIMEOUT,
  });
  return response.data;
},
```

Update the one existing caller (`IDUploadScreen.tsx:98`) to the new object-arg shape (pass `consent: true` there, or route that screen through the new KYCScreen flow — see Task 3).

- [ ] **Step 2: Gate + commit**

Run: `cd mobile && npx tsc --noEmit` (exit 0 after the caller is updated).
```bash
cd /Users/peter/Desktop/project/dev/property360/mobile
git add src/services/api.ts src/screens/auth/IDUploadScreen.tsx
git commit --no-verify -m "feat(kyc-mobile): send gender/consent/address on KYC document upload"
```

---

### Task 3: Build out `KYCScreen` into the real Verify flow

**Files:**
- Modify: `mobile/src/screens/auth/KYCScreen.tsx`

- [ ] **Step 1: Replace the stub with a real multi-step flow**

Keep the existing `info → document → selfie` step scaffolding, but make it functional:
- **Phone step** (before or within `info`): read `user` from `useAppSelector((s) => s.auth.user)`. If `user?.phone && !user.phoneVerified`, show a "Verify your phone" button that opens `<PhoneVerifyModal visible phone={user.phone} onClose={...} onVerified={...} />` (from `src/components`). Mark the step done on `onVerified`.
- **Details + document step:** add a **gender** selector (Male/Female/Other), **address** inputs (street/city/state; postalCode optional, prefilled from `user.address`), the existing **ID type** grid + **ID number** input, an **image picker** for the ID card (reuse the `expo-image-picker` pattern from `IDUploadScreen.tsx:41-91`: `launchCameraAsync`/`launchImageLibraryAsync`, `mediaTypes:['images']`, `quality:0.8`), and a required **consent checkbox** ("I consent to Property360 collecting and storing my ID for verification.").
- **Selfie step (optional):** reuse the front-camera picker from `SelfieCaptureScreen.tsx:45-51`; allow skipping.
- **Submit:** call `kycApi.uploadDocument({ imageUri, documentType, documentNumber, consent, gender, address })` (and `kycApi.uploadSelfie(selfieUri)` if a selfie was taken). Disable submit until consent is checked and required fields are present.
- **After success:** fetch fresh status via `kycApi.getKYCStatus()` (or use the returned user) and mirror KYC status into both stores: `dispatch(updateUser({ kyc: { status: 'pending' }, gender, address }))` and `queryClient.setQueryData(['auth','user'], ...)`. Show a "Submitted, pending review" state; if a prior status is `rejected`, show `rejectionReason` and allow re-submit.

Remove the fake `setTimeout` completion (lines ~45-57).

- [ ] **Step 2: Gate + commit**

Run: `cd mobile && npx tsc --noEmit` (exit 0). Run the app, open Profile → Verification, and confirm: phone step opens the OTP modal, the ID picker works, consent gates submit, and a submit sets status to pending.
```bash
cd /Users/peter/Desktop/project/dev/property360/mobile
git add src/screens/auth/KYCScreen.tsx
git commit --no-verify -m "feat(kyc-mobile): real Verify-your-account flow (phone step, fields, consent, upload)"
```

---

### Task 4: Verified badge + live status on the Profile screen

**Files:**
- Modify: `mobile/src/screens/main/ProfileScreen.tsx`

- [ ] **Step 1: Bind the Verification menu badge to real status**

The "Verification" menu row (~lines 246-252) hardcodes `badge: 'Not started'`. Map it from `user.kyc?.status`:

```ts
const kycBadge =
  user?.kyc?.status === 'verified' ? 'Verified'
  : user?.kyc?.status === 'pending' ? 'Pending'
  : user?.kyc?.status === 'rejected' ? 'Action needed'
  : 'Not started';
// ...badge: kycBadge...
```

- [ ] **Step 2: Add a "Verified" badge beside the name**

Beside the name (~line 460) or next to `<RoleBadge>` (~line 466), when `user?.kyc?.status === 'verified'` render a small pill modeled on `src/components/RoleBadge.tsx` (an Ionicons `shield-checkmark` + "Verified", green). Reads `user` from the store, no new data fetch needed.

Optionally seed/refresh status on focus with `kycApi.getKYCStatus()`.

- [ ] **Step 3: Gate + commit**

Run: `cd mobile && npx tsc --noEmit` (exit 0). In the app, confirm a verified user shows the badge + "Verified" menu state; a fresh user shows "Not started".
```bash
cd /Users/peter/Desktop/project/dev/property360/mobile
git add src/screens/main/ProfileScreen.tsx
git commit --no-verify -m "feat(kyc-mobile): Verified badge + live KYC status on Profile"
```

---

## Self-review (plan author)

- **Spec coverage:** phone-verify step (reuses `PhoneVerifyModal`) ✓ (T3); gender/address/ID/consent + upload ✓ (T2, T3); selfie optional ✓ (T3); Verified badge + live status ✓ (T4); client `User` carries kyc/gender/address ✓ (T1).
- **Reuses existing:** `kycApi`, `PhoneVerifyModal`, `IDUploadScreen`/`SelfieCaptureScreen` picker logic, `authSlice.updateUser`, the registered `"KYC"` route, `RoleBadge` pattern.
- **Consistency:** enum value `verified`; multipart fields (`document`/`documentType`/`consent`/`address` JSON) match the backend contract; `uploadDocument` signature change propagated to its `IDUploadScreen` caller.
- **Placeholder scan:** none; Task 3 describes the screen build against named existing screens to mirror rather than a full component dump, appropriate for fleshing out an existing stub the implementer will read.
