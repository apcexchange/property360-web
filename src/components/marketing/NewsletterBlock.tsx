import { NewsletterForm } from "./NewsletterForm";
import type { NewsletterSource } from "@/lib/newsletter-api";

export function NewsletterBlock({
  source,
  heading = "Stay in the loop",
  sub = "Occasional tips for Nigerian landlords, tenants, and agents, plus product updates. No spam.",
}: {
  source: NewsletterSource;
  heading?: string;
  sub?: string;
}) {
  return (
    <section className="bg-paper py-16">
      <div className="mx-auto max-w-6xl px-6">
        <div className="rounded-2xl border border-foundation-700/10 bg-white p-8 md:p-10">
          <h2 className="text-[22px] font-semibold tracking-tight text-foundation-700 md:text-[26px]">
            {heading}
          </h2>
          <p className="mt-2 max-w-xl text-[14.5px] leading-[1.6] text-ink-muted">{sub}</p>
          <NewsletterForm source={source} variant="block" />
        </div>
      </div>
    </section>
  );
}
