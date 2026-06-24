import Link from "next/link";
import type { GuideMeta } from "./types";

export const meta: GuideMeta = {
  slug: "agent-fees-in-nigeria-explained",
  title: "Agent and Agency Fees in Nigeria: What's Normal and What's Legal",
  heading: "Agent and agency fees in Nigeria, explained",
  description:
    "Agent fee, agency fee, legal fee, agreement fee — what each one means in a Nigerian rental, how much is typical, and what the law says.",
  keywords: [
    "agent fee Nigeria",
    "agency fee Nigeria",
    "how much is agent fee",
    "legal fee rent Nigeria",
    "Lagos tenancy law fees",
  ],
  datePublished: "2026-06-24",
  readingMinutes: 5,
  category: "Payments",
};

export function Body() {
  return (
    <>
      <p>
        The headline rent is rarely what you actually pay on day one. On top of
        rent and any deposit, most Nigerian tenancies add a stack of fees: agent,
        agency, legal, and agreement. Here is what each one is for and what counts
        as reasonable.
      </p>

      <h2>The fees you&apos;ll typically see</h2>
      <ul>
        <li>
          <strong>Agent fee:</strong> paid to the agent who showed you the
          property and handled the deal. Commonly around 10% of the annual rent.
        </li>
        <li>
          <strong>Agency / commission fee:</strong> sometimes listed separately
          from the agent fee for the agency&apos;s service.
        </li>
        <li>
          <strong>Legal fee:</strong> covers preparing or reviewing the tenancy
          agreement, often around 10% of annual rent.
        </li>
        <li>
          <strong>Agreement fee:</strong> a charge for drawing up the tenancy
          agreement document itself.
        </li>
      </ul>

      <h2>What does the law say?</h2>
      <p>
        Lagos State&apos;s tenancy law, for example, restricts charging a tenant
        more than what is lawfully due and frowns on stacking arbitrary fees. In
        practice, enforcement is weak and customs vary by state and agent, so the
        most important protection is transparency: every fee should be named,
        justified, and receipted before you pay.
      </p>

      <h2>Red flags</h2>
      <ul>
        <li>Fees that aren&apos;t itemised, just one lump &ldquo;total to pay.&rdquo;</li>
        <li>An agent fee charged when there was no real agent involved.</li>
        <li>Being charged a legal/agreement fee but never receiving an agreement.</li>
        <li>No receipt for any of it.</li>
      </ul>

      <h2>How to protect yourself</h2>
      <ul>
        <li>Ask for an itemised breakdown of every fee before you commit.</li>
        <li>Confirm which fees are one-off and which (if any) recur at renewal.</li>
        <li>Get a receipt for each payment.</li>
        <li>
          Make sure the tenancy agreement you paid a legal/agreement fee for
          actually exists and you receive a copy.
        </li>
      </ul>

      <p>
        On <Link href="/landlord">Property360</Link>, the Nigerian fee categories
        (agent, agreement, legal, caution, security deposit, and service charge)
        are built into the lease, so each is itemised against the tenant and a
        receipt is generated automatically. Tenants see exactly what they&apos;re
        paying for. For more on refundable fees, see{" "}
        <Link href="/guides/caution-fee-vs-security-deposit-nigeria">
          caution fee vs security deposit
        </Link>
        .
      </p>

      <p className="text-[14px] text-ink-muted">
        This article is general information, not legal advice. Fee levels and
        rules vary by state and change over time.
      </p>
    </>
  );
}
