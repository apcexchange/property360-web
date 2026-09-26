# Unit Add/Edit/Delete Web UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a landlord add a new unit to an existing property, edit a unit's number/bed-bath/size/rent/fees, and delete a vacant unit, all from the property detail page.

**Architecture:** One new shared modal component (`UnitFormModal`, used for both add and edit) plus three new `landlordApi` wrappers, wired into the existing `properties/[id]/page.tsx`. Delete reuses the page's existing lightweight-confirm-modal visual language (not the type-to-confirm pattern used for whole-property delete, that's disproportionate for a single unit).

**Tech Stack:** Next.js 16 (App Router), React Query (`@tanstack/react-query`), Tailwind 4, `lucide-react` icons, `axios`.

**Repo:** `property360-web.git`. This plan targets `origin/main`'s directory layout (`src/app/...`, no `web/` prefix), **not** `feat/founding-50` (which has an old `web/src/` prefix and unrelated in-progress work you must not touch). It depends on the backend plan (`docs/superpowers/plans/2026-08-03-unit-crud-backend.md`) being deployed, or at least merged to backend `main`, since it calls `PUT`/`DELETE /:id/units/:unitId`.

**Spec:** `docs/superpowers/specs/2026-08-03-unit-add-edit-delete-design.md`

---

## Before you start

- **Work in an isolated worktree off `origin/main`.** Set it up per the `superpowers:using-git-worktrees` skill, on a new branch (e.g. `feat/unit-crud-web`), based on `origin/main` of `property360-web.git`. Do not touch the `feat/founding-50` checkout, it carries unrelated uncommitted work and a different directory layout.
- **No test runner exists in this repo.** Verification is `tsc --noEmit` (compile gate) plus manual click-through in a browser against `npm run dev`, per this project's conventions.
- **Known limitation, out of scope:** the backend `Unit` model has no `rentPeriod` field, it's silently dropped even though the property-creation form sends one. The new add/edit form in this plan deliberately does **not** include a rent-period selector, only fields that actually persist (unit number, bedrooms, bathrooms, size, rent amount, fees). Don't add one, it would silently do nothing.

---

### Task 1: Add `addUnit`/`updateUnit`/`deleteUnit` to `landlordApi`

**Files:**
- Modify: `src/lib/landlord-api.ts`

- [ ] **Step 1: Add the three methods**

Open `src/lib/landlord-api.ts`. Find the existing `updateProperty` method (it sits right after `deleteProperty`):

```ts
  async updateProperty(
    id: string,
    patch: {
      name?: string;
      description?: string;
      images?: string[];
      videos?: string[];
      amenities?: string[];
      currentValue?: number;
    }
  ): Promise<Property> {
    const res = await api.put(`/properties/${id}`, patch);
    const data = unwrap(res.data);
    return ((data as { property?: Property }).property ?? data) as Property;
  },
```

Immediately after it, insert:

```ts

  async addUnit(
    propertyId: string,
    data: {
      unitNumber: string;
      bedrooms: number;
      bathrooms: number;
      size?: number;
      rentAmount: number;
      defaultFees?: UnitFees;
    }
  ): Promise<Unit> {
    const res = await api.post(`/properties/${propertyId}/units`, data);
    return unwrap(res.data) as Unit;
  },
  async updateUnit(
    propertyId: string,
    unitId: string,
    data: Partial<{
      unitNumber: string;
      bedrooms: number;
      bathrooms: number;
      size?: number;
      rentAmount: number;
      defaultFees?: UnitFees;
    }>
  ): Promise<Unit> {
    const res = await api.put(`/properties/${propertyId}/units/${unitId}`, data);
    return unwrap(res.data) as Unit;
  },
  async deleteUnit(propertyId: string, unitId: string): Promise<void> {
    await api.delete(`/properties/${propertyId}/units/${unitId}`);
  },
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json` (from the repo root)
Expected: no output (clean pass).

- [ ] **Step 3: Commit**

```bash
git add src/lib/landlord-api.ts
git commit -m "feat(properties): add addUnit/updateUnit/deleteUnit API wrappers"
```

---

### Task 2: Build the shared `UnitFormModal` component

**Files:**
- Create: `src/components/app/UnitFormModal.tsx`

- [ ] **Step 1: Write the component**

