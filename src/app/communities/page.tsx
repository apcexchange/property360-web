import { Metadata } from "next";
import Link from "next/link";
import {
  SplitSquareHorizontal,
  Wallet,
  Eye,
  MessagesSquare,
  Building2,
  Zap,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { PageHero } from "@/components/marketing/PageHero";
import { AppStoreButtons } from "@/components/marketing/AppStoreButtons";

export const metadata: Metadata = {
  title: "Estate communities, shared bills & building chat | Property360",
  description:
    "Bring everyone in your building together. Split communal costs like diesel, security, and waste transparently, collect contributions into a secure wallet, and coordinate in a building group chat.",
  alternates: { canonical: "/communities" },
  openGraph: {
    title: "Estate communities on Property360",
    description:
      "Split shared building costs transparently, collect into a secure wallet, and coordinate in a building group chat.",
    url: "https://property360.africa/communities",
    type: "website",
  },
};

const FEATURES = [
  {
    icon: SplitSquareHorizontal,
    title: "Split shared costs fairly",
    body: "A neighbour raises a bill for diesel, security, cleaning, waste, or a repair. Everyone in the building sees their share, no more guesswork or door-knocking for cash.",
  },
  {
    icon: Wallet,
    title: "Collect into a secure wallet",
    body: "Contributions are paid through Paystack into a dedicated building wallet, so the money is tracked and accounted for, not sitting in one person's pocket.",
  },
  {
    icon: Eye,
    title: "Everyone sees the status",
    body: "Who has paid, who hasn't, and how much is collected so far. Full transparency means no arguments about who owes what.",
  },
  {
    icon: MessagesSquare,
    title: "A chat for the whole building",
    body: "Coordinate repairs, announcements, and estate meetings in one group tied to the property, instead of a dozen scattered WhatsApp threads.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "A neighbour raises a shared bill",
    body: "Diesel for the generator, the security guard's pay, a communal repair, waste collection, estate dues, anything the building shares.",
  },
  {
    n: "02",
    title: "Everyone sees their share",
    body: "The bill is split across the building and each resident sees exactly what they owe and the deadline.",
  },
  {
    n: "03",
    title: "Each resident pays into the building wallet",
    body: "Pay through Paystack, card, bank transfer, or USSD. Contributions collect in a dedicated wallet for that bill.",
  },
  {
    n: "04",
    title: "Funds settle, landlord has visibility",
    body: "Once the target is met the bill is settled. Landlords get read-only visibility of the shared bills on their property.",
  },
];

const FOR = [
  { icon: Building2, label: "Multi-unit buildings & flats" },
  { icon: Users, label: "Gated estates & compounds" },
  { icon: Zap, label: "Generator / diesel cost-sharing" },
  { icon: ShieldCheck, label: "Shared security & service charges" },
];

export default function CommunitiesPage() {
  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <Nav />
      <PageHero
        eyebrow="Estate communities"
        title={
          <>
            The whole building,
            <br />
            <span className="text-cryola-500">on the same page.</span>
          </>
        }
        subtitle="Diesel, security, waste, repairs, the costs a building shares are usually chased in cash and endless WhatsApp threads. Property360 turns them into transparent shared bills everyone can see and settle, plus a group chat for the whole building."
      >
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-6 py-3 text-[13px] font-semibold text-paper transition hover:bg-foundation-800"
          >
            Get started free →
          </Link>
          <Link
            href="/tenant"
            className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-foundation-700 transition hover:text-foundation-900"
          >
            For tenants →
          </Link>
        </div>
      </PageHero>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="eyebrow">What you get</p>
        <h2 className="mt-3 max-w-3xl font-display text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-foundation-700">
          Communal costs, finally transparent.
        </h2>
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="rounded-2xl border border-foundation-700/10 bg-surface p-7"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-cryola-300 text-foundation-700">
                  <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
                </span>
                <h3 className="mt-4 text-[16px] font-semibold text-foundation-700">
                  {f.title}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.55] text-ink-muted">
                  {f.body}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="border-t border-foundation-700/10 bg-paper-deep/40 py-16">
        <div className="mx-auto max-w-5xl px-6">
          <p className="eyebrow">How it works</p>
          <h2 className="mt-3 max-w-3xl font-display text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-foundation-700">
            From shared cost to settled, in four steps.
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-foundation-700/10 bg-surface p-6"
              >
                <p className="font-mono text-[13px] tracking-tight text-cryola-500">
                  Step {s.n}
                </p>
                <h3 className="mt-3 text-[17px] font-semibold leading-snug text-foundation-700">
                  {s.title}
                </h3>
                <p className="mt-2 text-[14px] leading-[1.6] text-ink-muted">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <p className="eyebrow">Built for</p>
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {FOR.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.label}
                className="flex items-center gap-3 rounded-2xl border border-foundation-700/10 bg-surface p-5"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-foundation-700 text-cryola-300">
                  <Icon className="h-4 w-4" strokeWidth={2.2} />
                </span>
                <span className="text-[13.5px] font-medium leading-snug text-foundation-700">
                  {f.label}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="mx-auto max-w-2xl font-display text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.02em] text-foundation-700">
          Bring your building together.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] text-ink-muted">
          Create your free account and set up your property, your tenants can
          start raising and settling shared bills right away.
        </p>
        <div className="mt-8">
          <AppStoreButtons align="center" />
        </div>
      </section>

      <Footer />
    </div>
  );
}
