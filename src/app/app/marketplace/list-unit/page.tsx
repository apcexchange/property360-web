"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Globe2, ShieldCheck } from "lucide-react";
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

export default function ListUnitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const properties = useQuery({
    queryKey: ["properties"],
    queryFn: () => landlordApi.listProperties(),
  });

  const [propertyId, setPropertyId] = useState(() => searchParams.get("propertyId") ?? "");
  const [unitId, setUnitId] = useState(() => searchParams.get("unitId") ?? "");
  const [description, setDescription] = useState("");

  const vacant = useQuery({
    queryKey: ["listable-units", propertyId],
    queryFn: () => landlordApi.getListableUnits(propertyId),
    enabled: !!propertyId,
  });

  const list = useMutation({
    mutationFn: () =>
      landlordApi.listUnit(unitId, {
        description: description.trim() || undefined,
        visibility: "public",
      }),
    onSuccess: () => router.push("/app/marketplace"),
  });

  const formError = (() => {
    if (!list.isError) return null;
    const err = list.error as AxiosError<{ message?: string }>;
    return err.response?.data?.message ?? (err as Error).message;
  })();

  return (
    <>
      <AppTopbar
        title="List a unit"
        subtitle="Make a vacant unit visible on the Property360 marketplace"
        actions={
          <Link
            href="/app/marketplace"
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
            if (unitId) list.mutate();
          }}
        >
          <Card className="space-y-5 p-5">
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700">
                <Globe2 className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[13px] font-semibold text-foundation-700">
                  Publish a vacant unit, including one you manage for a landlord
                </p>
                <p className="mt-1 text-[12.5px] leading-5 text-ink-muted">
                  Only the selected vacant unit becomes public. Existing tenants, leases, and rent records remain private.
                </p>
              </div>
            </div>
            {properties.isLoading ? (
              <Skeleton className="h-10 w-full rounded-xl" />
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
                      ...(properties.data ?? []).map((p) => ({
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
                      ...(vacant.data ?? []).map((u) => ({
                        value: u._id,
                        label: `Unit ${u.unitNumber} · ${formatNgn(u.rentAmount)}/${u.rentPeriod ?? "annually"}`,
                      })),
                    ]}
                  />
                </Field>
                {propertyId && (vacant.data?.length ?? 0) === 0 && !vacant.isLoading && (
                  <p className="text-[12.5px] text-ink-muted">
                    No vacant units in this property.
                  </p>
                )}
              </>
            )}
          </Card>

          <Card className="space-y-3 p-5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Description (optional)
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What makes this unit appealing? Public-facing copy for the listing page."
              className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700"
            />
          </Card>

          <p className="flex items-center gap-2 text-[12px] text-ink-muted">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-700" />
            New listings are reviewed before they appear in public search.
          </p>

          {formError && <ErrorBox message={formError} />}

          <div className="flex items-center justify-end gap-3">
            <Link
              href="/app/marketplace"
              className="rounded-full border border-foundation-700/15 bg-paper px-5 py-2.5 text-[13px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!unitId || list.isPending}
              className="rounded-full bg-foundation-700 px-6 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
            >
              {list.isPending ? "Listing…" : "Publish listing"}
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
      className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