Create `src/components/app/UnitFormModal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { AxiosError } from "axios";
import { landlordApi, Unit, UnitFees } from "@/lib/landlord-api";
import { useToast } from "@/components/ui/Toast";

interface UnitFormModalProps {
  propertyId: string;
  mode: "add" | "edit";
  unit?: Unit;
  suggestedUnitNumber?: string;
  onClose: () => void;
  onSaved: () => void;
}

type FeeKey = Exclude<keyof UnitFees, "otherFeeDescription">;

const FEE_PAIRS: Array<[
  { key: FeeKey; label: string },
  { key: FeeKey; label: string }
]> = [
  [
    { key: "securityDeposit", label: "Security deposit" },
    { key: "cautionFee", label: "Caution fee" },
  ],
  [
    { key: "agentFee", label: "Agent fee" },
    { key: "agreementFee", label: "Agreement fee" },
  ],
  [
    { key: "legalFee", label: "Legal fee" },
    { key: "serviceCharge", label: "Service charge" },
  ],
];

export function UnitFormModal({
  propertyId,
  mode,
  unit,
  suggestedUnitNumber,
  onClose,
  onSaved,
}: UnitFormModalProps) {
  const toast = useToast();
  const [unitNumber, setUnitNumber] = useState(unit?.unitNumber ?? suggestedUnitNumber ?? "");
  const [bedrooms, setBedrooms] = useState(unit?.bedrooms ?? 1);
  const [bathrooms, setBathrooms] = useState(unit?.bathrooms ?? 1);
  const [size, setSize] = useState<number | undefined>(unit?.size);
  const [rentAmount, setRentAmount] = useState(unit?.rentAmount ?? 0);
  const [fees, setFees] = useState<UnitFees>(unit?.defaultFees ?? {});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function feeValue(key: FeeKey): string {
    const v = fees[key];
    return typeof v === "number" && v > 0 ? v.toLocaleString("en-NG") : "";
  }

  function setFee(key: FeeKey, raw: string) {
    const digits = raw.replace(/[^0-9]/g, "");
    setFees((prev) => ({ ...prev, [key]: digits === "" ? undefined : Number(digits) }));
  }

  async function handleSave() {
    if (!unitNumber.trim()) {
      setError("Unit number is required");
      return;
    }
    if (rentAmount <= 0) {
      setError("Rent amount must be greater than 0");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      unitNumber: unitNumber.trim(),
      bedrooms,
      bathrooms,
      size,
      rentAmount,
      defaultFees: fees,
    };
    try {
      if (mode === "add") {
        await landlordApi.addUnit(propertyId, payload);
        toast.success("Unit added");
      } else if (unit) {
        await landlordApi.updateUnit(propertyId, unit._id, payload);
        toast.success("Unit updated");
      }
      onSaved();
    } catch (err) {
      const axErr = err as AxiosError<{ message?: string }>;
      setError(
        axErr.response?.data?.message ??
          (err instanceof Error ? err.message : "Couldn't save this unit.")
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      onClick={() => !saving && onClose()}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-foundation-700/10 bg-paper shadow-[0_24px_60px_-30px_rgb(15_39_44_/_0.35)]"
      >
        <div className="flex items-center justify-between border-b border-foundation-700/10 px-6 py-4">
          <h2 className="font-display text-[16px] font-extrabold text-foundation-700">
            {mode === "add" ? "Add unit" : `Edit ${unit?.unitNumber ?? "unit"}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full p-1.5 text-ink-muted transition hover:bg-foundation-700/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          <Field label="Unit number">
            <Input value={unitNumber} onChange={setUnitNumber} placeholder="Flat 12" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Bedrooms">
              <Input
                type="number"
                value={String(bedrooms)}
                onChange={(v) => setBedrooms(Math.max(0, Number(v) || 0))}
              />
            </Field>
            <Field label="Bathrooms">
              <Input
                type="number"
                value={String(bathrooms)}
                onChange={(v) => setBathrooms(Math.max(0, Number(v) || 0))}
              />
            </Field>
          </div>
          <Field label="Size (m²)" optional>
            <Input
              type="number"
              value={size ? String(size) : ""}
              onChange={(v) => setSize(v ? Number(v) : undefined)}
            />
          </Field>
          <Field label="Rent (NGN)">
            <Input
              type="text"
              value={rentAmount > 0 ? rentAmount.toLocaleString("en-NG") : ""}
              onChange={(v) => {
                const digits = v.replace(/[^0-9]/g, "");
                setRentAmount(digits === "" ? 0 : Number(digits));
              }}
              placeholder="500,000"
            />
          </Field>

          <p className="pt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Default fees (optional)
          </p>
          {FEE_PAIRS.map(([a, b]) => (
            <div key={a.key} className="grid grid-cols-2 gap-3">
              <Field label={a.label}>
                <Input type="text" value={feeValue(a.key)} onChange={(v) => setFee(a.key, v)} placeholder="₦0" />
              </Field>
              <Field label={b.label}>
                <Input type="text" value={feeValue(b.key)} onChange={(v) => setFee(b.key, v)} placeholder="₦0" />
              </Field>
            </div>
          ))}
          <Field label="Other fee">
            <Input type="text" value={feeValue("otherFee")} onChange={(v) => setFee("otherFee", v)} placeholder="₦0" />
          </Field>
          {typeof fees.otherFee === "number" && fees.otherFee > 0 && (
            <Field label="Other fee description">
              <Input
                value={fees.otherFeeDescription ?? ""}
                onChange={(v) => setFees((prev) => ({ ...prev, otherFeeDescription: v }))}
                placeholder="What's this fee for?"
              />
            </Field>
          )}

          {error && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-foundation-700/10 px-6 py-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving…" : mode === "add" ? "Add unit" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  optional,
}: {
  label: string;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
        {label}
        {optional && (
          <span className="ml-1 normal-case tracking-normal text-[10px] text-ink-muted/70">
            (optional)
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "number";
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700 placeholder:text-ink-muted/60 focus:border-foundation-700/40 focus:outline-none focus:ring-2 focus:ring-foundation-700/10"
    />
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no output. If you see an error about `UnitFees` or `Unit` not exported from `landlord-api`, they already are (`export interface Unit`/`export interface UnitFees` near the top of that file), double check the import path `@/lib/landlord-api` resolves (check `tsconfig.json`'s `paths` for the `@/*` alias).

- [ ] **Step 3: Commit**

```bash
git add src/components/app/UnitFormModal.tsx
git commit -m "feat(properties): add shared UnitFormModal for add/edit unit"
```

---

### Task 3: Wire "Add unit" into the property detail page

**Files:**
- Modify: `src/app/app/properties/[id]/page.tsx`

- [ ] **Step 1: Update imports**

Find:

```tsx
import {
  ArrowLeft,
  MapPin,
  UserPlus,
  Receipt,
  FileText,
  Trash2,
  AlertTriangle,
} from "lucide-react";
```

Replace with:

```tsx
import {
  ArrowLeft,
  MapPin,
  UserPlus,
  Receipt,
  FileText,
  Trash2,
  AlertTriangle,
  Plus,
  Pencil,
} from "lucide-react";
```

Find:

```tsx
import { landlordApi, Unit } from "@/lib/landlord-api";
import { PropertyMediaCard } from "@/components/app/PropertyMedia";
import { useToast } from "@/components/ui/Toast";
```

Replace with:

```tsx
import { landlordApi, Unit } from "@/lib/landlord-api";
import { PropertyMediaCard } from "@/components/app/PropertyMedia";
import { UnitFormModal } from "@/components/app/UnitFormModal";
import { useToast } from "@/components/ui/Toast";
```

- [ ] **Step 2: Add state and the delete-unit mutation**

Find:

```tsx
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
```

Replace with:

```tsx
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [unitModal, setUnitModal] = useState<
    { mode: "add" } | { mode: "edit"; unit: Unit } | null
  >(null);
  const [unitToDelete, setUnitToDelete] = useState<Unit | null>(null);
```

Find the existing `deleteMut` block (property delete):

```tsx
  const deleteMut = useMutation({
    mutationFn: () => landlordApi.deleteProperty(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });
      toast.success("Property deleted");
      router.replace("/app/properties");
    },
    onError: (err) => {
      const axErr = err as AxiosError<{ message?: string }>;
      toast.error(
        axErr.response?.data?.message ??
          (err instanceof Error ? err.message : "Couldn't delete this property.")
      );
    },
  });
```

Immediately after it, insert:

```tsx

  const deleteUnitMut = useMutation({
    mutationFn: (unitId: string) => landlordApi.deleteUnit(id, unitId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["properties", id] });
      queryClient.invalidateQueries({ queryKey: ["properties"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });
      toast.success("Unit deleted");
      setUnitToDelete(null);
    },
    onError: (err) => {
      const axErr = err as AxiosError<{ message?: string }>;
      toast.error(
        axErr.response?.data?.message ??
          (err instanceof Error ? err.message : "Couldn't delete this unit.")
      );
    },
  });
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no output. (`UnitFormModal` is imported but not yet rendered, and `unitModal`/`unitToDelete` aren't read yet, TypeScript won't complain about unused state setters used elsewhere in the same file, but if your linter flags unused vars, that's expected until Task 4 finishes wiring the JSX. Don't worry about lint at this checkpoint, only `tsc` matters here.)

- [ ] **Step 4: Commit**

```bash
git add src/app/app/properties/[id]/page.tsx
git commit -m "feat(properties): add unit modal/delete state and mutation"
```

---

### Task 4: Render the "Add unit" button, per-row edit/delete icons, and the two modals

**Files:**
- Modify: `src/app/app/properties/[id]/page.tsx`

- [ ] **Step 1: Add the "Add unit" button to the Units section header**

Find:

```tsx
            <div className="mt-8">
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Units
              </h2>
              {units.length === 0 ? (
                <Card className="p-6 text-center text-[13px] text-ink-muted">
                  No units configured.
                </Card>
              ) : (
                <Card className="divide-y divide-foundation-700/10">
                  {units.map((u) => (
                    <UnitRow key={u._id} u={u} />
                  ))}
                </Card>
              )}
            </div>
```

Replace with:

```tsx
            <div className="mt-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Units
                </h2>
                <button
                  type="button"
                  onClick={() => setUnitModal({ mode: "add" })}
                  className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-3 py-1.5 text-[11.5px] font-semibold text-paper transition hover:bg-foundation-800"
                >
                  <Plus className="h-3.5 w-3.5" /> Add unit
                </button>
              </div>
              {units.length === 0 ? (
                <Card className="p-6 text-center text-[13px] text-ink-muted">
                  No units configured.
                </Card>
              ) : (
                <Card className="divide-y divide-foundation-700/10">
                  {units.map((u) => (
                    <UnitRow
                      key={u._id}
                      u={u}
                      onEdit={() => setUnitModal({ mode: "edit", unit: u })}
                      onDelete={() => setUnitToDelete(u)}
                    />
                  ))}
                </Card>
              )}
            </div>
```

- [ ] **Step 2: Render the two new modals**

Find the closing of the existing property-delete modal block, right before the final closing tags of the component:

```tsx
            <button
                type="button"
                onClick={() => deleteMut.mutate()}
                disabled={!nameMatches || deleteMut.isPending}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deleteMut.isPending ? "Deleting…" : "Delete property"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

Replace the tail (`</div>\n)}\n    </>\n  );\n}`) with:

```tsx
            <button
                type="button"
                onClick={() => deleteMut.mutate()}
                disabled={!nameMatches || deleteMut.isPending}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deleteMut.isPending ? "Deleting…" : "Delete property"}
              </button>
            </div>
          </div>
        </div>
      )}

      {unitModal && (
        <UnitFormModal
          propertyId={id}
          mode={unitModal.mode}
          unit={unitModal.mode === "edit" ? unitModal.unit : undefined}
          suggestedUnitNumber={unitModal.mode === "add" ? `Flat ${units.length + 1}` : undefined}
          onClose={() => setUnitModal(null)}
          onSaved={() => {
            queryClient.invalidateQueries({ queryKey: ["properties", id] });
            queryClient.invalidateQueries({ queryKey: ["properties"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });
            setUnitModal(null);
          }}
        />
      )}

      {unitToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => !deleteUnitMut.isPending && setUnitToDelete(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm overflow-hidden rounded-3xl border border-foundation-700/10 bg-paper shadow-[0_24px_60px_-30px_rgb(15_39_44_/_0.35)]"
          >
            <div className="flex items-start gap-3 px-6 pb-4 pt-6">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-100 text-red-700">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-[16px] font-extrabold leading-tight tracking-[-0.01em] text-foundation-700">
                  Delete {unitToDelete.unitNumber}?
                </h2>
                <p className="mt-1 text-[13px] leading-[1.55] text-ink-muted">
                  This can&apos;t be undone.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 px-6 pb-6 pt-2">
              <button
                type="button"
                onClick={() => setUnitToDelete(null)}
                disabled={deleteUnitMut.isPending}
                className="rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteUnitMut.mutate(unitToDelete._id)}
                disabled={deleteUnitMut.isPending}
                className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-[12.5px] font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deleteUnitMut.isPending ? "Deleting…" : "Delete unit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 3: Update `UnitRow` to accept and render edit/delete actions**

Find:

```tsx
function UnitRow({ u }: { u: Unit }) {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4">
```

Replace with:

```tsx
function UnitRow({
  u,
  onEdit,
  onDelete,
}: {
  u: Unit;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-4 p-4">
```

Find the end of `UnitRow` (the Assign/Invoice buttons, right before its closing tags):

```tsx
      {!u.isOccupied && (
        <Link
          href="/app/tenants/new"
          className="rounded-full border border-foundation-700/10 bg-paper px-3 py-1.5 text-[11.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
        >
          <UserPlus className="mr-1 inline h-3 w-3" /> Assign
        </Link>
      )}
      {u.isOccupied && (
        <Link
          href="/app/invoices/new"
          className="rounded-full border border-foundation-700/10 bg-paper px-3 py-1.5 text-[11.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
        >
          <Receipt className="mr-1 inline h-3 w-3" /> Invoice
        </Link>
      )}
    </div>
  );
}
```

Replace with:

```tsx
      {!u.isOccupied && (
        <Link
          href="/app/tenants/new"
          className="rounded-full border border-foundation-700/10 bg-paper px-3 py-1.5 text-[11.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
        >
          <UserPlus className="mr-1 inline h-3 w-3" /> Assign
        </Link>
      )}
      {u.isOccupied && (
        <Link
          href="/app/invoices/new"
          className="rounded-full border border-foundation-700/10 bg-paper px-3 py-1.5 text-[11.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
        >
          <Receipt className="mr-1 inline h-3 w-3" /> Invoice
        </Link>
      )}
      <button
        type="button"
        onClick={onEdit}
        title="Edit unit"
        aria-label="Edit unit"
        className="rounded-full border border-foundation-700/10 bg-paper p-1.5 text-foundation-700 transition hover:bg-foundation-700/5"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={u.isOccupied}
        title={u.isOccupied ? "Move out the tenant before deleting this unit" : "Delete unit"}
        aria-label="Delete unit"
        className="rounded-full border border-foundation-700/10 bg-paper p-1.5 text-ink-muted transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no output (clean pass).

- [ ] **Step 5: Manual browser verification**

Run: `npm run dev`, then in a browser at `http://localhost:3000/app/properties/<propertyId>` (logged in as a landlord who owns that property):
1. Click "Add unit", fill in the form, save, confirm the new unit appears in the list in the right numeric position (natural sort from the earlier backend fix).
2. Click the pencil icon on a unit, change its rent, save, confirm the row updates.
3. Click the trash icon on an occupied unit, confirm it's disabled with a tooltip.
4. Click the trash icon on a vacant unit, confirm the lightweight confirm dialog, confirm it deletes and disappears from the list.

- [ ] **Step 6: Commit**

```bash
git add src/app/app/properties/[id]/page.tsx
git commit -m "feat(properties): wire up add/edit/delete unit UI on the detail page"
```

---

### Task 5: Push and open a PR to `main`

**Files:** none (git operations only)

- [ ] **Step 1: Push the branch**

```bash
git push -u origin feat/unit-crud-web
```

- [ ] **Step 2: Open a PR**

```bash
gh pr create --repo apcexchange/property360-web --base main --head feat/unit-crud-web \
  --title "feat(properties): add/edit/delete unit on the property detail page" \
  --body "Adds an Add unit button, per-row edit/delete actions, and the matching UnitFormModal. Requires the backend PUT/DELETE /:id/units/:unitId endpoints (see the unit-crud-backend plan). See docs/superpowers/specs/2026-08-03-unit-add-edit-delete-design.md."
```

If `gh` isn't authenticated, push prints a compare URL like `https://github.com/apcexchange/property360-web/pull/new/feat/unit-crud-web`, open that manually.
