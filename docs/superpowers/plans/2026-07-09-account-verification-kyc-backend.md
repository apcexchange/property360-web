# Account Verification (KYC) — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the gaps between the existing KYC scaffold and the approved design: collect gender/address/consent, make the selfie optional, store ID/selfie images privately, gate wallet money actions on the landlord's verified KYC, and notify admins on submit + users on decision.

**Architecture:** This is a GAP-FILL on an already-built KYC feature (`KYCService`, `/kyc` routes, `/admin/kyc/*` review, `admin` role, `user.kyc` schema all exist). We extend the existing pieces in place rather than rebuild. The one structural addition is private Cloudinary storage with on-demand signed URLs for admin viewing.

**Tech Stack:** Node/Express 5/TypeScript, Mongoose, Cloudinary (authenticated assets), existing `NotificationService`.

**No test runner.** Per repo convention the per-task gate is `cd backend && npx tsc --noEmit` (exit 0). Correctness is exercised with the manual curl checklist in the final task.

**Git rules (nested repo):** the backend is its own git repo at `backend/` on branch `feat/wallet-dva`. Run all git from inside `backend/`. There are 3 pre-existing WIP files (`src/controllers/SalesController.ts`, `src/models/SalesLead.ts`, `src/services/sales/SalesLeadService.ts`) — never stage or touch them. Stage only the files each task lists. Commit with `--no-verify`. Do not push.

**Security note (why Task 2 matters):** today `KYCService` uploads selfies and ID documents with `CloudinaryService.uploadImage`, which produces PUBLIC `secure_url`s. Government IDs are therefore world-readable by URL. This plan switches them to Cloudinary `authenticated` (private) assets served only via short-lived signed URLs to admins.

---

### Task 1: Add `Gender` enum + `gender` field

**Files:**
- Modify: `backend/src/types/index.ts`
- Modify: `backend/src/models/User.ts`

- [ ] **Step 1: Add the enum + interface field (types)**

In `src/types/index.ts`, immediately after the `IDDocumentType` enum (the enum block that ends around line 26), add:

```ts
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}
```

Then in the `IUser` interface, next to `dateOfBirth?: Date;` / `occupation?: string;`, add:

```ts
  gender?: Gender;
```

Also extend the `IUser` `kyc` shape (and `IKYCDocument`) with the new fields this plan stores. In `IKYCDocument` add `imagePublicId?: string;`, and in the `kyc` object type on `IUser` add `selfiePublicId?: string;` and `consentAt?: Date;`.

- [ ] **Step 2: Mirror in the Mongoose schema (User model)**

In `src/models/User.ts`, add `Gender` to the existing type import (`import { IUser, UserRole, KYCStatus, IDDocumentType, Gender } from '../types';`). Add a `gender` field next to `occupation` (around line 95):

```ts
    gender: {
      type: String,
      enum: Object.values(Gender),
    },
```

In the `kyc` sub-document (around lines 105-124), add the private-storage + consent fields:
- inside `kyc.document`, add `imagePublicId: String,`
- inside `kyc` (alongside `selfieUrl`), add `selfiePublicId: String,`
- inside `kyc` (alongside `verifiedAt`), add `consentAt: Date,`

- [ ] **Step 3: Build + commit**

Run: `cd /Users/peter/Desktop/project/dev/property360/backend && npx tsc --noEmit` (expect exit 0).
```bash
git add src/types/index.ts src/models/User.ts
git commit --no-verify -m "feat(kyc): add gender field + kyc private-storage/consent schema fields"
```

---

### Task 2: Private Cloudinary upload + signed URL

**Files:**
- Modify: `backend/src/services/CloudinaryService.ts`

- [ ] **Step 1: Add a private upload method and a signed-URL helper**

Add these two methods inside the `CloudinaryService` class (e.g. after `uploadImage`):

