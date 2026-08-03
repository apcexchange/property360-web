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
