"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { KeyRound, ShieldCheck, Sparkles, User } from "lucide-react";
import { AxiosError } from "axios";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  ErrorBox,
  Skeleton,
  StatusPill,
} from "@/components/app/ui";
import { session } from "@/lib/session";
import { landlordApi } from "@/lib/landlord-api";
import {
  billingApi,
  SubscriptionResponse,
  SubscriptionView,
} from "@/lib/billing-api";

export default function ProfilePage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["profile"],
    queryFn: () => landlordApi.profile(),
  });
  const subQ = useQuery({
    queryKey: ["subscription", "me"],
    queryFn: (): Promise<SubscriptionResponse> => billingApi.getSubscription(),
  });

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    if (q.data) {
      setFirstName(q.data.firstName ?? "");
      setLastName(q.data.lastName ?? "");
      setEmail(q.data.email ?? "");
      setPhone(q.data.phone ?? "");
    }
  }, [q.data]);

  const save = useMutation({
    mutationFn: () =>
      landlordApi.updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      }),
    onSuccess: (u) => {
      const token = session.getToken();
      if (token) session.set(token, { ...u, role: u.role });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const saveError = (() => {
    if (!save.isError) return null;
    const err = save.error as AxiosError<{ message?: string }>;
    return err.response?.data?.message ?? (err as Error).message;
  })();

  return (
    <>
      <AppTopbar title="Profile" subtitle="Your name, contact info, and security" />
      <PageContainer>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="space-y-5 p-5 lg:col-span-2">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-foundation-700" />
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Personal details
              </h2>
            </div>
            {q.isLoading ? (
              <Skeleton className="h-32 w-full rounded-xl" />
            ) : q.isError ? (
              <ErrorBox
                message={(q.error as Error)?.message}
                onRetry={() => q.refetch()}
              />
            ) : (
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  save.mutate();
                }}
              >
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
                    <Input value={phone} onChange={setPhone} />
                  </Field>
                </div>
                {saveError && <ErrorBox message={saveError} />}
                {save.isSuccess && (
                  <p className="text-[12.5px] text-emerald-700">
                    Profile updated.
                  </p>
                )}
                <div className="flex items-center justify-end">
                  <button
                    type="submit"
                    disabled={save.isPending}
                    className="rounded-full bg-foundation-700 px-6 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800 disabled:opacity-50"
                  >
                    {save.isPending ? "Saving…" : "Save changes"}
                  </button>
                </div>
              </form>
            )}
          </Card>

          <div className="space-y-3">
            <PlanCard sub={subQ.data} loading={subQ.isLoading} />
            <Link
              href="/app/profile/password"
              className="flex items-start gap-3 rounded-2xl border border-foundation-700/10 bg-paper p-4 transition hover:border-foundation-700/20"
            >
              <KeyRound className="mt-0.5 h-4 w-4 text-foundation-700" />
              <div>
                <p className="text-[13px] font-semibold text-foundation-700">
                  Change password
                </p>
                <p className="text-[11.5px] text-ink-muted">
                  Update your sign-in password
                </p>
              </div>
            </Link>
            <Link
              href="/app/profile/kyc"
              className="flex items-start gap-3 rounded-2xl border border-foundation-700/10 bg-paper p-4 transition hover:border-foundation-700/20"
            >
              <ShieldCheck className="mt-0.5 h-4 w-4 text-foundation-700" />
              <div>
                <p className="text-[13px] font-semibold text-foundation-700">
                  Identity verification
                </p>
                <p className="text-[11.5px] text-ink-muted">
                  Selfie + government ID
                </p>
              </div>
            </Link>
          </div>
        </div>
      </PageContainer>
    </>
  );
}