```ts
  /**
   * Upload an image as a PRIVATE (authenticated) Cloudinary asset. Unlike
   * uploadImage, the delivered asset is NOT publicly reachable by URL — it
   * must be requested through a signed URL (see getSignedImageUrl). Used for
   * KYC IDs and selfies. Store BOTH url and publicId; the publicId is what
   * regenerates signed view URLs later.
   */
  async uploadPrivateImage(
    filePath: string,
    folder: string = 'kyc'
  ): Promise<UploadResult> {
    try {
      const result: UploadApiResponse = await cloudinary.uploader.upload(filePath, {
        folder: `property360/${folder}`,
        resource_type: 'image',
        type: 'authenticated',
      });
      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
      };
    } catch (error) {
      console.error('Cloudinary private upload error:', error);
      throw new Error('Failed to upload image to Cloudinary');
    }
  }

  /**
   * Signed delivery URL for an authenticated (private) image. Only holders of
   * this signed URL can view the asset. Used to let admins view KYC documents.
   */
  getSignedImageUrl(publicId: string): string {
    return cloudinary.url(publicId, {
      type: 'authenticated',
      resource_type: 'image',
      sign_url: true,
      secure: true,
    });
  }
```

- [ ] **Step 2: Build + commit**

Run: `cd /Users/peter/Desktop/project/dev/property360/backend && npx tsc --noEmit` (expect exit 0).
```bash
git add src/services/CloudinaryService.ts
git commit --no-verify -m "feat(kyc): private (authenticated) Cloudinary upload + signed-URL helper"
```

---

### Task 3: KYCService — private uploads, capture gender/address/consent, selfie-optional, notify admins

**Files:**
- Modify: `backend/src/services/KYCService.ts`

- [ ] **Step 1: Update imports + the document-data interface**

Change the imports at the top to:

```ts
import path from 'path';
import fs from 'fs';
import { User } from '../models/User';
import { KYCStatus, IDDocumentType, IUser, Gender, UserRole } from '../types';
import CloudinaryService from './CloudinaryService';
import NotificationService from './NotificationService';
```

Extend `UploadDocumentData`:

```ts
interface UploadDocumentData {
  userId: string;
  documentType: IDDocumentType;
  documentNumber: string;
  file: Express.Multer.File;
  gender?: Gender;
  address?: { street?: string; city?: string; state?: string; postalCode?: string };
  consent: boolean;
}
```

- [ ] **Step 2: Private selfie upload (drop public-avatar coupling)**

Replace the body of `uploadSelfie` after loading the user with:

```ts
    // Upload privately (KYC selfie is sensitive; not a public avatar).
    const result = await CloudinaryService.uploadPrivateImage(file.path, 'kyc/selfies');
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

    user.kyc = user.kyc || { status: KYCStatus.NOT_STARTED };
    user.kyc.selfieUrl = result.url;
    user.kyc.selfiePublicId = result.publicId;
    user.kyc.selfieUploadedAt = new Date();

    await user.save();
    return user;
```

(Removes the `if (!user.avatar) user.avatar = result.url` block — a private asset must not be used as a public avatar — and removes the selfie-driven PENDING transition; PENDING is now driven by the document submit in Step 3.)

- [ ] **Step 3: Rework `uploadDocument` into the submission (consent + fields + PENDING + notify admins)**

Replace `uploadDocument` with:

```ts
  async uploadDocument(data: UploadDocumentData): Promise<IUser> {
    const { userId, documentType, documentNumber, file, gender, address, consent } = data;

    if (consent !== true) {
      throw new Error('Consent is required to submit your identity for verification.');
    }

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    this.validateDocumentNumber(documentType, documentNumber);

    const result = await CloudinaryService.uploadPrivateImage(file.path, 'kyc/documents');
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

    user.kyc = user.kyc || { status: KYCStatus.NOT_STARTED };
    user.kyc.document = {
      type: documentType,
      number: documentNumber,
      imageUrl: result.url,
      imagePublicId: result.publicId,
      uploadedAt: new Date(),
    };
    user.kyc.consentAt = new Date();

    if (documentType === IDDocumentType.NIN) {
      user.nin = documentNumber;
    }
    if (gender) user.gender = gender;
    if (address) {
      user.address = { ...(user.address || {}), ...address };
    }

    // Selfie is optional: a document + consent is a complete submission.
    user.kyc.status = KYCStatus.PENDING;
    await user.save();

    await this.notifyAdminsOfSubmission(user);
    return user;
  }

  /** In-app notify all active admins that a KYC submission is awaiting review. */
  private async notifyAdminsOfSubmission(user: IUser): Promise<void> {
    try {
      const admins = await User.find({ role: UserRole.ADMIN, isActive: true }).select('_id');
      if (!admins.length) return;
      await NotificationService.createMany(
        admins.map((a) => a._id.toString()),
        'New identity verification',
        `${user.firstName} ${user.lastName} submitted an ID for review.`,
        'general',
        { userId: user._id.toString(), kyc: 'pending' },
        { respectPreferences: false }
      );
    } catch (err) {
      // Never fail the submission because a notification could not be sent.
      console.error('[KYCService] admin notify failed:', err);
    }
  }
```

