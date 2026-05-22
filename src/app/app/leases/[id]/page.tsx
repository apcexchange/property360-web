"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  RefreshCw,
  Receipt,
  ShieldCheck,
  PhoneCall,
  Plus,
} from "lucide-react";
import { AxiosError } from "axios";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  Skeleton,
  ErrorBox,
  StatusPill,
  formatNgn,
  formatDate,
} from "@/components/app/ui";
import {
  landlordApi,
  EmergencyContact,
  Guarantor,
  LeasePayment,
} from "@/lib/landlord-api";
import { PageErrorBoundary } from "@/components/app/PageErrorBoundary";
import { NIGERIA_STATES } from "@/lib/nigeria-locations";

export default function LeaseDetailPage() {
  return (
    <PageErrorBoundary name="Lease detail">
      <LeaseDetailInner />
    </PageErrorBoundary>
  );
}

function LeaseDetailInner() {
  const { id } = useParams<{ id: string }>();

  // Lease detail isn't a standalone endpoint — we surface lease info from the
  // occupied-units list (same endpoint /app/tenants uses).
  const occupied = useQuery({
    queryKey: ["tenants", "occupied-units"],
    queryFn: () => landlordApi.getOccupiedUnits(),
  });
  const row = occupied.data?.find((r) => r.lease?.id === id);
  const lease = row?.lease ?? null;

  const payments = useQuery({
    queryKey: ["lease-payments", id],
    queryFn: () => landlordApi.leasePayments(id) as Promise<LeasePayment[]>,
    enabled: !!id,
  });
  const guarantor = useQuery({
    queryKey: ["guarantor", id],
    queryFn: () => landlordApi.getGuarantor(id),
    enabled: !!id,
  });
  const emergency = useQuery({
    queryKey: ["emergency-contacts", id],
    queryFn: () => landlordApi.getEmergencyContacts(id),
    enabled: !!id,
  });

  // Defensive: a populated ref can be null when the underlying doc was
  // soft-deleted. Fall back to safe placeholders instead of throwing.
  const tenantName = row?.tenant
    ? `${row.tenant.firstName ?? ""} ${row.tenant.lastName ?? ""}`.trim() ||
      "Tenant"
    : "Lease";
  const propertyLabel = row
    ? [row.property?.name, row.unit?.unitNumber && `Unit ${row.unit.unitNumber}`]
        .filter(Boolean)
        .join(" · ") || undefined
    : undefined;

  return (
    <>
      <AppTopbar
        title={tenantName}
        subtitle={propertyLabel}
        actions={
          <Link
            href="/app/tenants"
            className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/10 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
        }
      />
      <PageContainer>
        {occupied.isLoading ? (
          <Card className="p-5">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="mt-3 h-4 w-2/3" />
          </Card>
        ) : !lease ? (
          <ErrorBox message="Lease not found." />
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="p-5 lg:col-span-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                      Lease
                    </p>
                    <p className="mt-2 font-display text-[26px] font-extrabold text-foundation-700">
                      {formatNgn(lease.rentAmount)}
                      <span className="ml-1 text-[14px] font-normal text-ink-muted">
                        /{lease.paymentFrequency}
                      </span>
                    </p>
                    <p className="mt-1 text-[12.5px] text-ink-muted">
                      {formatDate(lease.startDate)} →{" "}
                      {formatDate(lease.endDate)}
                    </p>
                  </div>
                  <StatusPill
                    label={lease.status}
                    tone={
                      lease.status === "active"
                        ? "good"
                        : lease.status === "expired"
                        ? "warn"
                        : lease.status === "terminated"
                        ? "bad"
                        : "info"
                    }
                  />
                </div>
              </Card>
              <div className="space-y-3">
                <Link
                  href={`/app/leases/${id}/renew`}
                  className="flex items-start gap-3 rounded-2xl border border-foundation-700/10 bg-paper p-4 transition hover:border-foundation-700/20"
                >
                  <RefreshCw className="mt-0.5 h-4 w-4 text-foundation-700" />
                  <div>
                    <p className="text-[13px] font-semibold text-foundation-700">
                      Renew lease
                    </p>
                    <p className="text-[11.5px] text-ink-muted">
                      Extend the lease window
                    </p>
                  </div>
                </Link>
                <Link
                  href={`/app/leases/${id}/payments/new`}
                  className="flex items-start gap-3 rounded-2xl border border-foundation-700/10 bg-paper p-4 transition hover:border-foundation-700/20"
                >
                  <Receipt className="mt-0.5 h-4 w-4 text-foundation-700" />
                  <div>
                    <p className="text-[13px] font-semibold text-foundation-700">
                      Record payment
                    </p>
                    <p className="text-[11.5px] text-ink-muted">
                      Cash, transfer, or Paystack
                    </p>
                  </div>
                </Link>
                <Link
                  href={`/app/leases/${id}/agreements`}
                  className="flex items-start gap-3 rounded-2xl border border-foundation-700/10 bg-paper p-4 transition hover:border-foundation-700/20"
                >
                  <ShieldCheck className="mt-0.5 h-4 w-4 text-foundation-700" />
                  <div>
                    <p className="text-[13px] font-semibold text-foundation-700">
                      Tenancy agreements
                    </p>
                    <p className="text-[11.5px] text-ink-muted">
                      Upload, view, send for signing
                    </p>
                  </div>
                </Link>
              </div>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <PaymentHistorySection
                payments={payments.data}
                loading={payments.isLoading}
                errorMessage={
                  payments.isError
                    ? (payments.error as Error)?.message ?? "Couldn't load payments"
                    : null
                }
              />
              <ContactsSection
                guarantor={guarantor.data ?? null}
                emergency={emergency.data ?? []}
                leaseId={id}
              />
            </div>
          </>
        )}
      </PageContainer>
    </>
  );
}

