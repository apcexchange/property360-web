# Tenant Identity Edit Web Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a landlord/agent fix a tenant's name, email, or phone typo from the lease detail page, calling the new `PUT /tenants/lease/:leaseId/tenant-identity` backend endpoint (see `docs/superpowers/plans/2026-08-04-tenant-identity-edit-backend.md`, must ship first, or at least be present in the API the dev server points at, before this is usable end-to-end).

**Architecture:** A small new modal component, `EditTenantIdentityForm`, mirroring the existing `EditTenantProfileForm` component's modal structure and styling but with four plain text fields (JSON body, no file uploads). An edit (pencil) icon is added next to the tenant's name in the existing "Tenant profile" card header on the lease detail page (`web/src/app/app/leases/[id]/page.tsx`), which opens the modal. A new `landlordApi.updateTenantIdentity` wrapper is added alongside the existing `fillTenantProfile` wrapper.

**Tech Stack:** Next.js 16 (App Router) / React / TypeScript / Tailwind 4 / TanStack React Query / axios.

**Repo:** the top-level directory at `~/Desktop/project/dev/property360` (its own git repo, remote `property360-web.git`, currently on branch `feat/founding-50`). All paths below are relative to that repo root and start with `web/src/...` — this is the OLD monorepo-style layout that branch uses, not the `src/...`-at-root layout `develop`/`main` use. Do not confuse the two.

**Spec:** `docs/superpowers/specs/2026-08-04-tenant-identity-edit-design.md`

---

## Before you start

