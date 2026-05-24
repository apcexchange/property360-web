"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { ArrowLeft, CheckCircle2, Mail, X } from "lucide-react";
import {
  landlordApi,
  InvitationDetail,
  PartySummary,
  AgentPermissions,
} from "@/lib/landlord-api";
import { session } from "@/lib/session";
import { useToast } from "@/components/ui/Toast";

interface PermissionDef {
  key: keyof AgentPermissions;
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

function isPopulated(p: PartySummary | string | null | undefined): p is PartySummary {
  return !!p && typeof p === "object" && "_id" in p;
}

function partyName(p: PartySummary | string | null | undefined, fallback = "A Property360 user"): string {
  if (isPopulated(p)) {
    return `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || fallback;
  }
  return fallback;
}

export default function AcceptInvitationPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const toast = useToast();

  const id = params?.id ?? "";
  const emailHint = search?.get("email") ?? "";

  // Track session readiness so we don't flash "not signed in" on first paint.
  const [authReady, setAuthReady] = useState(false);
  const [me, setMe] = useState<ReturnType<typeof session.getUser>>(null);
  useEffect(() => {
    setMe(session.getUser());
    setAuthReady(true);
  }, []);

  const hasToken = authReady && !!session.getToken();

  const q = useQuery({
    queryKey: ["invitation", id],
    queryFn: () => landlordApi.getInvitation(id),
    enabled: !!id && hasToken,
    retry: false,
  });

  // Pre-acceptance scope/permission state (only used by landlord accepting a
  // PM-initiated invite).
  const properties = useQuery({
    queryKey: ["properties"],
    queryFn: () => landlordApi.listProperties(),
    enabled:
      hasToken &&
      me?.role === "landlord" &&
      q.data?.direction === "agent_to_landlord",
  });
  const [propertyIds, setPropertyIds] = useState<string[]>([]);
  const [perms, setPerms] = useState<AgentPermissions>({
    canAddTenant: true,
    canRecordPayment: true,
    canViewPayments: true,
  });

  const inv: InvitationDetail | undefined = q.data;

  const acceptMut = useMutation({
    mutationFn: () =>
      landlordApi.acceptInvitation(id, {
        propertyIds: propertyIds.length > 0 ? propertyIds : undefined,
        permissions:
          inv?.direction === "agent_to_landlord" ? perms : undefined,
      }),
    onSuccess: () => {
      toast.success({ title: "Invitation accepted" });
      // Send the user to the right list for their role.
      if (me?.role === "agent") router.push("/app/landlords");
      else router.push("/app/agents");
    },
    onError: (err) => {
      const e = err as AxiosError<{ message?: string }>;
      const msg = e.response?.data?.message ?? (err as Error).message;
      toast.error({ title: "Could not accept invitation", body: msg });
    },
  });
  const declineMut = useMutation({
    mutationFn: () => landlordApi.declineInvitation(id),
    onSuccess: () => {
      toast.info({ title: "Invitation declined" });
      router.push("/");
    },
    onError: (err) => {
      const e = err as AxiosError<{ message?: string }>;
      const msg = e.response?.data?.message ?? (err as Error).message;
      toast.error({ title: "Could not decline invitation", body: msg });
    },
  });

  const inviterName = useMemo(() => {
    if (!inv) return "A Property360 user";
    return partyName(inv.invitedBy);
  }, [inv]);

  // Branch 1: not signed in — show the public landing with sign in / sign up CTAs.
  if (authReady && !hasToken) {
    return (
      <SignedOutView id={id} emailHint={emailHint} />
    );
  }

  // Branch 2: signed in, but invitation lookup failed.
  if (q.isError) {
    const err = q.error as AxiosError<{ message?: string }>;
    const msg = err?.response?.data?.message ?? (q.error as Error)?.message ?? "Invitation not found";
    return (
      <Shell>
        <h1 className="font-display text-[1.75rem] font-extrabold leading-tight tracking-[-0.02em]">
          Invitation unavailable
        </h1>
        <p className="mt-3 text-[14.5px] leading-[1.6] text-ink-muted">{msg}</p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[13px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </Shell>
    );
  }

  if (!inv) {
    return (
      <Shell>
        <p className="text-[14px] text-ink-muted">Loading invitation…</p>
      </Shell>
    );
  }

  // Branch 3: signed in as the wrong user.
  const userEmail = me?.email?.toLowerCase() ?? "";
  if (
    userEmail &&
    inv.inviteEmail &&
    userEmail !== inv.inviteEmail.toLowerCase()
  ) {
    return (
      <Shell>
        <h1 className="font-display text-[1.75rem] font-extrabold leading-tight tracking-[-0.02em]">
          This invitation is for someone else
        </h1>
        <p className="mt-3 text-[14.5px] leading-[1.6] text-ink-muted">
          The invitation was addressed to <strong>{inv.inviteEmail}</strong>.
          You&apos;re signed in as <strong>{me?.email}</strong>. Sign out and
          sign in with the right account to continue.
        </p>
        <div className="mt-6">
          <button
            type="button"
            onClick={() => {
              session.clear();
              const next = encodeURIComponent(
                `/invitations/${id}?email=${encodeURIComponent(inv.inviteEmail)}`
              );
              router.replace(`/login?next=${next}`);
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800"
          >
            Sign out and switch accounts
          </button>
        </div>
      </Shell>
    );
  }

  // Branch 4: role mismatch — invitation is for someone with the other role.
  const expectedRole =
    inv.direction === "landlord_to_agent" ? "agent" : "landlord";
  if (me?.role && me.role !== expectedRole) {
    return (
      <Shell>
        <h1 className="font-display text-[1.75rem] font-extrabold leading-tight tracking-[-0.02em]">
          Wrong account type
        </h1>
        <p className="mt-3 text-[14.5px] leading-[1.6] text-ink-muted">
          {inv.direction === "landlord_to_agent"
            ? "This invitation is for a property manager, but your account is registered as a landlord."
            : "This invitation is for a landlord, but your account is registered as a property manager."}
        </p>
      </Shell>
    );
  }

  // Branch 5: invitation is already finalized.
  if (inv.status !== "pending") {
    return (
      <Shell>
        <h1 className="font-display text-[1.75rem] font-extrabold leading-tight tracking-[-0.02em]">
          {inv.status === "accepted" ? "Already accepted" : "Invitation closed"}
        </h1>
        <p className="mt-3 text-[14.5px] leading-[1.6] text-ink-muted">
          This invitation is no longer active.
        </p>
      </Shell>
    );
  }

  // Branch 6: the happy path.
  const isLandlordAccepting = inv.direction === "agent_to_landlord";
  const heading =
    inv.direction === "landlord_to_agent"
      ? `${inviterName} invited you to manage their properties`
      : `${inviterName} wants to manage your properties`;
  const subhead =
    inv.direction === "landlord_to_agent"
      ? "If you accept, you'll be able to act as their property manager based on the permissions they grant."
      : "If you accept, they'll be able to act as your property manager. You choose which properties and what they can do.";

  return (
    <Shell>
      <h1 className="font-display text-[1.75rem] font-extrabold leading-tight tracking-[-0.02em]">
        {heading}
      </h1>
      <p className="mt-3 text-[14.5px] leading-[1.6] text-ink-muted">
        {subhead}
      </p>

      <div className="mt-6 rounded-2xl border border-foundation-700/10 bg-surface p-4 text-[13px]">
        <p className="flex items-center gap-2 text-foundation-700">
          <Mail className="h-4 w-4" /> Sent to {inv.inviteEmail}
        </p>
      </div>

      {isLandlordAccepting && (
        <>
          <section className="mt-8">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Properties this manager can access
            </h2>
            <p className="mt-1 text-[12.5px] text-ink-muted">
              Leave empty to apply to all current and future properties.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {(properties.data ?? []).map((p) => {
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
              {(properties.data ?? []).length === 0 && !properties.isLoading && (
                <p className="text-[13px] text-ink-muted">
                  You don&apos;t have any properties yet — accepting will give
                  this manager access to anything you add later.
                </p>
              )}
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
              Permissions
            </h2>
            <p className="mt-1 text-[12.5px] text-ink-muted">
              Pick what this manager can do. You can change this later.
            </p>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
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
          </section>
        </>
      )}

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => acceptMut.mutate()}
          disabled={acceptMut.isPending || declineMut.isPending}
          className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />{" "}
          {acceptMut.isPending ? "Accepting…" : "Accept invitation"}
        </button>
        <button
          type="button"
          onClick={() => declineMut.mutate()}
          disabled={acceptMut.isPending || declineMut.isPending}
          className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/15 bg-paper px-5 py-2.5 text-[13px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5 disabled:opacity-50"
        >
          <X className="h-4 w-4" />{" "}
          {declineMut.isPending ? "Declining…" : "Decline"}
        </button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link
          href="/"
          className="text-[12.5px] font-semibold uppercase tracking-[0.16em] text-foundation-700"
        >
          Property360
        </Link>
        <div className="mt-8 rounded-3xl border border-foundation-700/10 bg-paper p-8 shadow-[0_24px_48px_-32px_rgb(13_43_54_/_0.2)]">
          {children}
        </div>
      </div>
    </div>
  );
}

function SignedOutView({ id, emailHint }: { id: string; emailHint: string }) {
  const next = encodeURIComponent(
    `/invitations/${id}${emailHint ? `?email=${encodeURIComponent(emailHint)}` : ""}`
  );
  return (
    <Shell>
      <h1 className="font-display text-[1.75rem] font-extrabold leading-tight tracking-[-0.02em]">
        You have an invitation
      </h1>
      <p className="mt-3 text-[14.5px] leading-[1.6] text-ink-muted">
        {emailHint
          ? `It was sent to ${emailHint}. Sign in or create your Property360 account with that email to continue.`
          : "Sign in or create your Property360 account to continue."}
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href={`/login?next=${next}`}
          className="rounded-full bg-foundation-700 px-5 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800"
        >
          Sign in
        </Link>
        <Link
          href="/onboarding/role"
          className="rounded-full border border-foundation-700/15 bg-paper px-5 py-2.5 text-[13px] font-semibold text-foundation-700 transition hover:bg-foundation-700/5"
        >
          Create an account
        </Link>
      </div>
      <p className="mt-6 text-[12.5px] text-ink-muted">
        Once you finish signing in or signing up, you&apos;ll come back to this
        page to accept or decline.
      </p>
    </Shell>
  );
}
