import Link from "next/link";
import { XCircle } from "lucide-react";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";

export default function BillingCancelledPage() {
  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <Nav />

      <section className="mx-auto flex max-w-md flex-col items-start px-6 pt-20 pb-16">
        <div className="grid h-12 w-12 place-items-center rounded-full bg-paper-deep text-foundation-700">
          <XCircle className="h-6 w-6" />
        </div>
        <h1 className="mt-6 font-display text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-[1.1] tracking-[-0.02em]">
          Checkout cancelled.
        </h1>
        <p className="mt-3 text-[15px] leading-[1.55] text-ink-muted">
          No payment was taken. You can pick another plan or come back later.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/billing"
            className="inline-flex items-center gap-1.5 rounded-full bg-foundation-700 px-5 py-2.5 text-[13px] font-semibold text-paper transition hover:bg-foundation-800"
          >
            Back to plans →
          </Link>
          <Link
            href="/"
            className="text-[13px] font-semibold text-foundation-700 transition hover:text-foundation-900"
          >
            Marketing site
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
