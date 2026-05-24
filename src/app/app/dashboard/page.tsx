"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, UserPlus, Receipt, Layers, Mail } from "lucide-react";
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
  const stats = useQuery({
    queryKey: ["dashboard", "stats"],
    queryFn: () => landlordApi.dashboardStats(),
  });
  const activities = useQuery({
    queryKey: ["dashboard", "activities"],
    queryFn: () => landlordApi.recentActivities(8),
  });

  return (
    <>
      <AppTopbar
        title="Dashboard"
        subtitle="Your portfolio at a glance"
        actions={
          <Link
            href="/app/properties/new"
            className="hidden items-center gap-1.5 rounded-full bg-foundation-700 px-4 py-2 text-[12.5px] font-semibold text-paper transition hover:bg-foundation-800 sm:inline-flex"
          >
            <Plus className="h-4 w-4" /> Add property
          </Link>
        }
      />
      <PageContainer>
        {/* Property manager banner — visible to role=agent until they have
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
                    landlords — both work side-by-side.
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
                    Landlord invitations are accepted in the Property360
                    mobile app.
                  </p>
                </div>
              </div>
            </Card>
          )}
        {/* Referral nudge — one-line banner, non-intrusive. Hidden once
            it would compete with the agent-onboarding banner above. */}
        {!(user?.role === "agent" && stats.data?.totalProperties === 0) && (
          <Link
            href="/app/refer"
            className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-foundation-700/10 bg-cryola-50/70 px-5 py-3 transition hover:border-foundation-700/20"
          >
            <p className="text-[13px] text-foundation-700">
              <span className="font-semibold">Refer a landlord →</span>{" "}
              Both of you get 30 days free when they add their first
              property.
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
                href="/app/properties/new"
                icon={<Plus className="h-4 w-4" />}
                title="Add property"
                body="Create a new property with units."
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
