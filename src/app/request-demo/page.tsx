import { Metadata } from "next";
import {
  CheckCircle2,
  Clock,
  MessageCircle,
  Sparkles,
  Users,
  ShieldCheck,
} from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { PageHero } from "@/components/marketing/PageHero";
import { RequestDemoForm } from "@/components/marketing/RequestDemoForm";

export const metadata: Metadata = {
  title: "Request a demo — Property360",
  description:
    "See Property360 in action. Book a personalised walkthrough and learn how to collect rent, manage leases, and fill vacant units across your Nigerian portfolio.",
  alternates: { canonical: "/request-demo" },
  openGraph: {
    title: "Request a demo — Property360",
    description:
      "Book a personalised walkthrough of Property360 for landlords, agents, and tenants.",
    url: "https://property360.africa/request-demo",
    type: "website",
  },
};

const BENEFITS = [
  {
    icon: Sparkles,
    title: "Built around your portfolio",
    body: "We focus on the properties you run and the way you rent.",
  },
  {
    icon: Users,
    title: "Your questions, answered",
    body: "Bring anything; get answers from the team that built it.",
  },
  {
    icon: ShieldCheck,
    title: "Setup guidance",
    body: "See how rent collection, KYC, and payouts work for Nigeria.",
  },
  {
    icon: CheckCircle2,
    title: "Zero pressure",
    body: "A free session, with no obligation to sign up.",
  },
];

export default function RequestDemoPage() {
  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <Nav />
      <PageHero
        eyebrow="Request a demo"
        title={
          <>
            A live walkthrough,
            <br />
            <span className="text-cryola-500">built around you.</span>
          </>
        }
        subtitle="Book time with our team and we'll show you how Property360 helps you collect rent, manage leases, and fill vacant units across Nigeria."
      />

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          {/* Left: what you'll get + duration + WhatsApp */}
          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-3xl border border-foundation-700/10 bg-surface p-7">
              <h2 className="text-[18px] font-bold tracking-[-0.01em] text-foundation-700">
                What to expect
              </h2>
              <ul className="mt-5 space-y-5">
                {BENEFITS.map((b) => {
                  const Icon = b.icon;
                  return (
                    <li key={b.title} className="flex items-start gap-3">
                      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-cryola-300 text-foundation-700">
                        <Icon className="h-4 w-4" strokeWidth={2.2} />
                      </span>
                      <div>
                        <p className="text-[14.5px] font-semibold text-foundation-700">
                          {b.title}
                        </p>
                        <p className="mt-0.5 text-[13.5px] leading-[1.5] text-ink-muted">
                          {b.body}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="rounded-3xl border border-foundation-700/10 bg-paper-deep/50 p-7">
              <div className="flex items-center gap-2 text-foundation-700">
                <Clock className="h-4 w-4" />
                <p className="text-[15px] font-bold">How long it takes</p>
              </div>
              <p className="mt-3 text-[13.5px] leading-[1.6] text-ink-muted">
                Most sessions take 30 to 45 minutes, enough to explore the
                platform and get every question answered.
              </p>
              <div className="mt-5 rounded-2xl border border-foundation-700/10 bg-surface p-4">
                <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
                  Prefer to chat?
                </p>
                <a
                  href="https://wa.me/2349027788838"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-2 text-[14px] font-semibold text-foundation-700 transition hover:text-foundation-900"
                >
                  <MessageCircle className="h-4 w-4 text-cryola-500" />
                  Chat on WhatsApp
                </a>
              </div>
            </div>
          </div>

          {/* Right: the form */}
          <RequestDemoForm />
        </div>
      </section>

      <Footer />
    </div>
  );
}
