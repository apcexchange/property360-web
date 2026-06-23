import { Metadata } from "next";
import Link from "next/link";
import { Briefcase, ShieldCheck, BarChart3, KeyRound } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { PageHero } from "@/components/marketing/PageHero";
import { AppStoreButtons } from "@/components/marketing/AppStoreButtons";
import { MetaTrack } from "@/components/MetaTrack";

export const metadata: Metadata = {
  title: "For agents — manage landlord portfolios with auditable access",
  description:
    "Property360 lets landlords give agents granular per-property permissions: add tenants, record payments, manage maintenance — every action attributed.",
  alternates: { canonical: "/agents" },
  openGraph: {
    title: "Property360 for agents — work the landlord's portfolio, attributably",
    description:
      "Granular per-property permissions, audit trail, real-time chat with both sides.",
    url: "https://property360.africa/agents",
    type: "website",
  },
};

const PILLARS = [
  {
    icon: KeyRound,
    title: "Permissions that match the engagement.",
    body:
      "Landlords grant you exactly what you need — add tenants, record payments, manage maintenance, upload agreements — per property. No blanket access, no awkward conversations.",
  },
  {
    icon: ShieldCheck,
    title: "Every action attributed.",
    body:
      "When you record a payment or assign a tenant, it's logged under your name. Landlords trust agents who work with a paper trail.",
  },
  {
    icon: BarChart3,
    title: "One inbox for your whole book.",
    body:
      "Work across multiple landlords from a single app. See the units that need attention without juggling logins.",
  },
  {
    icon: Briefcase,
    title: "Get paid like a professional.",
    body:
      "Commissions logged against the lease, agent fees collected through Paystack, payouts to your bank — no envelope of cash, no chasing.",
  },
];

export default function AgentsPage() {
  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <MetaTrack event="ViewContent" params={{ content_name: "agents", content_category: "manager_landing" }} />
      <Nav />
      <PageHero
        eyebrow="For agents"
        title={
          <>
            Work landlords&apos; portfolios.
            <br />
            <span className="text-cryola-500">With auditable access.</span>
          </>
        }
        subtitle="Most agents work on trust and WhatsApp. Property360 gives you the access you need, scoped to the property — and proof of every action you take."
      >
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-6 py-3 text-[13px] font-semibold text-paper transition hover:bg-foundation-800"
          >
            Sign up →
          </Link>
          <Link
            href="/for-agencies"
            className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-foundation-700 transition hover:text-foundation-900"
          >
            Running an agency? See the agency one-pager →
          </Link>
        </div>
      </PageHero>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {PILLARS.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="rounded-2xl border border-foundation-700/10 bg-surface p-7"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-cryola-300 text-foundation-700">
                  <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
                </span>
                <h3 className="mt-4 text-[16px] font-semibold text-foundation-700">
                  {p.title}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.55] text-ink-muted">{p.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="mx-auto max-w-2xl font-display text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-foundation-700">
          Sign up as an agent. Wait for a landlord to invite you.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] text-ink-muted">
          Agents on Property360 only work properties that landlords have invited them to. No
          self-service portfolios, no scraping.
        </p>
        <div className="mt-8">
          <AppStoreButtons align="center" />
        </div>
      </section>

      <Footer />
    </div>
  );
}
