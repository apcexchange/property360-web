"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { AxiosError } from "axios";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  ErrorBox,
  Skeleton,
  formatNgn,
} from "@/components/app/ui";
import { landlordApi } from "@/lib/landlord-api";

interface LineDraft {
  description: string;
  quantity: number;
  rate: number;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const tenantsQ = useQuery({
    queryKey: ["tenants", "occupied-units"],
    queryFn: () => landlordApi.getOccupiedUnits(),
  });

  const [leaseId, setLeaseId] = useState("");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([
    { description: "Rent", quantity: 1, rate: 0 },
  ]);

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.quantity * l.rate, 0),
    [lines]
  );

  const create = useMutation({
    mutationFn: () =>
      landlordApi.createInvoice({
        leaseId,
        lineItems: lines.map((l) => ({
          description: l.description.trim(),
          quantity: l.quantity,
          rate: l.rate,
        })),
        dueDate,
        notes: notes.trim() || undefined,
      }),
    onSuccess: (inv) => {
      router.push(`/app/invoices/${inv._id}`);
    },
  });

  const formError = (() => {
    if (!create.isError) return null;
    const err = create.error as AxiosError<{ message?: string }>;
    return err.response?.data?.message ?? (err as Error).message;
  })();

  const canSubmit =
    !!leaseId &&
    lines.length > 0 &&
    lines.every(
      (l) => l.description.trim().length > 0 && l.quantity > 0 && l.rate > 0
    );

  // Tenants in occupied units may not all have leases, only show those that do.
  const tenantOptions =
    tenantsQ.data
      ?.filter((r) => r.lease)
      .map((r) => ({
        value: r.lease!.id,
        label: `${r.tenant.firstName} ${r.tenant.lastName}, ${r.property.name}, Unit ${r.unit.unitNumber}`,
      })) ?? [];

  return (
    <>
      <AppTopbar
        title="New invoice"
        subtitle="Bill a tenant for rent, fees, or anything else"
        actions={
          <Link
            href="/app/invoices"
            className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        }
      />
      <PageContainer>
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) create.mutate();
          }}
        >
          <Card className="space-y-5 p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Tenant
            </h2>
            {tenantsQ.isLoading ? (
              <Skeleton className="h-10 w-full rounded-xl" />
            ) : tenantOptions.length === 0 ? (
              <p className="text-[13px] text-ink-muted">
                No tenants with active leases.{" "}
                <Link
                  href="/app/tenants/new"
                  className="font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4"
                >
                  Add a tenant first
                </Link>
                .
              </p>
            ) : (
              <Field label="Lease">
                <Select
                  value={leaseId}
                  onChange={setLeaseId}
                  options={[
                    { value: "", label: "Choose a tenant / lease" },
                    ...tenantOptions,
                  ]}
                />
              </Field>
            )}
            <Field label="Due date">
              <Input value={dueDate} onChange={setDueDate} type="date" />
            </Field>
          </Card>

          <Card className="space-y-5 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Line items
              </h2>
              <button
                type="button"
                onClick={() =>
                  setLines((p) => [
                    ...p,
                    { description: "", quantity: 1, rate: 0 },
                  ])
                }
                className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-3 py-1.5 text-[11.5px] font-semibold text-paper transition hover:bg-foundation-800"
              >
                <Plus className="h-3.5 w-3.5" /> Add line
              </button>
            </div>

            <div className="space-y-3">
              {lines.map((l, idx) => (
                <div
                  key={idx}
                  className="grid items-start gap-3 rounded-2xl border border-foundation-700/10 p-3 sm:grid-cols-[1fr_90px_140px_auto]"
                >
                  <Field label="Description">
                    <Input
                      value={l.description}
                      onChange={(v) =>
                        setLines((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, description: v } : x
                          )
                        )
                      }
                    />
                  </Field>
                  <Field label="Qty">
                    <Input
                      type="number"
                      value={String(l.quantity)}
                      onChange={(v) =>
                        setLines((prev) =>
                          prev.map((x, i) =>
                            i === idx
                              ? { ...x, quantity: Math.max(0, Number(v) || 0) }
                              : x
                          )
                        )
                      }
                    />
                  </Field>
                  <Field label="Rate (NGN)">
                    <Input
                      type="number"
                      value={String(l.rate)}
                      onChange={(v) =>
                        setLines((prev) =>
                          prev.map((x, i) =>
                            i === idx
                              ? { ...x, rate: Math.max(0, Number(v) || 0) }
                              : x
                          )
                        )
                      }
                    />
                  </Field>
                  <div className="self-end sm:pb-1">
                    {lines.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setLines((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className="rounded-full p-2 text-ink-muted transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-end border-t border-foundation-700/10 pt-4">
              <div className="text-right">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Total
                </p>
                <p className="mt-1 font-display text-[24px] font-extrabold text-foundation-700">
                  {formatNgn(subtotal)}
                </p>
              </div>
            </div>
          </Card>

          <Card className="space-y-3 p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Notes
            </h2>
            <Textarea
              value={notes}
              onChange={setNotes}
              placeholder="Anything the tenant should know."
            />
          </Card>

          {formError && <ErrorBox message={formError} />}

          <div className="flex items-center justify-end gap-3">
            <Link
              href="/app/invoices"
              className="rounded-full border border-foundation-700/15 bg-paper px-5 py-2.5 text-[13px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!canSubmit || create.isPending}
              className="rounded-full bg-foundation-700 px-6 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
            >
              {create.isPending ? "Creating…" : "Create invoice"}
            </button>
          </div>
        </form>
      </PageContainer>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "number" | "date";
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700 focus:border-foundation-700/40 focus:outline-none focus:ring-2 focus:ring-foundation-700/10"
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={3}
      className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700 placeholder:text-ink-muted/60 focus:border-foundation-700/40 focus:outline-none focus:ring-2 focus:ring-foundation-700/10"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700 focus:border-foundation-700/40 focus:outline-none focus:ring-2 focus:ring-foundation-700/10"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
