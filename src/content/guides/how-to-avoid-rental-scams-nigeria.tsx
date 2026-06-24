import Link from "next/link";
import type { GuideMeta } from "./types";

export const meta: GuideMeta = {
  slug: "how-to-avoid-rental-scams-nigeria",
  title: "How to Avoid Rental Scams in Nigeria (2026 Guide)",
  heading: "How to avoid rental scams in Nigeria",
  description:
    "Fake landlords, ghost agents, and inspection-fee scams are common in Nigerian house hunting. Here are the warning signs and a simple checklist to rent safely.",
  keywords: [
    "rental scams Nigeria",
    "avoid house rent scam",
    "fake landlord Nigeria",
    "how to verify a landlord",
    "safe house hunting Lagos",
  ],
  datePublished: "2026-06-24",
  readingMinutes: 6,
  category: "Renting",
};

export function Body() {
  return (
    <>
      <p>
        Most Nigerians house-hunting today have either been scammed or know
        someone who has. The pattern is familiar: a too-good-to-be-true listing,
        an &ldquo;agent&rdquo; who insists on an inspection fee before you see
        anything, or a &ldquo;landlord&rdquo; who wants the full year&apos;s rent
        in cash before you sign a thing. Here is how to spot the traps and rent
        safely.
      </p>

      <h2>Common rental scams to watch for</h2>
      <ul>
        <li>
          <strong>The inspection-fee farm.</strong> An agent collects a small
          &ldquo;inspection fee&rdquo; from dozens of people for a property that
          isn&apos;t really available, then disappears.
        </li>
        <li>
          <strong>The fake landlord.</strong> Someone who doesn&apos;t own the
          property collects a deposit and vanishes before you can move in.
        </li>
        <li>
          <strong>The double-let.</strong> The same unit is &ldquo;rented&rdquo;
          to several people, each paying a deposit.
        </li>
        <li>
          <strong>Cash-only pressure.</strong> You&apos;re rushed to pay cash or
          transfer to a personal account &ldquo;today, before someone else takes
          it.&rdquo;
        </li>
      </ul>

      <h2>Warning signs</h2>
      <ul>
        <li>The rent is far below market for the area.</li>
        <li>You&apos;re asked to pay before you&apos;ve seen the unit in person.</li>
        <li>The agent avoids putting anything in writing.</li>
        <li>There is no tenancy agreement, or it&apos;s a vague one-pager.</li>
        <li>You can&apos;t confirm who actually owns the property.</li>
      </ul>

      <h2>How to verify a landlord or agent</h2>
      <ul>
        <li>
          Ask for identification and confirm it matches the person showing you
          the property.
        </li>
        <li>
          Ask to see proof of ownership or the agent&apos;s authority to let the
          unit.
        </li>
        <li>Visit the property in person and speak to existing tenants or neighbours.</li>
        <li>
          Never pay into a personal account on the spot. Insist on a traceable
          payment and a receipt.
        </li>
      </ul>

      <h2>The safest way: rent through a verified platform</h2>
      <p>
        The single biggest protection is to deal with landlords whose identity has
        been checked and to pay through a channel that leaves a record. On{" "}
        <Link href="/listings">Property360</Link>, every unit is tied to a real
        landlord or agent, identity-verified landlords carry a{" "}
        <strong>Verified</strong> badge, and you pay through Paystack, never cash
        to a stranger. You can browse homes without signing in and only reserve
        when you&apos;re ready. See how it works for{" "}
        <Link href="/tenant">tenants</Link>.
      </p>

      <h2>Your quick safety checklist</h2>
      <ul>
        <li>See the property in person before paying anything.</li>
        <li>Confirm who owns it and who you&apos;re paying.</li>
        <li>Pay traceably (card, bank transfer, USSD), never untraceable cash.</li>
        <li>Get a written tenancy agreement and a receipt for every payment.</li>
        <li>Prefer verified landlords and platforms that hold you both accountable.</li>
      </ul>

      <p className="text-[14px] text-ink-muted">
        This article is general guidance, not legal advice. If you suspect fraud,
        report it to the police and your bank immediately.
      </p>
    </>
  );
}
