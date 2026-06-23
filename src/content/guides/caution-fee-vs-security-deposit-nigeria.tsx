import Link from "next/link";
import type { GuideMeta } from "./types";

export const meta: GuideMeta = {
  slug: "caution-fee-vs-security-deposit-nigeria",
  title: "Caution Fee vs Security Deposit in Nigeria: What's the Difference?",
  heading: "Caution fee vs security deposit in Nigeria",
  description:
    "Caution fee and security deposit are not the same thing. Here is what each one means in Nigerian rentals, how much is normal, and when a tenant gets the money back.",
  keywords: [
    "caution fee Nigeria",
    "security deposit Nigeria",
    "caution fee vs security deposit",
    "is caution fee refundable",
    "rent fees Nigeria",
  ],
  datePublished: "2026-06-23",
  readingMinutes: 5,
  category: "Payments",
};

export function Body() {
  return (
    <>
      <p>
        When you rent a property in Nigeria, the first payment is rarely just
        rent. You are usually asked for a caution fee and a security deposit, on
        top of agent, agreement, and legal fees. Tenants and even some landlords
        use the two terms loosely, but they are not the same. Knowing the
        difference protects both sides.
      </p>

      <h2>What is a security deposit?</h2>
      <p>
        A security deposit is money the tenant pays at the start of the tenancy
        that the landlord holds against unpaid rent or bills. If the tenant leaves
        owing rent or with an outstanding electricity or service charge bill, the
        landlord can deduct it from the deposit and return the balance.
      </p>

      <h2>What is a caution fee?</h2>
      <p>
        A caution fee is money held specifically against damage to the property.
        At the end of the tenancy, if the unit is returned in good condition
        (normal wear and tear aside), the caution fee is refunded. If the tenant
        broke fittings, damaged walls, or left the place needing repair beyond
        normal use, the cost of fixing it is taken out first.
      </p>

      <h2>The key difference</h2>
      <p>
        Both are usually refundable, but they cover different risks. The security
        deposit covers money the tenant owes (rent and bills). The caution fee
        covers physical damage to the property. In practice some landlords combine
        them or use one term to mean both, which is exactly why it should be spelled
        out in the tenancy agreement.
      </p>

      <h2>How much is normal?</h2>
      <p>
        There is no fixed legal amount and it varies by location, property type,
        and landlord. As a rough guide, a caution fee is often set at around one
        month of rent, while a security deposit can range higher for premium
        properties. What matters more than the exact figure is that the amount,
        and the conditions for getting it back, are written down before money
        changes hands.
      </p>

      <h2>When does the tenant get the money back?</h2>
      <ul>
        <li>
          <strong>Security deposit:</strong> after the tenancy ends, once any
          unpaid rent or bills are settled.
        </li>
        <li>
          <strong>Caution fee:</strong> after the tenancy ends, once the property
          has been inspected and any damage beyond normal wear is deducted.
        </li>
      </ul>
      <p>
        Refund disputes are common because neither side kept a clear record of
        what was paid, what condition the property was in, and what was deducted.
      </p>

      <h2>How to avoid refund disputes</h2>
      <ul>
        <li>Name each fee separately in the tenancy agreement.</li>
        <li>State clearly which fees are refundable and on what conditions.</li>
        <li>Record an inventory and the condition of the unit at move-in.</li>
        <li>Issue a receipt for every payment, including deposits and fees.</li>
      </ul>
      <p>
        With <Link href="/landlord">Property360</Link>, the Nigerian fee
        categories (security deposit, caution fee, agent fee, agreement fee, legal
        fee, and service charge) are built into the lease, so each one is recorded
        against the tenant from day one and a receipt is generated automatically.
        When it is time to refund, there is no argument about what was paid.
      </p>

      <p className="text-[14px] text-ink-muted">
        This article is general information, not legal advice. Fee amounts and
        refund practices vary by location and landlord.
      </p>
    </>
  );
}