- [ ] **Step 4: Build + commit**

Run: `cd /Users/peter/Desktop/project/dev/property360/backend && npx tsc --noEmit` (expect exit 0).
```bash
git add src/services/KYCService.ts
git commit --no-verify -m "feat(kyc): private uploads, capture gender/address/consent, selfie-optional, notify admins"
```

---

### Task 4: Accept the new submission fields in the `/kyc/document` route

**Files:**
- Modify: `backend/src/routes/kyc.ts`

- [ ] **Step 1: Parse gender/address/consent and pass them through**

In the `POST '/document'` handler, after the existing `documentType`/`documentNumber` extraction and validation, parse the new fields and pass them to the service. Replace the `const { documentType, documentNumber } = req.body;` block and the service call with:

```ts
      const { documentType, documentNumber, gender } = req.body;

      if (!documentType || !documentNumber) {
        fs.unlinkSync(req.file.path);
        res.status(400).json({ success: false, message: 'Document type and number are required' });
        return;
      }
      if (!Object.values(IDDocumentType).includes(documentType)) {
        fs.unlinkSync(req.file.path);
        res.status(400).json({ success: false, message: 'Invalid document type' });
        return;
      }

      // Consent must be explicit. Multipart sends it as a string.
      const consent = req.body.consent === 'true' || req.body.consent === true;
      if (!consent) {
        fs.unlinkSync(req.file.path);
        res.status(400).json({ success: false, message: 'Consent is required to submit your identity.' });
        return;
      }

      // address arrives as a JSON string field in the multipart body.
      let address: { street?: string; city?: string; state?: string; postalCode?: string } | undefined;
      if (req.body.address) {
        try {
          address = JSON.parse(req.body.address);
        } catch {
          fs.unlinkSync(req.file.path);
          res.status(400).json({ success: false, message: 'address must be valid JSON.' });
          return;
        }
      }

      const user = await KYCService.uploadDocument({
        userId: req.user._id.toString(),
        documentType: documentType as IDDocumentType,
        documentNumber,
        file: req.file,
        gender,
        address,
        consent,
      });
```

Add `Gender` to the route's type import if you reference it (not strictly needed; `gender` is passed through as a string and validated against the schema enum on save).

- [ ] **Step 2: Build + commit**

Run: `cd /Users/peter/Desktop/project/dev/property360/backend && npx tsc --noEmit` (expect exit 0).
```bash
git add src/routes/kyc.ts
git commit --no-verify -m "feat(kyc): accept gender/address/consent on document submit"
```

---

### Task 5: Notify the user on approve/reject

**Files:**
- Modify: `backend/src/services/AdminService.ts`

- [ ] **Step 1: Import NotificationService**

Ensure `import NotificationService from './NotificationService';` is present at the top of `AdminService.ts` (add if missing).

- [ ] **Step 2: Notify on approve**

In `approveKyc`, after `await user.save();` and before `writeAudit`, add:

```ts
    await NotificationService.createNotification(
      String(user._id),
      'Identity verified',
      'Your identity has been verified. You can now use wallet features.',
      'general',
      { kyc: 'verified' },
      { respectPreferences: false }
    ).catch((err) => console.error('[AdminService] approve notify failed:', err));
```

- [ ] **Step 3: Notify on reject**

In `rejectKyc`, after `await user.save();` and before `writeAudit`, add:

