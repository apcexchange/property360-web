"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Copy,
  Check,
  Share2,
  Sparkles,
  Calendar,
  MessageCircle,
  Clock,
} from "lucide-react";
import { AppTopbar } from "@/components/app/Topbar";
import {
  PageContainer,
  Card,
  Skeleton,
  ErrorBox,
} from "@/components/app/ui";
import { landlordApi } from "@/lib/landlord-api";
import { useToast } from "@/components/ui/Toast";

export default function ReferPage() {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const q = useQuery({
    queryKey: ["referrals", "me"],
    queryFn: () => landlordApi.getMyReferral(),
  });

  async function copyShareUrl() {
    if (!q.data) return;
    try {
      await navigator.clipboard.writeText(q.data.shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Couldn't copy. Long-press the link to copy it manually.");
    }
  }

  function whatsappShare() {
    if (!q.data) return;
    const text = encodeURIComponent(
      `Hey 👋 I've been using Property360 to manage rent and tenants. ` +
        `Sign up with my link and we both get 1 month free once you pay ` +
        `for your first plan:\n\n${q.data.shareUrl}`
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
  }

  return (
    <>
      <AppTopbar
        title="Refer a landlord"
        subtitle="Both of you get 1 month free when they pay for their first plan."
      />
      <PageContainer>
        {q.isLoading ? (
          <Card className="p-6">
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="mt-4 h-12 w-full" />
            <Skeleton className="mt-6 h-24 w-full" />
          </Card>
        ) : q.isError || !q.data ? (
          <ErrorBox
            message={(q.error as Error)?.message ?? "Couldn't load your referral link."}
            onRetry={() => q.refetch()}
          />
        ) : (
          <div className="space-y-6">
            {/* Hero card: the link */}
            <Card className="overflow-hidden">
              <div className="bg-foundation-700 px-6 py-7 text-paper">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cryola-300 text-foundation-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <h2 className="mt-4 font-display text-[22px] font-extrabold leading-tight tracking-[-0.01em] text-paper">
                  Both of you earn {q.data.bonusDaysPerSide} days free.
                </h2>
                <p className="mt-2 max-w-xl text-[13.5px] leading-[1.55] text-paper/80">
                  Share your link with another landlord, hostel owner, or
                  property manager. When they sign up and pay for their
                  first plan, you both get a free month credited to your
                  plan automatically.
                </p>
              </div>

              <div className="p-6">
                <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                  Your share link
                </p>
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-foundation-700/15 bg-canvas px-3 py-2.5">
                  <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-foundation-700">
                    {q.data.shareUrl}
                  </code>
                  <button
                    type="button"
                    onClick={copyShareUrl}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foundation-700 px-3 py-1.5 text-[11.5px] font-semibold text-paper hover:bg-foundation-800"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" /> Copy
                      </>
                    )}
                  </button>
                </div>
                <p className="mt-3 text-[11.5px] text-ink-muted">
                  Or share your code:{" "}
                  <span className="font-mono font-semibold text-foundation-700">
                    {q.data.referralCode}
                  </span>{" "}
, anyone signing up at property360.africa/onboarding can
                  paste it.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={whatsappShare}
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-[#1ebd5a]"
                  >
                    <MessageCircle className="h-4 w-4" /> Share on WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (q.data && navigator.share) {
                        navigator
                          .share({
                            title: "Property360, try it",
                            text:
                              "I've been using Property360 to manage rent and tenants. Sign up with my link and we both get 1 month free.",
                            url: q.data.shareUrl,
                          })
                          .catch(() => {
                            // user cancelled, no-op
                          });
                      } else {
                        copyShareUrl();
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-foundation-700/15 bg-paper px-4 py-2 text-[12.5px] font-semibold text-foundation-700 hover:bg-foundation-700/5"
                  >
                    <Share2 className="h-4 w-4" /> More options…
                  </button>
                </div>
              </div>
            </Card>

            {/* Stats, paid invitees count toward the reward; pending = signed up but haven't paid yet */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatCard
                icon={Sparkles}
                label="Paid invitees"
                value={q.data.totalPaid}
                hint="Picked a plan, bonus credited"
              />
              <StatCard
                icon={Clock}
                label="Pending"
                value={q.data.totalPending}
                hint="Signed up, not on a paid plan yet"
              />
              <StatCard
                icon={Calendar}
                label="Free days earned"
                value={q.data.totalBonusDaysEarned}
                hint={`${q.data.bonusDaysPerSide} days per paid referral`}
              />
            </div>

            {/* How it works */}
            <Card className="p-6">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
                How it works
              </p>
              <ol className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <Step
                  n={1}
                  title="Share your link"
                  body="Send it on WhatsApp, LinkedIn, or wherever you talk to other landlords."
                />
                <Step
                  n={2}
                  title="They sign up and pay for a plan"
                  body="Free-trial signups show as pending. The bonus fires only when they actually pay for a paid plan."
                />
                <Step
                  n={3}
                  title="Both of you get 30 free days"
                  body="Added automatically to your plan. Trial users: extends your trial. Paid users: pushes your next renewal back."
                />
              </ol>
              <p className="mt-5 text-[11.5px] leading-[1.55] text-ink-muted">
                Fine print: one credit per referee. If you self-refer or
                refer a tenant account, the credit won't fire. The credit
                lands on your next renewal, if your plan has fully expired
                you'll see it on the plan you pick next.
              </p>
            </Card>
          </div>
        )}
      </PageContainer>
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <span className="grid h-9 w-9 place-items-center rounded-full bg-cryola-300/30 text-foundation-700">
        <Icon className="h-4 w-4" strokeWidth={2.2} />
      </span>
      <p className="mt-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-muted">
        {label}
      </p>
      <p className="mt-1 font-display text-[28px] font-extrabold leading-none tracking-[-0.02em] text-foundation-700 tabular">
        {value.toLocaleString("en-NG")}
      </p>
      {hint && (
        <p className="mt-2 text-[11.5px] leading-[1.45] text-ink-muted">{hint}</p>
      )}
    </Card>
  );
}

function Step({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-foundation-700 font-mono text-[12px] font-bold text-cryola-300">
        {n}
      </span>
      <div>
        <p className="text-[13px] font-semibold text-foundation-700">{title}</p>
        <p className="mt-1 text-[12.5px] leading-[1.5] text-ink-muted">
          {body}
        </p>
      </div>
    </li>
  );
}
