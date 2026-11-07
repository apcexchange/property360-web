import type { Metadata } from "next";
import Link from "next/link";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import { PageHero } from "@/components/marketing/PageHero";
import { MoveInCostCalculator } from "@/components/marketing/MoveInCostCalculator";

export const metadata: Metadata = {
  title: "Rental Move-in Cost Calculator for Nigeria",
  description:
    "Add up the rent, fees, deposits, and other amounts quoted for your Nigerian rental. A free calculator that uses your figures, not generic estimates.",
  alternates: { canonical: "/guides/tools/move-in-cost-calculator" },
  openGraph: {
    title: "Rental Move-in Cost Calculator | Property360",
    description:
      "Estimate your move-in total from the rent and fees you have actually been quoted.",
    url: "https://property360.africa/guides/tools/move-in-cost-calculator",
    type: "website",
  },
};

export default function MoveInCostCalculatorPage() {
  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <Nav />
      <PageHero
        eyebrow="Free rental tool"
        title={
          <>
            What will move-in
            <br />
            <span className="text-cryola-500">really cost?</span>
          </>
        }
        subtitle="Add the actual amounts quoted for rent and each fee. The calculator totals your entries and separates deposit-labelled amounts so you can ask clearer questions."
      />
      <main className="mx-auto max-w-5xl px-6 pb-20">
        <MoveInCostCalculator />

        <section className="mt-10 rounded-2xl border border-foundation-700/10 bg-white p-6 md:p-8">
          <h2 className="font-display text-[22px] font-bold text-foundation-700">
            Before you pay
          </h2>
          <ul className="mt-4 grid gap-3 text-[14px] leading-relaxed text-ink-muted md:grid-cols-2">
            <li>Ask for an itemised breakdown and identify who receives each amount.</li>
            <li>Confirm which charges recur, which are one-off, and what may be refundable.</li>
            <li>Verify the property and payment recipient independently.</li>
            <li>Keep the signed agreement and a receipt for every payment.</li>
          </ul>
          <p className="mt-5 border-t border-foundation-700/10 pt-4 text-[12px] leading-relaxed text-ink-muted">
            This tool performs arithmetic only. It does not provide legal, tax,
            financial, or market-price advice. Rules and charges may differ by
            state and tenancy. For legal questions, consult a qualified lawyer.
          </p>
        </section>

        <div className="mt-8 flex flex-wrap gap-4 text-[13px] font-semibold">
          <Link
            href="/guides/cost-of-renting-in-lagos"
            className="text-foundation-700 underline decoration-cryola-400 underline-offset-4"
          >
            Read the Lagos rent guide
          </Link>
          <Link
            href="/guides/agent-fees-in-nigeria-explained"
            className="text-foundation-700 underline decoration-cryola-400 underline-offset-4"
          >
            Understand rental fees
          </Link>
          <Link
            href="/guides"
            className="text-foundation-700 underline decoration-cryola-400 underline-offset-4"
          >
            Browse all guides
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
