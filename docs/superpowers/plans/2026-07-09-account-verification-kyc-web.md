# Account Verification (KYC) — Web Client Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Bring the web KYC UI up to the approved design: collect gender/address/consent + a phone-OTP step in the verify form, fix the client/backend field-name mismatch, show the private ID + selfie images in the admin review page, and add a "Verified" badge by the user's name.

**Architecture:** Gap-fill on an existing web KYC scaffold. On branch `feat/founding-50` the web app is at `web/src/` (root repo). An admin review page (`web/src/app/admin/(app)/kyc/page.tsx`), user upload pages (`web/src/app/app/profile/kyc/page.tsx` + `/me` twin), the client KYC API (`landlordApi`/`tenantApi`), and a `PhoneVerifyModal` all already exist. We extend them.

**Tech Stack:** Next.js (App Router) + React Query + the shared axios `api` client (`web/src/lib/api.ts`, `unwrap()` envelope).

**Verification gate (no unit tests):** after each task run `cd web && npx tsc --noEmit` and `npx eslint web/src/... ` on touched files (both exit 0). Exercise the flow in the browser where noted.

**Git:** web files live in the monorepo ROOT repo (current branch `feat/founding-50`). Commit there with `--no-verify`, staging only the listed files. Do NOT push. Do NOT `git add -A`. (Deploying to production is a separate path-remap `web/src`→`src` onto `main`, out of scope here.)

**Correctness note the exploration surfaced:** the client's `uploadKycDocument`/`uploadKycSelfie` send FormData fields `file` and `type`, but the backend `POST /kyc/document` uses `upload.single('document')` + `req.body.documentType`, and `POST /kyc/selfie` uses `upload.single('selfie')`. These do not match, so the upload is currently broken against the live backend. Task 2 fixes the field names and adds the new fields. Also note the backend `KYCStatus` verified value is **`verified`** (not `approved`).

---

### Task 1: Widen client user/profile types with `gender`, `address`, `kyc.status`

**Files:**
- Modify: `web/src/lib/session.ts` (the `AdminUser` interface)
- Modify: `web/src/lib/landlord-api.ts` (the `UserProfile` type + `updateProfile` body type)

- [ ] **Step 1: Extend `AdminUser`**

In `web/src/lib/session.ts`, add to the `AdminUser` interface (so `session.getUser()` can drive the badge + prefill):

```ts
  gender?: "male" | "female" | "other";
  address?: { street?: string; city?: string; state?: string; postalCode?: string };
  kyc?: { status?: "not_started" | "pending" | "verified" | "rejected"; rejectionReason?: string };
```

- [ ] **Step 2: Extend `UserProfile` + `updateProfile`**

In `web/src/lib/landlord-api.ts`, add the same `gender` and `address` fields to the `UserProfile` type, and widen the `updateProfile` request body type to accept `gender` and `address` so they can be persisted from the verify form.

- [ ] **Step 3: Gate + commit**

Run: `cd /Users/peter/Desktop/project/dev/property360/web && npx tsc --noEmit` (exit 0).
```bash
cd /Users/peter/Desktop/project/dev/property360
git add web/src/lib/session.ts web/src/lib/landlord-api.ts
git commit --no-verify -m "feat(kyc-web): expose gender/address/kyc.status on client user + profile types"
```

---

### Task 2: Fix + extend the KYC upload API methods

**Files:**
- Modify: `web/src/lib/landlord-api.ts` (`uploadKycSelfie`, `uploadKycDocument`)
- Modify: `web/src/lib/tenant-api.ts` (the identical twin methods)

- [ ] **Step 1: Align field names and add the new fields**

Replace both methods (in landlord-api.ts, then mirror in tenant-api.ts) with the backend-matching shapes:

```ts
async uploadKycSelfie(file: File): Promise<KycSummary> {
  const form = new FormData();
  form.append("selfie", file); // backend: upload.single('selfie')
  const res = await api.post("/kyc/selfie", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrap(res.data) as KycSummary;
},

async uploadKycDocument(args: {
  file: File;
  type: string;
  documentNumber: string;
  consent: boolean;
  gender?: string;
  address?: { street?: string; city?: string; state?: string; postalCode?: string };
}): Promise<KycSummary> {
  const form = new FormData();
  form.append("document", args.file);        // backend: upload.single('document')
  form.append("documentType", args.type);    // backend: req.body.documentType
  form.append("documentNumber", args.documentNumber);
  form.append("consent", String(args.consent));
  if (args.gender) form.append("gender", args.gender);
  if (args.address) form.append("address", JSON.stringify(args.address));
  const res = await api.post("/kyc/document", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return unwrap(res.data) as KycSummary;
},
```

Update every caller of `uploadKycDocument` to the new object-arg signature (the KYC pages in Task 3).

- [ ] **Step 2: Gate + commit**

Run: `cd web && npx tsc --noEmit` (exit 0 once Task 3 callers are updated; if run standalone, expect caller type errors that Task 3 resolves — commit Task 2 + Task 3 together if needed).
```bash
cd /Users/peter/Desktop/project/dev/property360
git add web/src/lib/landlord-api.ts web/src/lib/tenant-api.ts
git commit --no-verify -m "fix(kyc-web): match backend field names + add gender/address/consent to KYC upload"
```

---

### Task 3: Extend the "Verify your account" page (gender, address, consent, OTP)

**Files:**
- Modify: `web/src/app/app/profile/kyc/page.tsx` (landlord/agent)
- Modify: `web/src/app/me/profile/kyc/page.tsx` (tenant twin)