function PlanCard({
  sub,
  loading,
}: {
  sub: SubscriptionResponse | undefined;
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card className="space-y-3 p-4">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-6 w-32" />
      </Card>
    );
  }
  if (!sub) return null;
  if (!sub.applicable) {
    return (
      <Card className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
          Plan
        </p>
        <p className="mt-2 text-[13px] text-foundation-700">
          Subscriptions apply to landlords managing properties. As a {sub.role},
          you don&apos;t need one.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="bg-foundation-700 px-4 py-4 text-paper">
        <div className="flex items-center justify-between">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-cryola-300">
            Current plan
          </p>
          <StatusTone status={sub.status} />
        </div>
        <p className="mt-2 font-display text-[22px] font-extrabold leading-none tracking-[-0.01em]">
          {sub.tierDisplayName}
          {sub.tier !== "trial" && sub.tier !== "custom" && (
            <span className="ml-1.5 text-[12px] font-medium text-paper/70">
              · {sub.billingInterval === "annual" ? "Annual" : "Monthly"}
            </span>
          )}
        </p>
        <p className="mt-1 text-[11.5px] text-paper/70">
          {planSubtitle(sub)}
        </p>
      </div>
      <div className="space-y-2 p-4">
        <UsageRow
          label="Properties"
          used={sub.usage.propertyCount}
          limit={sub.usage.propertyLimit}
        />
        <UsageRow
          label="Manager seats"
          used={sub.usage.agentSeatCount}
          limit={sub.usage.agentSeatLimit}
        />
      </div>
      <Link
        href="/billing"
        className="flex items-center justify-center gap-1.5 border-t border-foundation-700/10 bg-foundation-700/5 py-3 text-[12.5px] font-semibold text-foundation-700 transition hover:bg-foundation-700/10"
      >
        <Sparkles className="h-3.5 w-3.5" /> Manage subscription
      </Link>
    </Card>
  );
}

function StatusTone({ status }: { status: SubscriptionView["status"] }) {
  const map: Record<
    SubscriptionView["status"],
    { label: string; tone: "good" | "warn" | "bad" | "info" | "neutral" }
  > = {
    trialing: { label: "On trial", tone: "info" },
    active: { label: "Active", tone: "good" },
    past_due: { label: "Past due", tone: "bad" },
    cancelled: { label: "Ending", tone: "warn" },
    expired: { label: "Expired", tone: "bad" },
  };
  const m = map[status] ?? map.expired;
  return <StatusPill label={m.label} tone={m.tone} />;
}

function planSubtitle(sub: SubscriptionView): string {
  if (sub.status === "trialing" && sub.trialEndsAt) {
    const days = Math.ceil(
      (new Date(sub.trialEndsAt).getTime() - Date.now()) / 86_400_000
    );
    if (days > 1) return `Free trial · ${days} days left`;
    if (days === 1) return "Free trial · 1 day left";
    return "Free trial · ending today";
  }
  if (sub.status === "active" && sub.renewsAt) {
    return `Renews ${new Date(sub.renewsAt).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}`;
  }
  if (sub.status === "past_due") return "Payment failed — update billing";
  if (sub.status === "cancelled" && sub.renewsAt) {
    return `Access ends ${new Date(sub.renewsAt).toLocaleDateString("en-NG", {
      day: "numeric",
      month: "short",
    })}`;
  }
  if (sub.status === "expired") return "Reactivate to add new properties";
  return "";
}

function UsageRow({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const unlimited = limit === -1;
  const pct = unlimited ? 0 : Math.min(1, used / Math.max(limit, 1));
  const atLimit = !unlimited && used >= limit;
  return (
    <div>
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-foundation-700">{label}</span>
        <span
          className={`font-semibold ${
            atLimit ? "text-red-600" : "text-foundation-700"
          }`}
        >
          {used} {unlimited ? "· unlimited" : `of ${limit}`}
        </span>
      </div>
      {!unlimited && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-foundation-700/10">
          <div
            className={`h-full rounded-full ${
              atLimit ? "bg-red-500" : "bg-foundation-700"
            }`}
            style={{ width: `${pct * 100}%` }}
          />
        </div>
      )}
    </div>
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
  type?: "text" | "email";
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-foundation-700/15 bg-paper px-3.5 py-2.5 text-[14px] text-foundation-700"
    />
  );
}
