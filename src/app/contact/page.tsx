import { Metadata } from "next";
import { Mail, MessageCircle, MapPin, Briefcase } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { PageHero } from "@/components/marketing/PageHero";

export const metadata: Metadata = {
  title: "Contact Property360",
  description:
    "Get in touch with Property360 — support, sales, partnerships, and press inquiries.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Property360",
    description: "Support, sales, partnerships, and press inquiries.",
    url: "https://property360.africa/contact",
    type: "website",
  },
};

const CHANNELS = [
  {
    icon: Mail,
    label: "General",
    detail: "hello@property360.africa",
    href: "mailto:hello@property360.africa",
    body:
      "For product questions, feedback, and anything not covered by the other channels.",
  },
  {
    icon: Briefcase,
    label: "Sales / Enterprise",
    detail: "sales@property360.africa",
    href: "mailto:sales@property360.africa",
    body:
      "Custom pricing for portfolios over 100 properties, agencies, or whitelabel partners.",
  },
  {
    icon: MessageCircle,
    label: "Support",
    detail: "support@property360.africa",
    href: "mailto:support@property360.africa",
    body:
      "Existing landlords, tenants, and agents who need help with the app or a transaction.",
  },
  {
    icon: Briefcase,
    label: "Partnerships",
    detail: "partnerships@property360.africa",
    href: "mailto:partnerships@property360.africa",
    body:
      "Integrations, distribution partners, and press inquiries.",
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <Nav />
      <PageHero
        eyebrow="Contact"
        title={
          <>
            Talk to us.
            <br />
            <span className="text-cryola-500">We read every message.</span>
          </>
        }
        subtitle="Pick the channel that fits. We typically respond within one business day."
      />

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {CHANNELS.map((c) => {
            const Icon = c.icon;
            return (
              <a
                key={c.label}
                href={c.href}
                className="group rounded-2xl border border-foundation-700/10 bg-surface p-7 transition hover:border-foundation-700/30"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-cryola-300 text-foundation-700">
                  <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
                </span>
                <p className="mt-4 text-[12px] uppercase tracking-[0.16em] text-foundation-700">
                  {c.label}
                </p>
                <p className="mt-1 font-display text-[20px] font-semibold tracking-[-0.01em] text-foundation-700">
                  {c.detail}
                </p>
                <p className="mt-3 text-[13.5px] leading-[1.55] text-ink-muted">{c.body}</p>
              </a>
            );
          })}
        </div>

        <div className="mt-12 rounded-2xl border border-foundation-700/10 bg-paper-deep/60 p-6">
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-4 w-4 text-foundation-700" />
            <div>
              <p className="text-[14px] font-semibold text-foundation-700">Lagos, Nigeria</p>
              <p className="mt-1 text-[13.5px] text-ink-muted">
                We&apos;re a remote-first team headquartered in Lagos. For meetings,
                please email ahead.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
