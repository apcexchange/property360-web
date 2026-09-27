"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, UserPlus, Receipt, Layers, Mail, Megaphone, Search, ArrowRight } from "lucide-react";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  StatCard,
  Skeleton,
  ErrorBox,
  formatNgn,
  formatDate,
} from "@/components/app/ui";
import { landlordApi } from "@/lib/landlord-api";
import { session } from "@/lib/session";

export default function DashboardPage() {
  const user = session.getUser();
  // Dashboard totals are a portfolio snapshot, never a continuation of a
  // date filter chosen on another page. Include the current calendar month
  // in this cache key so the month-sensitive hints (for example, "added this
  // month") cannot reuse a snapshot from a previous month in a long-lived
  // browser session.
  const now = new Date();
  const dashboardMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const stats = useQuery({
    queryKey: ["dashboard", "stats", dashboardMonth],
    queryFn: () => landlordApi.dashboardStats(),
    refetchOnMount: "always",
  });
  const activities = useQuery({
    queryKey: ["dashboard", "activities"],
    queryFn: () => landlordApi.recentActivities(8),
  });
  // Pending landlord → manager invitations. Managers accept these on the web
  // now, so surface them prominently on the dashboard.
  const invitations = useQuery({
    queryKey: ["agent", "invitations"],
    queryFn: () => landlordApi.myAgentInvitations(),
    enabled: user?.role === "agent",
  });
  const pendingInvites = (invitations.data ?? []).filter(
    (i) => i.status === "pending"
  );

  return (
    <>
      <AppTopbar
        title="Dashboard"
        subtitle="Your portfolio at a glance"
        actions={
          <div className="hidden items-center gap-2 sm:flex">
            <Link
              href="/listings"
              className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-bold text-lime-300 transition hover:bg-foundation-800"
            >
              <Search className="h-4 w-4" /> Browse listings
            </Link>
            <Link
              href="/app/marketplace/new"
              className="inline-flex items-center gap-1.5 rounded-full border border-lime-500/50 bg-lime-50 px-4 py-2 text-[12.5px] font-semibold text-foundation-700 transition hover:border-lime-500 hover:bg-lime-100"
            >
              <Megaphone className="h-4 w-4" /> List for free
            </Link>
            <Link
              href="/app/properties/new"
              className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800"
            >
              <Plus className="h-4 w-4" /> Add managed property
            </Link>
          </div>
        }
      />
      <PageContainer>
        <div className="mb-6 grid gap-3 lg:grid-cols-2">
          <Link
            href="/listings"
            className="group flex items-start gap-3 rounded-2xl bg-foundation-700 p-4 transition hover:bg-foundation-800"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lime-300 text-foundation-700">
              <Search className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-paper">
                Browse available listings
              </p>
              <p className="mt-0.5 text-[13px] text-paper/70">
                See homes, shops, land, shortlets and hotels on the Property360 marketplace, and message owners directly.
              </p>
            </div>
            <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-lime-300 transition group-hover:translate-x-0.5" />
          </Link>
          <Link
            href="/app/marketplace/new"
            className="flex items-start gap-3 rounded-2xl border border-lime-500/35 bg-lime-50/70 p-4 transition hover:border-lime-500 hover:bg-lime-50"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foundation-700 text-lime-300">
              <Megaphone className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-foundation-700">
                List a property for free
              </p>
              <p className="mt-0.5 text-[13px] text-ink-muted">
                Advertise a home, shop, land, shortlet, or hotel room. Standard listings are free—no plan or rent commission required.
              </p>
            </div>
            <span className="mt-1.5 shrink-0 text-[12px] font-semibold text-foundation-700 underline decoration-lime-500 underline-offset-4">
              Create listing
            </span>
          </Link>
        </div>
        {/* Pending landlord invitations, shown to managers whenever any are
           waiting, regardless of whether they already have properties. */}
        {user?.role === "agent" && pendingInvites.length > 0 && (
          <Link
            href="/app/invitations"
            className="mb-6 flex items-start gap-3 rounded-2xl border border-cryola-400 bg-cryola-200/40 p-4 transition hover:border-cryola-500"
          >
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foundation-700 text-paper">
              <Mail className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-foundation-700">
                You have {pendingInvites.length} pending landlord{" "}
                {pendingInvites.length === 1 ? "invitation" : "invitations"}
              </p>
              <p className="mt-0.5 text-[13px] text-ink-muted">
                Review and accept to start managing their properties.
              </p>
            </div>
            <span className="mt-1.5 text-[12.5px] font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4">
              Review
            </span>
          </Link>
        )}
        {/* Property manager banner, visible to role=agent until they have
           any properties (own or managed). Once stats.totalProperties > 0
           the regular dashboard takes over. */}
        {user?.role === "agent" &&
          stats.data &&
          stats.data.totalProperties === 0 && (
            <Card className="mb-6 p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cryola-200 text-foundation-700">
                  <Layers className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="text-[14.5px] font-semibold text-foundation-700">
                    You&apos;re a property manager
                  </p>
                  <p className="mt-1 text-[13px] text-ink-muted">
                    Manage your own properties or accept invitations from
                    landlords, both work side-by-side.
                  </p>
                  <div className="mt-4">
                    <Link
                      href="/app/properties/new"
                      className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800"
                    >
                      <Plus className="h-4 w-4" /> Add your first property
                    </Link>
                  </div>
                  <p className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] text-ink-muted">
                    <Mail className="h-3 w-3" />
                    Invited by a landlord?{" "}
                    <Link
                      href="/app/invitations"
                      className="font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-2"
                    >
                      Review your invitations
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </Card>
          )}
        {/* Referral nudge, one-line banner, non-intrusive. Hidden once
            it would compete with the agent-onboarding banner above. */}
        {!(user?.role === "agent" && stats.data?.totalProperties === 0) && (
          <Link
            href="/app/refer"
            className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-foundation-700/10 bg-cryola-50/70 px-5 py-3 transition hover:border-foundation-700/20"
          >
            <p className="text-[13px] text-foundation-700">
              <span className="font-semibold">Refer a landlord →</span>{" "}
              Both of you get 30 days free when they pay for their first
              plan.
            </p>
            <span className="text-[12px] font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4">
              Get your link
            </span>
          </Link>
        )}

        {stats.isError ? (
          <ErrorBox
            message={(stats.error as Error)?.message}
            onRetry={() => stats.refetch()}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.isLoading || !stats.data ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="p-5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="mt-3 h-8 w-32" />
                </Card>
              ))
            ) : (
              <>
                <StatCard
                  label="Properties"
                  value={stats.data.totalProperties}
                  hint={`${stats.data.newPropertiesThisMonth} added this month`}
                  href="/app/properties"
                />
                <StatCard
                  label="Tenants"
                  value={stats.data.activeTenants}
                  hint={`${stats.data.occupiedUnits} of ${stats.data.totalUnits} units occupied`}
                  href="/app/tenants"
                />
                <StatCard
                  label="Monthly rent"
                  value={formatNgn(stats.data.monthlyRevenue)}
                  hint="From active leases"
                />
                <StatCard
                  label="Occupancy"
                  value={`${stats.data.occupancyRate}%`}
                  hint={`${stats.data.vacantUnits} vacant`}
                />
              </>
            )}
          </div>
        )}

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionHeader title="Recent activity" />
            {activities.isLoading ? (
              <Card className="divide-y divide-foundation-700/10">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="mt-2 h-2 w-20" />
                  </div>
                ))}
              </Card>
            ) : activities.data && activities.data.length > 0 ? (
              <Card className="divide-y divide-foundation-700/10">
                {activities.data.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 p-4">
                    <span
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cryola-500"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] text-foundation-700">{a.text}</p>
                      <p className="mt-0.5 text-[11.5px] text-ink-muted">
                        {a.time} · {formatDate(a.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </Card>
            ) : (
              <Card className="p-6 text-center text-[13px] text-ink-muted">
                Nothing yet. Add a property to see activity.
              </Card>
            )}
          </div>

          <div>
            <SectionHeader title="Quick actions" />
            <div className="space-y-3">
              <QuickAction
                href="/app/marketplace/new"
                icon={<Megaphone className="h-4 w-4" />}
                title="List property for free"
                body="Advertise publicly. No subscription or rent commission."
              />
              <QuickAction
                href="/app/properties/new"
                icon={<Plus className="h-4 w-4" />}
                title="Add managed property"
                body="Set up units, tenants, rent, and operations."
              />
              <QuickAction
                href="/app/tenants/new"
                icon={<UserPlus className="h-4 w-4" />}
                title="Add tenant"
                body="Assign a tenant to a vacant unit."
              />
              <QuickAction
                href="/app/invoices/new"
                icon={<Receipt className="h-4 w-4" />}
                title="Create invoice"
                body="Bill a tenant for rent or fees."
              />
            </div>
          </div>
        </div>
      </PageContainer>
    </>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
      {title}
    </h2>
  );
}

function QuickAction({
  href,
  icon,
  title,
  body,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-2xl border border-foundation-700/10 bg-paper p-4 transition hover:border-foundation-700/20 hover:bg-foundation-700/5"
    >
      <span className="mt-0.5 grid h-7 w-7 place-items-center rounded-full bg-foundation-700 text-paper">
        {icon}
      </span>
      <div>
        <p className="text-[13.5px] font-semibold text-foundation-700">{title}</p>
        <p className="mt-0.5 text-[12px] text-ink-muted">{body}</p>
      </div>
    </Link>
  );
}