- **Work directly on the current branch (`feat/founding-50`), no worktree, no new branch.** Unlike the backend, this branch already carries substantial unrelated uncommitted work across dozens of files in this same repo (an em-dash cleanup sweep, per user preference — see recent `git log`), and that's the established pattern for this branch: features accumulate here as commits before an occasional separate porting step ships them to `develop`/`main`. Just add commits on top, same as everything else currently in progress here.
- **Do not push or open a PR.** `feat/founding-50` has no shared git history with `origin/main` (this repo's `main` keeps the Next app at the repo root, not under `web/`) — pushing this branch directly, or trying to open a PR against `main`, will not work and is not how this branch ships. Deploying web changes requires a separate manual `git subtree split --prefix=web` step the user does deliberately; that is explicitly out of scope for this plan. Task 4 below ends at "commit", not "push".
- **Verification is `tsc --noEmit`** (no test runner in this repo either) plus a manual walkthrough in the browser if a dev server is running.
- This plan depends on the backend route existing. If you're running against a local backend dev server, complete the backend plan first (or at least Tasks 1-4 of it) so `PUT /tenants/lease/:leaseId/tenant-identity` actually responds instead of 404ing.

---

### Task 1: Add the `updateTenantIdentity` API wrapper

**Files:**
- Modify: `web/src/lib/landlord-api.ts`

- [ ] **Step 1: Add the wrapper and its type**

Open `web/src/lib/landlord-api.ts`. Find the `fillTenantProfile` method:

```ts
  /**
   * Landlord fills the tenant's profile on their behalf. Multipart so
   * avatar / kycSelfie / idDocument can be attached. Backend accepts any
   * subset of the fields, partial updates are fine.
   */
  async fillTenantProfile(
    leaseId: string,
    payload: FormData
  ): Promise<TenantProfileSnapshot> {
    const res = await api.put(
      `/tenants/lease/${leaseId}/tenant-profile`,
      payload,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return unwrap(res.data) as TenantProfileSnapshot;
  },
```

Immediately after it, insert:

```ts

  /**
   * Direct landlord/agent edit of the tenant's core identity fields
   * (name/email/phone). Distinct from fillTenantProfile, which only
   * covers KYC-adjacent fields. Any subset of the four fields is fine,
   * partial update.
   */
  async updateTenantIdentity(
    leaseId: string,
    payload: {
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    }
  ): Promise<TenantIdentityUpdate> {
    const res = await api.put(
      `/tenants/lease/${leaseId}/tenant-identity`,
      payload
    );
    return unwrap(res.data) as TenantIdentityUpdate;
  },
```

Then find the `TenantProfileSnapshot` interface:

```ts
export interface TenantProfileSnapshot {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
```

Immediately before it, insert the new response type:

```ts
export interface TenantIdentityUpdate {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  whatsappVerified: boolean;
}

```

- [ ] **Step 2: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: no output (clean pass).

- [ ] **Step 3: Commit**

```bash
git add web/src/lib/landlord-api.ts
git commit -m "feat(web/tenants): add updateTenantIdentity API wrapper"
```

---

### Task 2: Create the `EditTenantIdentityForm` modal component

**Files:**
- Create: `web/src/components/app/EditTenantIdentityForm.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { X, Save } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  landlordApi,
  TenantIdentityUpdate,
  TenantProfileSnapshot,
} from "@/lib/landlord-api";
import { useToast } from "@/components/ui/Toast";
import { AxiosError } from "axios";

interface Props {
  leaseId: string;
  initial: TenantProfileSnapshot;
  onClose: () => void;
}

export function EditTenantIdentityForm({ leaseId, initial, onClose }: Props) {
  const toast = useToast();
  const qc = useQueryClient();

  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone ?? "");

  const phoneChanged = phone.trim() !== (initial.phone ?? "");

  const mutation = useMutation({
    mutationFn: (): Promise<TenantIdentityUpdate> =>
      landlordApi.updateTenantIdentity(leaseId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      }),
    onSuccess: () => {
      toast.success({
        title: "Tenant details updated",
        body: phoneChanged
          ? "The tenant will need to re-verify their WhatsApp number."
          : undefined,
      });
      qc.invalidateQueries({ queryKey: ["tenant-profile", leaseId] });
      onClose();
    },
    onError: (err: unknown) => {
      const msg =
        (err as AxiosError<{ message?: string }>).response?.data?.message ??
        (err as Error).message ??
        "Couldn't update tenant details";
      toast.error({ title: "Couldn't update tenant details", body: msg });
    },
  });

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    /\S+@\S+\.\S+/.test(email.trim()) &&
    phone.trim().length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-identity-title"
      className="fixed inset-0 z-50 grid place-items-center bg-foundation-900/40 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-foundation-700/10 bg-paper shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full text-ink-muted transition hover:bg-foundation-700/5 hover:text-foundation-700"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="bg-foundation-700 px-6 pb-5 pt-7 text-paper">
          <h2
            id="edit-identity-title"
            className="font-display text-[22px] font-extrabold leading-[1.15] tracking-[-0.01em]"
          >
            Edit tenant details
          </h2>
          <p className="mt-2 text-[13px] leading-[1.5] text-paper/80">
            Changing the phone number resets WhatsApp verification, the
            tenant will need to re-verify.
          </p>
        </div>

        <form
          className="space-y-4 px-6 py-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) mutation.mutate();
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" value={firstName} onChange={setFirstName} />
            <Field label="Last name" value={lastName} onChange={setLastName} />
          </div>
          <Field
            label="Email"
            type="email"
            value={email}
            onChange={setEmail}
          />
          <Field
            label="Phone"
            value={phone}
            onChange={setPhone}
            placeholder="+234..."
          />

          <div className="flex flex-col gap-2 pt-1 sm:flex-row-reverse">
            <button
              type="submit"
              disabled={!canSubmit || mutation.isPending}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-foundation-700 px-5 py-3 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {mutation.isPending ? "Saving…" : "Save changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-foundation-700/15 bg-paper px-5 py-3 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 block w-full rounded-2xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[13px] text-foundation-700 outline-none transition focus:border-foundation-700"
      />
    </label>
  );
}
```

This mirrors the existing `web/src/components/app/EditTenantProfileForm.tsx` modal shell (backdrop, header, close button, styling) exactly, trimmed to four plain fields and a JSON body instead of `FormData`.

- [ ] **Step 2: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: no output (clean pass).

- [ ] **Step 3: Commit**

```bash
git add web/src/components/app/EditTenantIdentityForm.tsx
git commit -m "feat(web/tenants): add EditTenantIdentityForm modal"
```

---

### Task 3: Wire the edit button into the lease detail page

**Files:**
- Modify: `web/src/app/app/leases/[id]/page.tsx`

- [ ] **Step 1: Import the new component and the `Pencil` icon**

Find:

```tsx
import {
  ArrowLeft,
  RefreshCw,
  Receipt,
  ShieldCheck,
  PhoneCall,
  Plus,
  ScrollText,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
```

Replace with:

```tsx
import {
  ArrowLeft,
  RefreshCw,
  Receipt,
  ShieldCheck,
  PhoneCall,
  Plus,
  ScrollText,
  ExternalLink,
  MessageSquare,
  Pencil,
} from "lucide-react";
```

Find:

```tsx
import { RequestTenantProfileModal } from "@/components/app/RequestTenantProfileModal";
import { EditTenantProfileForm } from "@/components/app/EditTenantProfileForm";
```

Replace with:

```tsx
import { RequestTenantProfileModal } from "@/components/app/RequestTenantProfileModal";
import { EditTenantProfileForm } from "@/components/app/EditTenantProfileForm";
import { EditTenantIdentityForm } from "@/components/app/EditTenantIdentityForm";
```

- [ ] **Step 2: Add the modal-open state**

Find (inside `TenantProfileSection`):

```tsx
  const [showRequest, setShowRequest] = useState(false);
  const [showFill, setShowFill] = useState(false);
```

Replace with:

```tsx
  const [showRequest, setShowRequest] = useState(false);
  const [showFill, setShowFill] = useState(false);
  const [showEditIdentity, setShowEditIdentity] = useState(false);
```

- [ ] **Step 3: Add the pencil-edit button next to the tenant's name**

Find:

```tsx
            <div className="flex-1">
              <p className="font-display text-[18px] font-bold text-foundation-700">
                {profile.firstName} {profile.lastName}
              </p>
              <p className="text-[12.5px] text-ink-muted">
                {profile.email}
                {profile.phone ? ` · ${profile.phone}` : ""}
              </p>
            </div>
```

Replace with:

```tsx
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-display text-[18px] font-bold text-foundation-700">
                  {profile.firstName} {profile.lastName}
                </p>
                <button
                  type="button"
                  onClick={() => setShowEditIdentity(true)}
                  aria-label="Edit tenant name, email, or phone"
                  className="grid h-6 w-6 place-items-center rounded-full text-ink-muted transition hover:bg-foundation-700/5 hover:text-foundation-700"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[12.5px] text-ink-muted">
                {profile.email}
                {profile.phone ? ` · ${profile.phone}` : ""}
              </p>
            </div>
```

- [ ] **Step 4: Render the modal**

Find:

```tsx
      {showFill && (
        <EditTenantProfileForm
          leaseId={leaseId}
          initial={profile}
          onClose={() => setShowFill(false)}
        />
      )}
    </Card>
  );
}
```

Replace with:

```tsx
      {showFill && (
        <EditTenantProfileForm
          leaseId={leaseId}
          initial={profile}
          onClose={() => setShowFill(false)}
        />
      )}
      {showEditIdentity && profile && (
        <EditTenantIdentityForm
          leaseId={leaseId}
          initial={profile}
          onClose={() => setShowEditIdentity(false)}
        />
      )}
    </Card>
  );
}
```

The `profile &&` guard is redundant with the surrounding `!profile` early-return higher up in the same render branch, but it's cheap insurance and keeps this block correct if that branch is ever restructured.

- [ ] **Step 5: Type-check**

Run: `cd web && npx tsc --noEmit`
Expected: no output (clean pass).

- [ ] **Step 6: Commit**

```bash
git add web/src/app/app/leases/[id]/page.tsx
git commit -m "feat(web/tenants): add edit action for tenant name/email/phone"
```

---

### Task 4: Manual verification (only if a dev server is running against a backend with the new route)

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run: `cd web && npm run dev`
Expected: server starts on port 3000. If there's no backend dev server reachable (or it doesn't have the tenant-identity route from the backend plan yet), skip the rest of this task, `tsc` passing across Tasks 1-3 is sufficient to hand off.

- [ ] **Step 2: Open a lease detail page**

Navigate to `/app/leases/<id>` for a lease with an occupied unit. In the "Tenant profile" card, confirm a pencil icon now appears next to the tenant's name.

- [ ] **Step 3: Edit and save**

Click the pencil, change the last name only, click "Save changes". Expected: a success toast, the modal closes, the header updates to show the new last name (query invalidation refetches `tenant-profile`).

- [ ] **Step 4: Trigger the duplicate-email error path**

Reopen the modal, set the email field to an email you know belongs to a different existing user, submit. Expected: an error toast showing the backend's "This email is already in use" message, modal stays open (not auto-closed on error).

- [ ] **Step 5: Confirm the phone-change warning copy**

Reopen the modal, change the phone number, submit. Expected: success toast body reads "The tenant will need to re-verify their WhatsApp number."

**No further push step for this plan** — see "Before you start" above, this branch's changes stay local/committed only.