function PaymentHistorySection({
  payments,
  loading,
  errorMessage,
}: {
  payments?: LeasePayment[];
  loading: boolean;
  errorMessage?: string | null;
}) {
  // Defensive: backend usually returns an array, but if the response
  // shape ever drifts we never want this to throw during render.
  const list: LeasePayment[] = Array.isArray(payments)
    ? payments.filter(Boolean)
    : [];

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-foundation-700/10 px-5 py-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          Payment history
        </h2>
      </div>
      {errorMessage ? (
        <p className="p-5 text-[13px] text-red-700">{errorMessage}</p>
      ) : loading ? (
        <div className="space-y-2 p-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className="p-5 text-[13px] text-ink-muted">No payments recorded yet.</p>
      ) : (
        <ul className="divide-y divide-foundation-700/10">
          {list.map((p, i) => {
            const methodText =
              typeof p.paymentMethod === "string"
                ? p.paymentMethod.replace(/_/g, " ")
                : "—";
            return (
              <li
                key={p._id ?? i}
                className="flex items-center justify-between gap-3 px-5 py-3"
              >
                <div>
                  <p className="text-[13.5px] font-semibold text-foundation-700">
                    {formatNgn(p.amount ?? 0)}
                  </p>
                  <p className="text-[11.5px] text-ink-muted">
                    {formatDate(p.paymentDate)} · {methodText}
                    {p.reference && ` · ${p.reference}`}
                  </p>
                </div>
                {p.notes && (
                  <p className="max-w-[40%] truncate text-[11.5px] text-ink-muted">
                    {p.notes}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function ContactsSection({
  guarantor,
  emergency,
  leaseId,
}: {
  guarantor: Guarantor | null;
  emergency: EmergencyContact[];
  leaseId: string;
}) {
  const [editing, setEditing] = useState(false);
  const qc = useQueryClient();
  const setG = useMutation({
    mutationFn: (g: Guarantor) => landlordApi.setGuarantor(leaseId, g),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guarantor", leaseId] });
      setEditing(false);
    },
  });
  const addE = useMutation({
    mutationFn: (e: EmergencyContact) =>
      landlordApi.addEmergencyContact(leaseId, e),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emergency-contacts", leaseId] }),
  });

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex items-center justify-between border-b border-foundation-700/10 px-5 py-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Guarantor
          </h2>
          {!editing && (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="text-[12px] font-semibold text-foundation-700 hover:underline"
            >
              {guarantor ? "Edit" : "Add"}
            </button>
          )}
        </div>
        {editing ? (
          <GuarantorForm
            initial={guarantor}
            onSubmit={(g) => setG.mutate(g)}
            onCancel={() => setEditing(false)}
            saving={setG.isPending}
          />
        ) : guarantor ? (
          (() => {
            const addressLine = [
              guarantor.address?.street,
              guarantor.address?.city,
              guarantor.address?.state,
            ]
              .filter(Boolean)
              .join(", ");
            const idTypeLabel: Record<string, string> = {
              nin: "NIN",
              drivers: "Driver's licence",
              passport: "International passport",
              voters: "Voter's card",
            };
            const idLine =
              guarantor.idType && guarantor.idNumber
                ? `${idTypeLabel[guarantor.idType] ?? guarantor.idType}: ${
                    guarantor.idNumber
                  }`
                : null;
            return (
              <div className="space-y-1 p-5 text-[13px] text-foundation-700">
                <p className="font-semibold">
                  {guarantor.firstName} {guarantor.lastName}
                </p>
                <p className="text-ink-muted">
                  {guarantor.relationship} · {guarantor.phone}
                </p>
                {guarantor.email && (
                  <p className="text-ink-muted">{guarantor.email}</p>
                )}
                {guarantor.occupation && (
                  <p className="text-ink-muted">{guarantor.occupation}</p>
                )}
                {addressLine && (
                  <p className="text-ink-muted">{addressLine}</p>
                )}
                {idLine && <p className="text-ink-muted">{idLine}</p>}
              </div>
            );
          })()
        ) : (
          <p className="p-5 text-[13px] text-ink-muted">No guarantor on file.</p>
        )}
      </Card>

      <Card>
        <div className="flex items-center justify-between border-b border-foundation-700/10 px-5 py-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Emergency contacts
          </h2>
          <AddEmergencyButton
            onSubmit={(e) => addE.mutate(e)}
            saving={addE.isPending}
          />
        </div>
        {emergency.length === 0 ? (
          <p className="p-5 text-[13px] text-ink-muted">
            No emergency contacts.
          </p>
        ) : (
          <ul className="divide-y divide-foundation-700/10">
            {emergency.map((e, i) => (
              <li key={i} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-[13.5px] font-semibold text-foundation-700">
                    {e.firstName} {e.lastName}
                  </p>
                  <p className="text-[11.5px] text-ink-muted">
                    {e.relationship} · {e.phone}
                  </p>
                </div>
                <PhoneCall className="h-4 w-4 text-ink-muted" />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function GuarantorForm({
  initial,
  onSubmit,
  onCancel,
  saving,
}: {
  initial: Guarantor | null;
  onSubmit: (g: Guarantor) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [g, setG] = useState<Guarantor>(
    initial ?? {
      firstName: "",
      lastName: "",
      phone: "",
      relationship: "",
      email: "",
      occupation: "",
      address: { street: "", city: "", state: "" },
      idType: undefined,
      idNumber: "",
    }
  );
  const canSubmit =
    g.firstName.trim() &&
    g.lastName.trim() &&
    g.phone.trim() &&
    g.relationship.trim();
  const addr = g.address ?? {};
  const stateCities =
    NIGERIA_STATES.find((s) => s.name === addr.state)?.cities ?? [];

  return (
    <form
      className="space-y-3 p-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit(g);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <SmallField label="First name">
          <SmallInput value={g.firstName} onChange={(v) => setG({ ...g, firstName: v })} />
        </SmallField>
        <SmallField label="Last name">
          <SmallInput value={g.lastName} onChange={(v) => setG({ ...g, lastName: v })} />
        </SmallField>
        <SmallField label="Phone">
          <SmallInput value={g.phone} onChange={(v) => setG({ ...g, phone: v })} />
        </SmallField>
        <SmallField label="Relationship">
          <SmallInput
            value={g.relationship}
            onChange={(v) => setG({ ...g, relationship: v })}
          />
        </SmallField>
        <SmallField label="Email">
          <SmallInput value={g.email ?? ""} onChange={(v) => setG({ ...g, email: v })} />
        </SmallField>
        <SmallField label="Occupation">
          <SmallInput
            value={g.occupation ?? ""}
            onChange={(v) => setG({ ...g, occupation: v })}
          />
        </SmallField>
        <SmallField label="ID type">
          <SmallSelect
            value={g.idType ?? ""}
            onChange={(v) =>
              setG({
                ...g,
                idType: (v || undefined) as Guarantor["idType"],
              })
            }
            options={[
              { value: "", label: "—" },
              { value: "nin", label: "NIN" },
              { value: "drivers", label: "Driver's licence" },
              { value: "passport", label: "International passport" },
              { value: "voters", label: "Voter's card" },
            ]}
          />
        </SmallField>
        <SmallField label="ID number">
          <SmallInput
            value={g.idNumber ?? ""}
            onChange={(v) => setG({ ...g, idNumber: v })}
          />
        </SmallField>
        <SmallField label="Street">
          <SmallInput
            value={addr.street ?? ""}
            onChange={(v) =>
              setG({ ...g, address: { ...addr, street: v } })
            }
          />
        </SmallField>
        <SmallField label="State">
          <SmallSelect
            value={addr.state ?? ""}
            onChange={(v) =>
              // Clear the city when the state changes so a stale value
              // from the previous state can't slip through.
              setG({
                ...g,
                address: { ...addr, state: v, city: "" },
              })
            }
            options={[
              { value: "", label: "—" },
              ...NIGERIA_STATES.map((s) => ({ value: s.name, label: s.name })),
            ]}
          />
        </SmallField>
        <SmallField label="City">
          <SmallSelect
            value={addr.city ?? ""}
            onChange={(v) =>
              setG({ ...g, address: { ...addr, city: v } })
            }
            disabled={!addr.state}
            options={[
              { value: "", label: addr.state ? "—" : "Pick a state first" },
              ...stateCities.map((c) => ({ value: c, label: c })),
            ]}
          />
        </SmallField>
      </div>
      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-foundation-700/15 px-3 py-1.5 text-[12px] font-semibold text-foundation-700 hover:bg-foundation-700/5"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit || saving}
          className="rounded-full bg-foundation-700 px-4 py-1.5 text-[12px] font-semibold text-paper hover:bg-foundation-800 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}

function AddEmergencyButton({
  onSubmit,
  saving,
}: {
  onSubmit: (e: EmergencyContact) => void;
  saving: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [c, setC] = useState<EmergencyContact>({
    firstName: "",
    lastName: "",
    phone: "",
    relationship: "",
  });

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[12px] font-semibold text-foundation-700 hover:underline"
      >
        <Plus className="h-3 w-3" /> Add
      </button>
    );

  const canSubmit =
    c.firstName.trim() &&
    c.lastName.trim() &&
    c.phone.trim() &&
    c.relationship.trim();

  return (
    <div className="w-full border-t border-foundation-700/10 px-5 py-4">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (canSubmit) {
            onSubmit(c);
            setC({ firstName: "", lastName: "", phone: "", relationship: "" });
            setOpen(false);
          }
        }}
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <SmallField label="First name">
            <SmallInput value={c.firstName} onChange={(v) => setC({ ...c, firstName: v })} />
          </SmallField>
          <SmallField label="Last name">
            <SmallInput value={c.lastName} onChange={(v) => setC({ ...c, lastName: v })} />
          </SmallField>
          <SmallField label="Phone">
            <SmallInput value={c.phone} onChange={(v) => setC({ ...c, phone: v })} />
          </SmallField>
          <SmallField label="Relationship">
            <SmallInput
              value={c.relationship}
              onChange={(v) => setC({ ...c, relationship: v })}
            />
          </SmallField>
        </div>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full border border-foundation-700/15 px-3 py-1.5 text-[12px] font-semibold text-foundation-700 hover:bg-foundation-700/5"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || saving}
            className="rounded-full bg-foundation-700 px-4 py-1.5 text-[12px] font-semibold text-paper hover:bg-foundation-800 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Add"}
          </button>
        </div>
      </form>
    </div>
  );
}

function SmallField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

function SmallInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-foundation-700/15 bg-paper px-3 py-2 text-[13px] text-foundation-700"
    />
  );
}

function SmallSelect({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full rounded-lg border border-foundation-700/15 bg-paper px-3 py-2 text-[13px] text-foundation-700 disabled:bg-foundation-700/5 disabled:text-ink-muted"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

