"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
  QuitNotice,
  QUIT_NOTICE_REASON_LABELS,
  GuarantorRequest,
  GuarantorRequestAddressee,
  TenantProfileField,
  TenantProfileRequest,
  TenantProfileSnapshot,
  TENANT_PROFILE_FIELD_LABELS,
} from "@/lib/landlord-api";
import { RequestTenantProfileModal } from "@/components/app/RequestTenantProfileModal";
import { EditTenantProfileForm } from "@/components/app/EditTenantProfileForm";
import { useToast } from "@/components/ui/Toast";
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
  const router = useRouter();
  const toast = useToast();

  // Open (or reuse) the direct chat with this tenant, then jump to the thread.
  const messageTenant = useMutation({
    mutationFn: () => landlordApi.startTenantConversation(id),
    onSuccess: ({ id: conversationId }) => {
      if (conversationId) router.push(`/app/chat/${conversationId}`);
      else toast.error("Couldn't open the conversation");
    },
    onError: (err: unknown) => {
      const msg =
        (err as AxiosError<{ message?: string }>).response?.data?.message ??
        "Couldn't start the conversation";
      toast.error({ title: "Couldn't message tenant", body: msg });
    },
  });

  // Lease detail isn't a standalone endpoint, we surface lease info from the
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
  const quitNotices = useQuery({
    queryKey: ["quit-notices", id],
    queryFn: () => landlordApi.listQuitNotices(id),
    enabled: !!id,
  });
  const tenantProfile = useQuery({
    queryKey: ["tenant-profile", id],
    queryFn: () => landlordApi.getTenantProfileForLease(id),
    enabled: !!id,
  });
  const tenantProfileRequests = useQuery({
    queryKey: ["tenant-profile-requests", id],
    queryFn: () => landlordApi.listTenantProfileRequests(id),
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
                <LeaseProgress
                  startDate={lease.startDate}
                  endDate={lease.endDate}
                />
              </Card>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => messageTenant.mutate()}
                  disabled={messageTenant.isPending}
                  className="flex w-full items-start gap-3 rounded-2xl border border-foundation-700/10 bg-paper p-4 text-left transition hover:border-foundation-700/20 disabled:opacity-60"
                >
                  <MessageSquare className="mt-0.5 h-4 w-4 text-foundation-700" />
                  <div>
                    <p className="text-[13px] font-semibold text-foundation-700">
                      {messageTenant.isPending ? "Opening…" : "Message tenant"}
                    </p>
                    <p className="text-[11.5px] text-ink-muted">
                      Chat directly in the app
                    </p>
                  </div>
                </button>
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
                <Link
                  href={`/app/leases/${id}/quit-notice/new`}
                  className="flex items-start gap-3 rounded-2xl border border-foundation-700/10 bg-paper p-4 transition hover:border-foundation-700/20"
                >
                  <ScrollText className="mt-0.5 h-4 w-4 text-foundation-700" />
                  <div>
                    <p className="text-[13px] font-semibold text-foundation-700">
                      Serve quit notice
                    </p>
                    <p className="text-[11.5px] text-ink-muted">
                      Issue a notice to vacate the premises
                    </p>
                  </div>
                </Link>
              </div>
            </div>

            <div className="mt-8">
              <AutoInvoiceCard leaseId={id} lease={lease} />
            </div>

            <div className="mt-8">
              <TenantProfileSection
                leaseId={id}
                profile={tenantProfile.data ?? null}
                loading={tenantProfile.isLoading}
                requests={tenantProfileRequests.data ?? []}
              />
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

            <div className="mt-8">
              <QuitNoticesSection
                notices={quitNotices.data ?? []}
                loading={quitNotices.isLoading}
                leaseId={id}
              />
            </div>
          </>
        )}
      </PageContainer>
    </>
  );
}

/**
 * Lease-term progress bar, mirrors the mobile tenant detail screen. Shows how
 * far through the lease window today sits, tinted by how close the end is:
 * green on track, amber within 30 days, red once expired.
 */
