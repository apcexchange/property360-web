"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Gift, Wallet } from "lucide-react";
import { useState } from "react";
import { TenantTopbar } from "@/components/me/Topbar";
import { InviteForm } from "@/components/me/InviteForm";
import {
  Card,
  EmptyState,
  ErrorBox,
  PageContainer,
  Skeleton,
  StatusPill,
  formatDate,
  formatNgn,
} from "@/components/app/ui";
import { useToast } from "@/components/ui/Toast";
import { tenantApi, TenantInvite } from "@/lib/tenant-api";

function statusPill(invite: TenantInvite) {
  if (invite.status === "paid") {
    return <StatusPill label={`You earned ${formatNgn(invite.commissionAmount ?? 0)}`} tone="good" />;
  }
  if (invite.status === "joined") return <StatusPill label="Joined" tone="info" />;
  return <StatusPill label="Invited" tone="neutral" />;
}

export default function TenantReferPage() {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const q = useQuery({
    queryKey: ["me", "referrals"],
    queryFn: () => tenantApi.getReferralOverview(),
  });

  async function copyLink() {
    if (!q.data) return;
    try {
      await navigator.clipboard.writeText(q.data.shareUrl);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy. Long-press the link to copy it manually.");
    }
  }

  function shareOnWhatsApp() {
    if (!q.data) return;
    const text = `Sign up for Property360 with my link and your first month is free: ${q.data.shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }

  return (
    <>
      <TenantTopbar
        title="Refer & Earn"
        subtitle="Invite your landlord or caretaker and earn from their first subscription"
      />
      <PageContainer>
        {q.isLoading ? (
          <Card className="p-5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-3 h-10 w-full" />
          </Card>
        ) : q.isError ? (
          <ErrorBox message="Couldn't load your referrals" onRetry={() => q.refetch()} />
        ) : (
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <div className="flex items-start gap-3 bg-foundation-700 p-5 text-paper">
                <Gift className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-display text-[18px] font-bold">
                    Earn {q.data!.ratePercent}% of their first subscription
                  </p>
                  <p className="mt-1 text-[12.5px] opacity-80">
                    When your landlord or caretaker joins with your link and pays, the reward
                    lands in your wallet. They get their first month free.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 p-5">
                <code className="min-w-0 flex-1 truncate rounded-xl bg-canvas px-3 py-2 text-[12.5px] text-foundation-700">
                  {q.data!.shareUrl}
                </code>
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 hover:bg-foundation-700/5"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={shareOnWhatsApp}
                  className="rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 hover:bg-foundation-700/5"
                >
                  Share my link on WhatsApp
                </button>
              </div>
              <p className="px-5 pb-5 text-[12px] text-ink-muted">
                Your code: <span className="font-mono font-semibold">{q.data!.referralCode}</span>
              </p>
            </Card>

            <InviteForm />

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Invited", q.data!.totals.invited],
                ["Joined", q.data!.totals.joined],
                ["Paid", q.data!.totals.paid],
                ["Earned", formatNgn(q.data!.totals.earned)],
              ].map(([label, value]) => (
                <Card key={String(label)} className="p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                    {label}
                  </p>
                  <p className="mt-2 font-amount text-[20px] font-bold text-foundation-700">{value}</p>
                </Card>
              ))}
            </div>

            <Link
              href="/me/wallet"
              className="inline-flex items-center gap-2 text-[13px] font-semibold text-foundation-700 underline decoration-cryola-400 underline-offset-4"
            >
              <Wallet className="h-4 w-4" /> Go to wallet to withdraw
            </Link>

            <div>
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                Your invites
              </h2>
              {q.data!.invites.length === 0 ? (
                <EmptyState title="No invites yet" body="Invite your landlord or caretaker above." />
              ) : (
                <Card className="divide-y divide-foundation-700/10">
                  {q.data!.invites.map((i) => (
                    <div key={i.id} className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-medium text-foundation-700">
                          {i.name || i.phone || "Shared in WhatsApp"}
                          <span className="ml-2 text-[11.5px] font-normal text-ink-muted">
                            {i.relationship === "caretaker" ? "Caretaker" : "Landlord"}
                          </span>
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-ink-muted">{formatDate(i.createdAt)}</p>
                      </div>
                      {statusPill(i)}
                    </div>
                  ))}
                </Card>
              )}
            </div>
          </div>
        )}
      </PageContainer>
    </>
  );
}