- [ ] **Step 1: Add gender + address + consent to the document submit**

In each page, add to the existing `DocumentCard` (or a new form section above it):
- a **gender** `<select>` (Male/Female/Other),
- **address** inputs (street, city, state; postalCode optional), pre-filled from `session.getUser().address` or the profile query,
- a required **consent** checkbox: "I consent to Property360 collecting and storing my ID for verification (per our privacy policy)."

Wire the document submit to the new `uploadKycDocument({ file, type, documentNumber, consent, gender, address })`. Disable the submit button until consent is checked and required fields are filled. On success, show the resulting `kycStatus` (now `pending`) and surface `rejectionReason` when status is `rejected`.

- [ ] **Step 2: Add the phone-verification step**

If `session.getUser().phoneVerified` is not true, render a "Verify your phone" prompt that opens the existing `PhoneVerifyModal` (`web/src/components/app/PhoneVerifyModal.tsx`) — it already sends WhatsApp-first OTP with SMS fallback and calls `authApi.sendPhoneVerification`/`verifyPhone`. Present it as step 1 of the verify journey, the ID upload as step 2. Do not block the ID upload on it (soft), but show both states.

- [ ] **Step 3: Gate + commit**

Run: `cd web && npx tsc --noEmit` (exit 0) and `npx eslint` on the two files (exit 0). Load `/app/profile/kyc` in the browser and confirm the form renders, consent gating works, and submit sets status to pending.
```bash
cd /Users/peter/Desktop/project/dev/property360
git add web/src/app/app/profile/kyc/page.tsx web/src/app/me/profile/kyc/page.tsx
git commit --no-verify -m "feat(kyc-web): verify-account form adds gender/address/consent + phone OTP step"
```

---

### Task 4: Admin review page shows the private ID + selfie images

**Files:**
- Modify: `web/src/lib/admin.ts` (`AdminKycRow` type)
- Modify: `web/src/app/admin/(app)/kyc/page.tsx`

- [ ] **Step 1: Extend the type with the signed URLs**

In `web/src/lib/admin.ts`, extend `AdminKycRow.kyc` with the new backend fields:

```ts
    document?: { type?: string; number?: string; uploadedAt?: string; imageUrl?: string; imageSignedUrl?: string };
    selfieUrl?: string;
    selfieSignedUrl?: string;
```

- [ ] **Step 2: Render the images inline**

In the admin KYC page, replace the current "View doc" link (which used `r.kyc.document.imageUrl`) with rendering of `r.kyc.document.imageSignedUrl` (the ID) and, when present, `r.kyc.selfieSignedUrl` (the selfie), e.g. as thumbnails that open full-size in a new tab. The plain `imageUrl` no longer loads (assets are now private) — use the signed URLs. Keep the existing approve / reject-with-reason mutations as-is.

- [ ] **Step 3: Gate + commit**

Run: `cd web && npx tsc --noEmit` (exit 0) + eslint. In the browser, as an admin, open `/admin/kyc` with a pending submission and confirm the ID/selfie thumbnails load via the signed URLs and approve/reject work.
```bash
cd /Users/peter/Desktop/project/dev/property360
git add web/src/lib/admin.ts "web/src/app/admin/(app)/kyc/page.tsx"
git commit --no-verify -m "feat(kyc-web): admin review renders private ID + selfie via signed URLs"
```

---

### Task 5: "Verified" badge beside the user's name

**Files:**
- Modify: `web/src/components/app/Topbar.tsx` (landlord/agent)
- Modify: `web/src/components/me/Topbar.tsx` (tenant)

- [ ] **Step 1: Render the badge**

In each Topbar, next to the displayed name (`{user?.firstName}`), when `user?.kyc?.status === "verified"` render the shared pill: `<StatusPill label="Verified" tone="good" />` (from `web/src/components/app/ui.tsx`). Keep it small and inline/below the name.

```tsx
{user?.kyc?.status === "verified" && (
  <StatusPill label="Verified" tone="good" />
)}
```

(The badge reads `session.getUser().kyc.status`, populated at login/verify from the backend `serializeUser`. It refreshes on next login; that staleness is acceptable for v1.)

- [ ] **Step 2: Gate + commit**

Run: `cd web && npx tsc --noEmit` (exit 0) + eslint. In the browser, confirm a verified user shows the badge and an unverified one does not.
```bash
cd /Users/peter/Desktop/project/dev/property360
git add web/src/components/app/Topbar.tsx web/src/components/me/Topbar.tsx
git commit --no-verify -m "feat(kyc-web): Verified badge beside user name when kyc verified"
```

---

## Self-review (plan author)

- **Spec coverage:** verify form gender/address/consent + phone OTP ✓ (T3); admin views private images via signed URLs ✓ (T4); Verified badge by name ✓ (T5); client types carry kyc/gender/address ✓ (T1); the field-name mismatch that would have silently broken uploads is fixed ✓ (T2).
- **Reuses existing:** admin KYC page, user KYC pages, `PhoneVerifyModal`, `StatusPill`, the `api`/`unwrap` client, `landlordApi`/`tenantApi` KYC methods.
- **Consistency:** uses the backend enum value `verified` (not "approved"); FormData field names now match the backend (`document`/`selfie`/`documentType`); `uploadKycDocument` signature change is propagated to its Task 3 callers.
- **Placeholder scan:** none; each task specifies concrete edits against named existing files. Task 3 describes the form additions rather than a full page rewrite because it extends an existing page the implementer will read.