function LeaseProgress({
  startDate,
  endDate,
}: {
  startDate: string;
  endDate: string;
}) {
  const today = Date.now();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const totalDays = Math.max(1, Math.ceil((end - start) / 86_400_000));
  const elapsed = Math.ceil((today - start) / 86_400_000);
  const daysLeft = Math.ceil((end - today) / 86_400_000);
  const pct = Math.min(100, Math.max(0, (elapsed / totalDays) * 100));

  const overdue = daysLeft <= 0;
  const dueSoon = daysLeft > 0 && daysLeft <= 30;
  const fill = overdue
    ? "bg-red-500"
    : dueSoon
    ? "bg-amber-500"
    : "bg-emerald-500";
  const label = overdue
    ? `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? "" : "s"} overdue`
    : `${daysLeft} day${daysLeft === 1 ? "" : "s"} until lease ends`;

  return (
    <div className="mt-4">
      <div className="h-2 overflow-hidden rounded-full bg-foundation-700/10">
        <div
          className={`h-full rounded-full ${fill}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1.5 text-[11.5px] text-ink-muted">{label}</p>
    </div>
  );
}

function TenantProfileSection({
  leaseId,
  profile,
  loading,
  requests,
}: {
  leaseId: string;
  profile: TenantProfileSnapshot | null;
  loading: boolean;
  requests: TenantProfileRequest[];
}) {
  const [showRequest, setShowRequest] = useState(false);
  const [showFill, setShowFill] = useState(false);
  const toast = useToast();
  const qc = useQueryClient();
  const pending = requests.find((r) => r.status === "pending") ?? null;

  const cancel = useMutation({
    mutationFn: (id: string) => landlordApi.cancelTenantProfileRequest(id),
    onSuccess: () => {
      toast.success({ title: "Request cancelled" });
      qc.invalidateQueries({
        queryKey: ["tenant-profile-requests", leaseId],
      });
    },
    onError: (err: unknown) => {
      const msg =
        (err as AxiosError<{ message?: string }>).response?.data?.message ??
        "Couldn't cancel the request";
      toast.error({ title: "Couldn't cancel", body: msg });
    },
  });

  const filledFields: TenantProfileField[] = profile
    ? [
        profile.avatar ? "avatar" : null,
        profile.dateOfBirth ? "dateOfBirth" : null,
        profile.occupation ? "occupation" : null,
        profile.nin ? "nin" : null,
        profile.address?.street || profile.address?.city || profile.address?.state
          ? "currentAddress"
          : null,
        profile.kyc?.selfieUrl ? "kycSelfie" : null,
        profile.kyc?.document?.imageUrl ? "idDocument" : null,
      ].filter((f): f is TenantProfileField => !!f)
    : [];

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-foundation-700/10 px-5 py-4">
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Tenant profile
          </h2>
          {pending && (
            <p className="mt-1 text-[12px] text-ink-muted">
              <StatusPill label="Request sent" tone="info" />{" "}
              <span className="ml-1">Sent {formatDate(pending.createdAt)}</span>
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {pending ? (
            <button
              type="button"
              onClick={() => cancel.mutate(pending._id)}
              disabled={cancel.isPending}
              className="rounded-full border border-foundation-700/15 bg-paper px-4 py-1.5 text-[12px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5 disabled:opacity-50"
            >
              Cancel request
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowRequest(true)}
              className="rounded-full border border-foundation-700/15 bg-paper px-4 py-1.5 text-[12px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
            >
              Request from tenant
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowFill(true)}
            className="rounded-full bg-foundation-700 px-4 py-1.5 text-[12px] font-semibold text-paper transition hover:bg-foundation-800"
          >
            Fill in myself
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-5">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="mt-3 h-4 w-1/2" />
        </div>
      ) : !profile ? (
        <div className="p-5">
          <p className="text-[13px] text-ink-muted">
            No profile info on file yet.
          </p>
        </div>
      ) : (
        <div className="px-5 py-5">
          <div className="flex flex-wrap items-start gap-4">
            {profile.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar}
                alt={`${profile.firstName} ${profile.lastName}`}
                className="h-16 w-16 rounded-2xl object-cover"
              />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-2xl bg-foundation-700/10 text-[18px] font-bold text-foundation-700">
                {(profile.firstName?.[0] ?? "?").toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <p className="font-display text-[18px] font-bold text-foundation-700">
                {profile.firstName} {profile.lastName}
              </p>
              <p className="text-[12.5px] text-ink-muted">
                {profile.email}
                {profile.phone ? ` · ${profile.phone}` : ""}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <ProfileFact
              label={TENANT_PROFILE_FIELD_LABELS.dateOfBirth}
              value={
                profile.dateOfBirth
                  ? formatDate(profile.dateOfBirth)
                  : null
              }
            />
            <ProfileFact
              label={TENANT_PROFILE_FIELD_LABELS.occupation}
              value={profile.occupation ?? null}
            />
            <ProfileFact
              label={TENANT_PROFILE_FIELD_LABELS.nin}
              value={profile.nin ?? null}
            />
            <ProfileFact
              label={TENANT_PROFILE_FIELD_LABELS.currentAddress}
              value={
                [
                  profile.address?.street,
                  profile.address?.city,
                  profile.address?.state,
                ]
                  .filter(Boolean)
                  .join(", ") || null
              }
            />
            <ProfileFact
              label={TENANT_PROFILE_FIELD_LABELS.idDocument}
              value={
                profile.kyc?.document?.imageUrl
                  ? `${profile.kyc.document.type ?? "ID"}${
                      profile.kyc.document.number
                        ? `: ${profile.kyc.document.number}`
                        : ""
                    }`
                  : null
              }
            />
            <ProfileFact
              label={TENANT_PROFILE_FIELD_LABELS.kycSelfie}
              value={profile.kyc?.selfieUrl ? "Uploaded" : null}
            />
          </div>
        </div>
      )}

      {showRequest && (
        <RequestTenantProfileModal
          leaseId={leaseId}
          filledFields={filledFields}
          onClose={() => setShowRequest(false)}
        />
      )}
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

function ProfileFact({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div
      className={`rounded-2xl border px-3.5 py-3 ${
        value
          ? "border-foundation-700/10 bg-paper"
          : "border-dashed border-foundation-700/15 bg-foundation-700/5"
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </p>
      <p
        className={`mt-1 text-[13px] ${
          value ? "text-foundation-700" : "italic text-ink-muted"
        }`}
      >
        {value ?? "Not on file"}
      </p>
    </div>
  );
}

function AutoInvoiceCard({
  leaseId,
  lease,
}: {
  leaseId: string;
  lease: {
    autoGenerateInvoice?: boolean;
    nextInvoiceDate?: string | null;
    gracePeriodDays?: number | null;
    paymentFrequency: string;
    rentAmount: number;
  };
}) {
  const toast = useToast();
  const qc = useQueryClient();
  const enabled = lease.autoGenerateInvoice === true;

  const setAuto = useMutation({
    mutationFn: (body: { enabled: boolean }) =>
      landlordApi.setAutoInvoice(leaseId, body),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["occupied-units"] });
      toast.success({
        title: res.autoGenerateInvoice
          ? "Auto-billing on"
          : "Auto-billing off",
        body: res.autoGenerateInvoice
          ? `Next invoice ${
              res.nextInvoiceDate
                ? "drafts on " + formatDate(res.nextInvoiceDate)
                : "will draft soon"
            }`
          : "Recurring rent invoices won't be drafted automatically",
      });
    },
    onError: (err) => {
      const msg =
        err instanceof AxiosError
          ? (err.response?.data as { message?: string })?.message
          : null;
      toast.error(msg || "Couldn't update auto-billing");
    },
  });

  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
            Auto-billing
          </p>
          <p className="mt-1.5 text-[15px] font-semibold text-foundation-700">
            {enabled
              ? "On, invoices draft and email automatically"
              : "Off, invoices are created manually"}
          </p>
          <p className="mt-1 text-[12.5px] text-ink-muted">
            {enabled
              ? `${formatNgn(lease.rentAmount)} per ${
                  lease.paymentFrequency
                } drafts overnight, then emails the tenant.${
                  lease.nextInvoiceDate
                    ? ` Next draft: ${formatDate(lease.nextInvoiceDate)}.`
                    : ""
                }`
              : "Toggle on to have Property360 draft and email the next rent invoice on schedule. You can turn it off any time."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAuto.mutate({ enabled: !enabled })}
          disabled={setAuto.isPending}
          className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full transition disabled:opacity-50 ${
            enabled ? "bg-foundation-700" : "bg-foundation-700/15"
          }`}
          aria-pressed={enabled}
          aria-label="Toggle auto-billing"
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-paper shadow transition ${
              enabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </Card>
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
  const [inviting, setInviting] = useState(false);
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
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setInviting(true)}
                className="text-[12px] font-semibold text-foundation-700 hover:underline"
              >
                Invite to fill
              </button>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-[12px] font-semibold text-foundation-700 hover:underline"
              >
                {guarantor ? "Edit" : "Add"}
              </button>
            </div>
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
        {inviting && (
          <GuarantorInviteForm
            leaseId={leaseId}
            onClose={() => setInviting(false)}
          />
        )}
        <GuarantorRequestsList leaseId={leaseId} />
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

function QuitNoticesSection({
  notices,
  loading,
  leaseId,
}: {
  notices: QuitNotice[];
  loading: boolean;
  leaseId: string;
}) {
  if (!loading && notices.length === 0) return null;
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-foundation-700/10 px-5 py-4">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          Quit notices
        </h2>
        <Link
          href={`/app/leases/${leaseId}/quit-notice/new`}
          className="text-[12px] font-semibold text-foundation-700 hover:underline"
        >
          + Serve another
        </Link>
      </div>
      {loading ? (
        <div className="space-y-2 p-5">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <ul className="divide-y divide-foundation-700/10">
          {notices.map((n) => {
            const tone: "good" | "warn" | "bad" | "neutral" | "info" =
              n.status === "withdrawn"
                ? "neutral"
                : n.status === "acknowledged"
                ? "good"
                : n.status === "expired"
                ? "bad"
                : "warn";
            return (
              <li
                key={n._id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[13.5px] font-semibold text-foundation-700">
                      {QUIT_NOTICE_REASON_LABELS[n.reason]}
                    </p>
                    <StatusPill label={n.status} tone={tone} />
                    <span className="rounded-full bg-foundation-700/5 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-ink-muted">
                      {n.source === "template" ? "Generated" : "Uploaded"}
                    </span>
                  </div>
                  <p className="mt-1 text-[11.5px] text-ink-muted">
                    Served {formatDate(n.servedAt ?? n.issuedAt)} ·{" "}
                    {n.noticePeriodDays} day{n.noticePeriodDays === 1 ? "" : "s"} ·
                    Expires {formatDate(n.expiresAt)}
                  </p>
                  {n.reasonDetail && (
                    <p className="mt-1 text-[11.5px] text-ink-muted">
                      {n.reasonDetail}
                    </p>
                  )}
                </div>
                <a
                  href={n.documentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full border border-foundation-700/15 bg-paper px-3 py-1.5 text-[11.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
                >
                  <ExternalLink className="h-3 w-3" /> Open
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function GuarantorInviteForm({
  leaseId,
  onClose,
}: {
  leaseId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const toast = useToast();
  const [addressee, setAddressee] = useState<GuarantorRequestAddressee>(
    "tenant"
  );
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [requirePassport, setRequirePassport] = useState(false);

  const send = useMutation({
    mutationFn: () =>
      landlordApi.createGuarantorRequest({
        leaseId,
        addressee,
        inviteEmail: email,
        inviteName: name.trim() || undefined,
        requirePassport,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guarantor-requests", leaseId] });
      toast.success("Invitation sent");
      onClose();
    },
    onError: (err) => {
      const ax = err as AxiosError<{ message?: string }>;
      toast.error(
        ax.response?.data?.message ??
          (err as Error).message ??
          "Couldn't send invitation"
      );
    },
  });

  const canSend = /.+@.+\..+/.test(email);

  return (
    <div className="border-t border-foundation-700/10 bg-foundation-700/5 px-5 py-4">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        Send invitation
      </p>
      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setAddressee("tenant")}
          className={`flex-1 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
            addressee === "tenant"
              ? "border-foundation-700 bg-foundation-700 text-paper"
              : "border-foundation-700/15 bg-paper text-foundation-700"
          }`}
        >
          Ask the tenant
        </button>
        <button
          type="button"
          onClick={() => setAddressee("guarantor")}
          className={`flex-1 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
            addressee === "guarantor"
              ? "border-foundation-700 bg-foundation-700 text-paper"
              : "border-foundation-700/15 bg-paper text-foundation-700"
          }`}
        >
          Email the guarantor
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
            Recipient email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="guarantor@example.com"
            className="w-full rounded-lg border border-foundation-700/15 bg-paper px-3 py-2 text-[13px] text-foundation-700"
          />
        </div>
        <div>
          <label className="mb-1 block text-[10.5px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
            Recipient name (optional)
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              addressee === "guarantor" ? "Their full name" : "The tenant's name"
            }
            className="w-full rounded-lg border border-foundation-700/15 bg-paper px-3 py-2 text-[13px] text-foundation-700"
          />
        </div>
      </div>
      <label className="mt-3 flex items-center gap-2 text-[12.5px] text-foundation-700">
        <input
          type="checkbox"
          checked={requirePassport}
          onChange={(e) => setRequirePassport(e.target.checked)}
          className="h-4 w-4 accent-foundation-700"
        />
        Also request a passport photo of the guarantor
      </label>
      <div className="mt-4 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-foundation-700/15 px-3 py-1.5 text-[12px] font-semibold text-foundation-700 hover:bg-foundation-700/5"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!canSend || send.isPending}
          onClick={() => send.mutate()}
          className="rounded-full bg-foundation-700 px-4 py-1.5 text-[12px] font-semibold text-paper hover:bg-foundation-800 disabled:opacity-50"
        >
          {send.isPending ? "Sending…" : "Send invitation"}
        </button>
      </div>
    </div>
  );
}

function GuarantorRequestsList({ leaseId }: { leaseId: string }) {
  const qc = useQueryClient();
  const toast = useToast();
  const list = useQuery({
    queryKey: ["guarantor-requests", leaseId],
    queryFn: () => landlordApi.listGuarantorRequests(leaseId),
    enabled: !!leaseId,
  });
  const cancel = useMutation({
    mutationFn: (id: string) => landlordApi.cancelGuarantorRequest(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["guarantor-requests", leaseId] });
      toast.success("Invitation cancelled");
    },
  });

  if (list.isLoading || (list.data ?? []).length === 0) return null;

  return (
    <div className="border-t border-foundation-700/10">
      <p className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        Pending invitations
      </p>
      <ul className="divide-y divide-foundation-700/10">
        {list.data!.map((r: GuarantorRequest) => {
          const tone: "good" | "warn" | "bad" | "neutral" =
            r.status === "submitted"
              ? "good"
              : r.status === "expired" || r.status === "cancelled"
              ? "neutral"
              : "warn";
          return (
            <li
              key={r._id}
              className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-foundation-700">
                  {r.inviteName ? `${r.inviteName} · ` : ""}{r.inviteEmail}
                </p>
                <p className="mt-0.5 text-[11.5px] text-ink-muted">
                  Sent to {r.addressee === "tenant" ? "the tenant" : "the guarantor"} ·{" "}
                  {r.requirePassport && "Passport requested · "}
                  {formatDate(r.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusPill label={r.status} tone={tone} />
                {r.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => cancel.mutate(r._id)}
                    disabled={cancel.isPending}
                    className="text-[12px] font-semibold text-foundation-700 hover:underline disabled:opacity-50"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

