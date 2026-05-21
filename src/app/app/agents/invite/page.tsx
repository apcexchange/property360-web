"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { AxiosError } from "axios";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  ErrorBox,
} from "@/components/app/ui";
import { landlordApi, Agent } from "@/lib/landlord-api";

interface PermissionDef {
  key: keyof Agent["permissions"];
  label: string;
  desc: string;
}

const PERMISSIONS: PermissionDef[] = [
  { key: "canAddTenant", label: "Add tenants", desc: "Assign tenants to vacant units and create leases." },
  { key: "canRecordPayment", label: "Record payments", desc: "Mark rent or invoices as paid." },
  { key: "canRenewLease", label: "Renew leases", desc: "Extend existing leases on your behalf." },
  { key: "canUploadAgreements", label: "Upload agreements", desc: "Attach tenancy agreements to leases." },
  { key: "canManageMaintenance", label: "Maintenance", desc: "Triage and act on maintenance requests." },
  { key: "canViewPayments", label: "View payments", desc: "Read-only access to payment history." },
  { key: "canViewReports", label: "View reports", desc: "Read-only access to financial reports." },
  { key: "canRemoveTenant", label: "Remove tenants", desc: "Terminate leases and vacate units." },
];

export default function InviteAgentPage() {
  const router = useRouter();
  const properties = useQuery({
    queryKey: ["properties"],
    queryFn: () => landlordApi.listProperties(),
  });

  const [email, setEmail] = useState("");
  const [propertyIds, setPropertyIds] = useState<string[]>([]);
  const [perms, setPerms] = useState<Agent["permissions"]>({
    canAddTenant: true,
    canRecordPayment: true,
    canViewPayments: true,
  });

  const invite = useMutation({
    mutationFn: () =>
      landlordApi.inviteAgent({
        email: email.trim(),
        permissions: perms,
        propertyIds: propertyIds.length > 0 ? propertyIds : undefined,
      }),
    onSuccess: () => router.push("/app/agents"),
  });

  const formError = (() => {
    if (!invite.isError) return null;
    const err = invite.error as AxiosError<{ message?: string }>;
    return err.response?.data?.message ?? (err as Error).message;
  })();

  const canSubmit =
    /\S+@\S+\.\S+/.test(email.trim()) &&
    Object.values(perms).some(Boolean);

  return (
    <>
      <AppTopbar
        title="Invite property manager"
        subtitle="They'll get an email to accept the invite"
        actions={
          <Link
            href="/app/agents"
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
            if (canSubmit) invite.mutate();
          }}
        >
          <Card className="space-y-5 p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Property manager
            </h2>
            <div>
              <label className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="agent@example.com"
                className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700"
              />
              <p className="mt-2 text-[11.5px] text-ink-muted">
                If they don&apos;t have an account, they&apos;ll be prompted to create one
                when they accept.
              </p>
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Permissions
              </h2>
              <p className="mt-1 text-[12px] text-ink-muted">
                Pick what this property manager can do. You can change this later.
              </p>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {PERMISSIONS.map((p) => {
                const checked = !!perms[p.key];
                return (
                  <label
                    key={p.key}
                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                      checked
                        ? "border-foundation-700 bg-foundation-700/5"
                        : "border-foundation-700/10 hover:bg-foundation-700/5"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) =>
                        setPerms((prev) => ({
                          ...prev,
                          [p.key]: e.target.checked,
                        }))
                      }
                      className="mt-0.5 h-4 w-4 rounded border-foundation-700/30 text-foundation-700 focus:ring-foundation-700"
                    />
                    <div>
                      <p className="text-[13px] font-semibold text-foundation-700">
                        {p.label}
                      </p>
                      <p className="mt-0.5 text-[11.5px] text-ink-muted">
                        {p.desc}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <div>
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Scope
              </h2>
              <p className="mt-1 text-[12px] text-ink-muted">
                Leave empty to apply to all current and future properties.
              </p>
            </div>
            {properties.isLoading ? (
              <p className="text-[13px] text-ink-muted">Loading properties…</p>
            ) : (properties.data ?? []).length === 0 ? (
              <p className="text-[13px] text-ink-muted">
                Add a property first to scope the property manager.
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {properties.data!.map((p) => {
                  const checked = propertyIds.includes(p._id);
                  return (
                    <label
                      key={p._id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 transition ${
                        checked
                          ? "border-foundation-700 bg-foundation-700/5"
                          : "border-foundation-700/10 hover:bg-foundation-700/5"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) =>
                          setPropertyIds((prev) =>
                            e.target.checked
                              ? [...prev, p._id]
                              : prev.filter((x) => x !== p._id)
                          )
                        }
                        className="h-4 w-4 rounded border-foundation-700/30 text-foundation-700 focus:ring-foundation-700"
                      />
                      <span className="text-[13.5px] text-foundation-700">
                        {p.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </Card>

          {formError && <ErrorBox message={formError} />}

          <div className="flex items-center justify-end gap-3">
            <Link
              href="/app/agents"
              className="rounded-full border border-foundation-700/15 bg-paper px-5 py-2.5 text-[13px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!canSubmit || invite.isPending}
              className="rounded-full bg-foundation-700 px-6 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
            >
              {invite.isPending ? "Sending…" : "Send invite"}
            </button>
          </div>
        </form>
      </PageContainer>
    </>
  );
}
