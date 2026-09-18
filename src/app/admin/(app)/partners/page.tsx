"use client";

import { useState } from "react";
import Link from "next/link";
import { AxiosError } from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Topbar } from "@/components/admin/Topbar";
import { DataTable, StatusBadge } from "@/components/admin/DataTable";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { Button } from "@/components/admin/ui/Filters";
import adminApi, { AdminPartnerRow } from "@/lib/admin";
import { formatNgn } from "@/lib/format";

export default function AdminPartnersPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "partners"],
    queryFn: () => adminApi.listPartnerCodes(),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "disabled" }) =>
      adminApi.setPartnerStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "partners"] }),
  });

  const del = useMutation({
    mutationFn: (id: string) => adminApi.deletePartner(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "partners"] }),
  });

  const confirmDelete = (r: AdminPartnerRow) => {
    const history = r.paidConversions
      ? ` It has ${r.paidConversions} paid conversion(s) totalling ${formatNgn(
          r.totalEarned
        )} of commission history, which will be permanently deleted.`
      : "";
    if (
      window.confirm(
        `Delete partner code "${r.code}"?${history} Money already paid into the partner's wallet is NOT refunded. This cannot be undone.`
      )
    ) {
      del.mutate(r._id);
    }
  };

  return (
    <>
      <Topbar />
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <PageHeader
            title="Partners"
            description="Mint vanity referral codes for business partners and track commission earned per code."
            actions={
              <Button variant="primary" size="sm" onClick={() => setShowForm((s) => !s)}>
                {showForm ? "Close" : "New partner code"}
              </Button>
            }
          />

          {showForm && (
            <PartnerForm
              onDone={() => {
                setShowForm(false);
                qc.invalidateQueries({ queryKey: ["admin", "partners"] });
              }}
            />
          )}

          <DataTable<AdminPartnerRow>
            loading={isLoading}
            rows={data ?? []}
            empty="No partner codes yet"
            emptyDescription="Mint a code above to onboard your first affiliate partner."
            columns={[
              {
                key: "code",
                header: "Code",
                render: (r) => (
                  <Link
                    href={`/admin/partners/${r._id}`}
                    className="font-semibold text-foundation-700 hover:underline"
                  >
                    {r.code}
                  </Link>
                ),
              },
              {
                key: "owner",
                header: "Owner",
                render: (r) => (
                  <div>
                    <div className="font-medium text-foundation-700">
                      {`${r.owner.firstName} ${r.owner.lastName}`.trim()}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {r.owner.email} · <span className="capitalize">{r.owner.role}</span>
                    </div>
                  </div>
                ),
              },
              {
                key: "commissionRate",
                header: "Rate",
                render: (r) => `${r.commissionRate}%`,
              },
              { key: "signups", header: "Signups", render: (r) => r.signups },
              { key: "paidConversions", header: "Paid", render: (r) => r.paidConversions },
              {
                key: "totalEarned",
                header: "Earned",
                render: (r) => formatNgn(r.totalEarned),
              },
              {
                key: "status",
                header: "Status",
                className: "text-right",
                render: (r) => (
                  <div className="flex items-center justify-end gap-2">
                    <StatusBadge value={r.status} />
                    <Button
                      size="sm"
                      variant={r.status === "active" ? "danger" : "success"}
                      disabled={setStatus.isPending}
                      onClick={() =>
                        setStatus.mutate({
                          id: r._id,
                          status: r.status === "active" ? "disabled" : "active",
                        })
                      }
                    >
                      {r.status === "active" ? "Disable" : "Enable"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={del.isPending}
                      onClick={() => confirmDelete(r)}
                    >
                      Delete
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        </div>
      </main>
    </>
  );
}

function PartnerForm({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<"existing" | "invite">("existing");
  const [code, setCode] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [rate, setRate] = useState(10);
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const inputCls =
    "rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-foundation-500 focus:ring-2 focus:ring-cryola-200";

  const mint = useMutation({
    mutationFn: () =>
      mode === "existing"
        ? adminApi.mintPartnerCode({ code, ownerId, commissionRate: rate, label: label || undefined })
        : adminApi.invitePartner({ code, email, firstName, lastName, commissionRate: rate, label: label || undefined }),
    onSuccess: onDone,
    onError: (e: unknown) => {
      const axiosErr = e as AxiosError<{ message?: string }>;
      setErr(axiosErr.response?.data?.message ?? "Failed to create partner code");
    },
  });

  const canSubmit =
    code.trim().length >= 3 &&
    (mode === "existing" ? ownerId.trim().length > 0 : email.trim() && firstName.trim() && lastName.trim());

  return (
    <div className="mb-6 rounded-2xl border border-border bg-surface p-5 shadow-pop">
      <div className="mb-4 flex gap-4 text-sm text-ink-body">
        <label className="flex items-center gap-1.5">
          <input
            type="radio"
            checked={mode === "existing"}
            onChange={() => setMode("existing")}
          />
          Existing user
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" checked={mode === "invite"} onChange={() => setMode("invite")} />
          Invite new partner
        </label>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <input
          className={inputCls}
          placeholder="Code (e.g. DAVIDO)"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
        />
        <input
          className={inputCls}
          type="number"
          min={0}
          max={100}
          placeholder="Commission %"
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
        />
        {mode === "existing" ? (
          <input
            className={`${inputCls} md:col-span-2`}
            placeholder="Owner user id"
            value={ownerId}
            onChange={(e) => setOwnerId(e.target.value)}
          />
        ) : (
          <>
            <input
              className={inputCls}
              placeholder="First name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <input
              className={inputCls}
              placeholder="Last name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
            <input
              className={`${inputCls} md:col-span-2`}
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </>
        )}
        <input
          className={`${inputCls} md:col-span-2`}
          placeholder="Label (optional, e.g. Davido IG campaign)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      {err && <p className="mt-2 text-sm text-error">{err}</p>}
      <div className="mt-4">
        <Button
          variant="primary"
          disabled={mint.isPending || !canSubmit}
          onClick={() => {
            setErr(null);
            mint.mutate();
          }}
        >
          {mint.isPending ? "Saving…" : "Create code"}
        </Button>
      </div>
    </div>
  );
}
