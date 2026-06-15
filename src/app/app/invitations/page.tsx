"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X, MapPin, Building2, ShieldCheck } from "lucide-react";
import { AxiosError } from "axios";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  Skeleton,
  ErrorBox,
  EmptyState,
  formatDate,
} from "@/components/app/ui";
import {
  landlordApi,
  InvitationDetail,
  AgentPermissions,
  PartySummary,
  Address,
} from "@/lib/landlord-api";

// Human labels for the per-property permission flags a landlord can grant a
// manager. Only the granted ones are shown on the invitation.
const PERMISSION_LABELS: Array<{ key: keyof AgentPermissions; label: string }> = [
  { key: "canAddTenant", label: "Add tenants" },
  { key: "canRecordPayment", label: "Record payments" },
  { key: "canRenewLease", label: "Renew leases" },
  { key: "canUploadAgreements", label: "Upload agreements" },
  { key: "canManageMaintenance", label: "Manage maintenance" },
  { key: "canViewPayments", label: "View payments" },
  { key: "canViewReports", label: "View reports" },
  { key: "canRemoveTenant", label: "Remove tenants" },
];

function partyName(p: PartySummary | string | null | undefined): string {
  if (!p || typeof p === "string") return "A landlord";
  const name = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
  return name || p.email || "A landlord";
}

function propertyLabel(
  p: { _id: string; name?: string; address?: Address } | string
): string {
  if (typeof p === "string") return "Assigned property";
  return p.name || "Assigned property";
}

export default function AgentInvitationsPage() {
  const q = useQuery({
    queryKey: ["agent", "invitations"],
    queryFn: () => landlordApi.myAgentInvitations(),
  });

  const pending = (q.data ?? []).filter((inv) => inv.status === "pending");

  return (
    <>
      <AppTopbar
        title="Invitations"
        subtitle="Landlords inviting you to manage their properties"
      />
      <PageContainer>
        {q.isLoading ? (
          <Card className="p-5">
            <Skeleton className="h-40 w-full" />
          </Card>
        ) : q.isError ? (
          <ErrorBox
            message={(q.error as Error)?.message}
            onRetry={() => q.refetch()}
          />
        ) : pending.length === 0 ? (
          <EmptyState
            title="No pending invitations"
            body="When a landlord invites you to manage their properties, it shows up here for you to accept or decline."
          />
        ) : (
          <div className="space-y-4">
            {pending.map((inv) => (
              <InvitationCard key={inv.id} inv={inv} />
            ))}
          </div>
        )}
      </PageContainer>
    </>
  );
}

function InvitationCard({ inv }: { inv: InvitationDetail }) {
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["agent", "invitations"] });
    qc.invalidateQueries({ queryKey: ["dashboard", "stats"] });
    qc.invalidateQueries({ queryKey: ["agent", "landlords"] });
    qc.invalidateQueries({ queryKey: ["properties"] });
  };

  const accept = useMutation({
    mutationFn: () => landlordApi.acceptInvitation(inv.id),
    onSuccess: invalidate,
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      setError(
        ax.response?.data?.message ?? (err as Error).message ?? "Could not accept"
      );
    },
  });
  const decline = useMutation({
    mutationFn: () => landlordApi.declineInvitation(inv.id),
    onSuccess: invalidate,
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      setError(
        ax.response?.data?.message ?? (err as Error).message ?? "Could not decline"
      );
    },
  });

  const permissions = PERMISSION_LABELS.filter((p) => inv.permissions?.[p.key]);
  const properties = inv.properties ?? [];
  const busy = accept.isPending || decline.isPending;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-foundation-700/10 p-5">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-cryola-200 text-foundation-700">
            <Building2 className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[18px] font-extrabold text-foundation-700">
              {partyName(inv.landlord ?? inv.invitedBy)}
            </p>
            <p className="mt-0.5 text-[13px] text-ink-muted">
              invited you to manage{" "}
              {properties.length === 0
                ? "their portfolio"
                : properties.length === 1
                ? "1 property"
                : `${properties.length} properties`}
              {" · "}
              {formatDate(inv.invitedAt)}
            </p>
          </div>
        </div>

        {properties.length > 0 && (
          <div className="mt-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Properties
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {properties.map((p, i) => (
                <span
                  key={typeof p === "string" ? p : p._id ?? i}
                  className="inline-flex items-center gap-1 rounded-full border border-foundation-700/10 bg-surface px-3 py-1 text-[12px] text-foundation-700"
                >
                  <MapPin className="h-3 w-3 text-ink-muted" />
                  {propertyLabel(p)}
                </span>
              ))}
            </div>
          </div>
        )}

        {permissions.length > 0 && (
          <div className="mt-4">
            <p className="inline-flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              <ShieldCheck className="h-3.5 w-3.5" /> What you&apos;ll be able to do
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {permissions.map((p) => (
                <span
                  key={p.key}
                  className="rounded-full bg-cryola-200/60 px-3 py-1 text-[12px] font-medium text-foundation-700"
                >
                  {p.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 bg-foundation-700/5 p-4">
        {error && <p className="mr-auto text-[12.5px] text-red-700">{error}</p>}
        <button
          type="button"
          onClick={() => {
            setError(null);
            decline.mutate();
          }}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5 disabled:opacity-50"
        >
          <X className="h-4 w-4" /> {decline.isPending ? "Declining…" : "Decline"}
        </button>
        <button
          type="button"
          onClick={() => {
            setError(null);
            accept.mutate();
          }}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />{" "}
          {accept.isPending ? "Accepting…" : "Accept invitation"}
        </button>
      </div>
    </Card>
  );
}