```ts
    await NotificationService.createNotification(
      String(user._id),
      'Verification needs attention',
      `Your identity submission was not approved: ${user.kyc.rejectionReason}. Please review and re-submit.`,
      'general',
      { kyc: 'rejected' },
      { respectPreferences: false }
    ).catch((err) => console.error('[AdminService] reject notify failed:', err));
```

- [ ] **Step 4: Build + commit**

Run: `cd /Users/peter/Desktop/project/dev/property360/backend && npx tsc --noEmit` (expect exit 0).
```bash
git add src/services/AdminService.ts
git commit --no-verify -m "feat(kyc): notify user on KYC approve/reject"
```

---

### Task 6: Admin review returns signed URLs for viewing documents

**Files:**
- Modify: `backend/src/services/AdminService.ts`

- [ ] **Step 1: Import CloudinaryService**

Ensure `import CloudinaryService from './CloudinaryService';` is present at the top of `AdminService.ts`.

- [ ] **Step 2: Map signed URLs into `listPendingKyc`**

Replace the `return { items, total, page, limit };` at the end of `listPendingKyc` with:

```ts
    const withUrls = items.map((u) => {
      const obj = u.toObject() as Record<string, any>;
      if (obj.kyc?.document?.imagePublicId) {
        obj.kyc.document.imageSignedUrl = CloudinaryService.getSignedImageUrl(
          obj.kyc.document.imagePublicId
        );
      }
      if (obj.kyc?.selfiePublicId) {
        obj.kyc.selfieSignedUrl = CloudinaryService.getSignedImageUrl(obj.kyc.selfiePublicId);
      }
      return obj;
    });
    return { items: withUrls, total, page, limit };
```

- [ ] **Step 3: Same for `getUserDetail`**

In `getUserDetail`, ensure the selected fields include `kyc` (they do), and before returning the user, attach signed URLs the same way (guard for `user.kyc`). If `getUserDetail` returns the raw doc, convert with `.toObject()` first and attach `imageSignedUrl`/`selfieSignedUrl` as above.

- [ ] **Step 4: Build + commit**

Run: `cd /Users/peter/Desktop/project/dev/property360/backend && npx tsc --noEmit` (expect exit 0).
```bash
git add src/services/AdminService.ts
git commit --no-verify -m "feat(kyc): admin review returns signed URLs for private KYC images"
```

---

### Task 7: `requireVerifiedKyc` gate on wallet money actions

**Files:**
- Create: `backend/src/middleware/requireVerifiedKyc.ts`
- Modify: `backend/src/routes/payouts.ts`
- Modify: `backend/src/middleware/index.ts` (if it re-exports middleware; add the export)

- [ ] **Step 1: Create the middleware**

```ts
import { Response, NextFunction } from 'express';
import { AuthRequestWithLandlord, KYCStatus, UserRole } from '../types';
import { User } from '../models/User';
import { AppError } from './errorHandler';

/**
 * Gate money/wallet actions on the wallet-OWNING LANDLORD's verified KYC.
 * Reads req.landlordId when set (by resolveWalletOwner); on landlord-only
 * routes (e.g. /payouts) where no owner resolution runs, falls back to
 * req.user. A verified landlord's agent therefore transacts freely; the
 * agent's own KYC is not an additional gate. Returns 403 until verified.
 */
export const requireVerifiedKyc = async (
  req: AuthRequestWithLandlord,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const ownerId = req.landlordId ?? req.user?._id;
    if (!ownerId) {
      throw new AppError('User not authenticated', 401);
    }
    // Tenants never own a landlord wallet and are not gated here.
    const owner = await User.findById(ownerId).select('kyc.status role');
    if (owner?.role !== UserRole.TENANT && owner?.kyc?.status !== KYCStatus.VERIFIED) {
      throw new AppError(
        'Please complete identity verification to use wallet features.',
        403
      );
    }
    next();
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 2: Attach it to the payout (withdrawal) route**

In `src/routes/payouts.ts`, import it and add it to the `POST '/'` route (the file is already `authorize(UserRole.LANDLORD)`-gated, so the owner is `req.user`):

```ts
import { requireVerifiedKyc } from '../middleware/requireVerifiedKyc';
// ...
router.post('/', requireVerifiedKyc, PayoutController.requestPayout);
```

- [ ] **Step 3: (If applicable) re-export**

If `src/middleware/index.ts` re-exports middleware by name, add `export * from './requireVerifiedKyc';` so `import { requireVerifiedKyc } from '../middleware'` also works. If routes import directly (as in Step 2), skip.

- [ ] **Step 4: Build + commit**

Run: `cd /Users/peter/Desktop/project/dev/property360/backend && npx tsc --noEmit` (expect exit 0).
```bash
git add src/middleware/requireVerifiedKyc.ts src/routes/payouts.ts
# include src/middleware/index.ts only if you edited it
git commit --no-verify -m "feat(kyc): requireVerifiedKyc gate on wallet payout route"
```

---

### Task 8: Expose KYC status on the serialized user (for the badge + prefill)

**Files:**
- Modify: `backend/src/services/AuthService.ts`

- [ ] **Step 1: Add fields to `serializeUser`**

In the `serializeUser` object (top of `AuthService.ts`, ~lines 14-29), add these fields (do NOT expose the document number/imageUrl publicly):

```ts
  gender: user.gender,
  address: user.address,
  kyc: user.kyc
    ? { status: user.kyc.status, rejectionReason: user.kyc.rejectionReason }
    : undefined,
