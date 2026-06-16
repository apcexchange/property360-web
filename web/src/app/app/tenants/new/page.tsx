"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AxiosError } from "axios";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  ErrorBox,
  Skeleton,
  formatNgn,
} from "@/components/app/ui";
import { landlordApi, PaymentFrequency } from "@/lib/landlord-api";
import { useToast } from "@/components/ui/Toast";

// Lease end date defaults to one billing period after the start date, keyed
// off the payment frequency. It's auto-filled whenever the start date or
// frequency changes, but the field stays editable so a landlord can set a
// custom term.
function endDateForFrequency(
  startIso: string,
  frequency: PaymentFrequency
): string {
  const d = new Date(startIso);
  if (Number.isNaN(d.getTime())) return startIso;
  const day = d.getDate();
  if (frequency === "monthly") d.setMonth(d.getMonth() + 1);
  else if (frequency === "quarterly") d.setMonth(d.getMonth() + 3);
  else d.setFullYear(d.getFullYear() + 1); // annually
  // Guard month-length rollover (e.g. Jan 31 + 1mo would land on Mar 3):
  // if the day-of-month drifted, snap back to the last day of the intended
  // month.
  if (d.getDate() !== day) d.setDate(0);
  return d.toISOString().slice(0, 10);
}

export default function NewTenantPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToast();
  const properties = useQuery({
    queryKey: ["properties"],
    queryFn: () => landlordApi.listProperties(),
  });

  const [propertyId, setPropertyId] = useState<string>("");
  const [unitId, setUnitId] = useState<string>("");

  const vacantUnits = useQuery({
    queryKey: ["vacant-units", propertyId],
    queryFn: () => landlordApi.getVacantUnits(propertyId),
    enabled: !!propertyId,
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [leaseStartDate, setLeaseStartDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [leaseEndDate, setLeaseEndDate] = useState(() =>
    endDateForFrequency(new Date().toISOString().slice(0, 10), "annually")
  );
  const [rentAmount, setRentAmount] = useState(0);
  const [paymentFrequency, setPaymentFrequency] =
    useState<PaymentFrequency>("annually");

  // When the chosen unit changes, prefill rent from the unit.
  useEffect(() => {
    const u = vacantUnits.data?.find((x) => x._id === unitId);
    if (u) setRentAmount(u.rentAmount);
  }, [unitId, vacantUnits.data]);

  const assign = useMutation({
    mutationFn: () =>
      landlordApi.assignTenant(unitId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        leaseStartDate,
        leaseEndDate,
        rentAmount,
        paymentFrequency,
      }),
    onSuccess: () => {
      // Refresh the tenants list (incl. pending) and the now-reserved unit so
      // the just-invited tenant shows immediately as "Invitation sent".
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["vacant-units"] });
      toast.success(
        "Invitation sent — the tenant appears as pending until they accept."
      );
      router.push("/app/tenants");
    },
  });

  const formError = (() => {
    if (!assign.isError) return null;
    const err = assign.error as AxiosError<{ message?: string }>;
    return err.response?.data?.message ?? (err as Error).message;
  })();

  const canSubmit =
    !!propertyId &&
    !!unitId &&
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    /\S+@\S+\.\S+/.test(email.trim()) &&
    phone.trim().length > 0 &&
    rentAmount > 0;

  return (
    <>
      <AppTopbar
        title="Add tenant"
        subtitle="Assign a tenant to a vacant unit and start a lease"
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
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSubmit) assign.mutate();
          }}
        >
          <Card className="space-y-5 p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Unit
            </h2>
            {properties.isLoading ? (
              <Skeleton className="h-10 w-full rounded-xl" />
            ) : (properties.data ?? []).length === 0 ? (
              <p className="text-[13px] text-ink-muted">
                You don&apos;t have any properties yet.{" "}
                <Link
                  href="/app/properties/new"
                  className="font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4"
                >
                  Add one first
                </Link>
                .
              </p>
            ) : (
              <>
                <Field label="Property">
                  <Select
                    value={propertyId}
                    onChange={(v) => {
                      setPropertyId(v);
                      setUnitId("");
                    }}
                    options={[
                      { value: "", label: "Choose a property" },
                      ...properties.data!.map((p) => ({
                        value: p._id,
                        label: p.name,
                      })),
                    ]}
                  />
                </Field>
                <Field label="Vacant unit">
                  <Select
                    value={unitId}
                    onChange={setUnitId}
                    options={[
                      { value: "", label: propertyId ? "Choose a unit" : "Pick a property first" },
                      ...(vacantUnits.data ?? []).map((u) => ({
                        value: u._id,
                        label: `Unit ${u.unitNumber} · ${formatNgn(u.rentAmount)}/${u.rentPeriod ?? "year"}`,
                      })),
                    ]}
                  />
                </Field>
                {propertyId && (vacantUnits.data?.length ?? 0) === 0 && !vacantUnits.isLoading && (
                  <p className="text-[12.5px] text-ink-muted">
                    No vacant units in this property.
                  </p>
                )}
              </>
            )}
          </Card>

          <Card className="space-y-5 p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Tenant
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="First name">
                <Input value={firstName} onChange={setFirstName} />
              </Field>
              <Field label="Last name">
                <Input value={lastName} onChange={setLastName} />
              </Field>
              <Field label="Email">
                <Input value={email} onChange={setEmail} type="email" />
              </Field>
              <Field label="Phone">
                <Input
                  value={phone}
                  onChange={setPhone}
                  placeholder="+234..."
                />
              </Field>
            </div>
          </Card>

          <Card className="space-y-5 p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Lease
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Start date">
                <Input
                  value={leaseStartDate}
                  onChange={(v) => {
                    setLeaseStartDate(v);
                    setLeaseEndDate(endDateForFrequency(v, paymentFrequency));
                  }}
                  type="date"
                />
              </Field>
              <Field label="End date">
                <Input
                  value={leaseEndDate}
                  onChange={setLeaseEndDate}
                  type="date"
                />
              </Field>
              <Field label="Rent (NGN)">
                <Input
                  value={rentAmount > 0 ? rentAmount.toLocaleString("en-NG") : ""}
                  onChange={(v) => {
                    const digits = v.replace(/[^0-9]/g, "");
                    setRentAmount(digits === "" ? 0 : Number(digits));
                  }}
                  type="text"
                  placeholder="500,000"
                />
              </Field>
              <Field label="Payment frequency">
                <Select
                  value={paymentFrequency}
                  onChange={(v) => {
                    const freq = v as PaymentFrequency;
                    setPaymentFrequency(freq);
                    setLeaseEndDate(
                      endDateForFrequency(leaseStartDate, freq)
                    );
                  }}
                  options={[
                    { value: "annually", label: "Annually" },
                    { value: "quarterly", label: "Quarterly" },
                    { value: "monthly", label: "Monthly" },
                  ]}
                />
              </Field>
            </div>
          </Card>

          {formError && <ErrorBox message={formError} />}

          <div className="flex items-center justify-end gap-3">
            <Link
              href="/app/tenants"
              className="rounded-full border border-foundation-700/15 bg-paper px-5 py-2.5 text-[13px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!canSubmit || assign.isPending}
              className="rounded-full bg-foundation-700 px-6 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
            >
              {assign.isPending ? "Assigning…" : "Assign tenant"}
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
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: "text" | "number" | "email" | "date";
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