```

- [ ] **Step 2: Build + commit**

Run: `cd /Users/peter/Desktop/project/dev/property360/backend && npx tsc --noEmit` (expect exit 0).
```bash
git add src/services/AuthService.ts
git commit --no-verify -m "feat(kyc): expose kyc status + gender + address on serialized user"
```

---

### Task 9: Manual verification checklist

**Files:** none. There is no test runner; exercise by hand.

- [ ] **Step 1: Submit** `POST /kyc/document` (Bearer token) as a landlord, multipart: `document` file, `documentType=nin`, `documentNumber=<11 digits>`, `consent=true`, `gender=male`, `address={"street":"..","city":"..","state":".."}`.
  Expected: 200; user `kyc.status = pending`; the Cloudinary asset is `authenticated` (its `secure_url` alone should NOT load in a browser). Admin(s) receive an in-app notification.
- [ ] **Step 2: Missing consent** → same call with `consent=false` → 400.
- [ ] **Step 3: Admin list** `GET /admin/kyc/pending` (admin token) → the item includes `kyc.document.imageSignedUrl` that DOES load the image; the plain `imageUrl` does not.
- [ ] **Step 4: Gate** `POST /payouts` as an unverified landlord → 403 "complete identity verification". Approve via `POST /admin/kyc/:userId/approve`, then `POST /payouts` passes the gate. The user receives an "Identity verified" notification.
- [ ] **Step 5: Reject** a fresh pending user via `POST /admin/kyc/:userId/reject {reason}` → user `kyc.status=rejected`, `rejectionReason` set, user notified; they can re-submit.
- [ ] **Step 6: Serialized user** — log in and confirm the auth response now includes `kyc.status`, `gender`, `address` (and NOT the raw document number/imageUrl).
- [ ] **Step 7: Final build** `cd backend && npx tsc --noEmit` → exit 0.

---

## Self-review (plan author)

- **Spec coverage:** gender ✓ (T1); private storage + signed URLs ✓ (T2, T6); consent + gender/address capture + selfie-optional ✓ (T3, T4); admin-notify-on-submit ✓ (T3); user-notify-on-decision ✓ (T5); wallet gate on landlord KYC via req.landlordId/req.user ✓ (T7); verified badge data via serializeUser ✓ (T8). Admin review page + client forms are the separate web/mobile plans.
- **Reuses existing:** `KYCService`, `/kyc` routes, `/admin/kyc/*`, `AdminService`, `NotificationService`, `admin` role — extended, not duplicated.
- **Type consistency:** `uploadPrivateImage` returns the shared `UploadResult`; `imagePublicId`/`selfiePublicId`/`consentAt` added to both schema and `IUser` types; `requireVerifiedKyc` uses `AuthRequestWithLandlord` + `KYCStatus.VERIFIED`.
- **Placeholder scan:** none; every code step is concrete. Task 6 Step 3 and Task 7 Step 3 are conditional ("if the file re-exports…") because they depend on the existing file shape the implementer will see; the field names and behavior are fully specified.
