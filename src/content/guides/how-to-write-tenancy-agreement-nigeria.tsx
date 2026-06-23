import Link from "next/link";
import type { GuideMeta } from "./types";

export const meta: GuideMeta = {
  slug: "how-to-write-tenancy-agreement-nigeria",
  title: "How to Write a Tenancy Agreement in Nigeria (2026 Guide + Checklist)",
  heading: "How to write a tenancy agreement in Nigeria",
  description:
    "A clear, practical guide to writing a valid tenancy agreement in Nigeria: the clauses every agreement needs, common mistakes, and how to issue and store it properly.",
  keywords: [
    "tenancy agreement Nigeria",
    "how to write a tenancy agreement",
    "tenancy agreement template Nigeria",
    "lease agreement Nigeria",
    "landlord tenant agreement",
  ],
  datePublished: "2026-06-23",
  readingMinutes: 7,
  category: "Leases",
};

export function Body() {
  return (
    <>
      <p>
        A tenancy agreement is the single most important document in any rental.
        It sets out what the landlord and tenant agreed, and it is what you fall
        back on when there is a dispute over rent, repairs, or moving out. Yet
        many Nigerian landlords still rent on a handshake or a one-page note. This
        guide walks you through writing a proper tenancy agreement that actually
        protects you.
      </p>

      <h2>What is a tenancy agreement?</h2>
      <p>
        A tenancy agreement is a written contract between a landlord and a tenant.
        It records who is renting, what they are renting, for how long, at what
        price, and on what terms. In Nigeria it is sometimes called a lease
        agreement, though strictly a lease usually refers to a longer term. For
        most residential rentals, the words are used interchangeably.
      </p>

      <h2>The clauses every tenancy agreement needs</h2>
      <p>
        At a minimum, a valid and useful agreement should contain the following.
      </p>
      <ul>
        <li>
          <strong>The parties.</strong> Full legal names and addresses of the
          landlord and the tenant, plus a contact phone number for each.
        </li>
        <li>
          <strong>The property.</strong> The exact address and a description of
          what is being let, for example &ldquo;Flat 2, a 3-bedroom flat&rdquo;
          rather than just the building name.
        </li>
        <li>
          <strong>The term.</strong> The start date and end date, and whether it
          runs yearly, quarterly, or monthly.
        </li>
        <li>
          <strong>The rent.</strong> The amount in naira, how often it is paid,
          the due date, and the accepted payment method.
        </li>
        <li>
          <strong>Fees and deposits.</strong> Security deposit, caution fee,
          agreement fee, legal fee, agent fee, and service charge, with the exact
          amount of each and the conditions for refund.
        </li>
        <li>
          <strong>Responsibilities.</strong> Who handles repairs, utilities,
          waste, and service charges, and what the tenant may not do (subletting,
          structural changes, and so on).
        </li>
        <li>
          <strong>Renewal and termination.</strong> How rent is reviewed at
          renewal, the notice period each side must give, and what counts as a
          breach.
        </li>
        <li>
          <strong>Signatures.</strong> Both parties sign and date, ideally with a
          witness for each.
        </li>
      </ul>

      <h2>Nigerian fees you should spell out</h2>
      <p>
        Nigerian rentals carry a stack of one-off fees that confuse tenants when
        they are not written down. Be explicit about each:
      </p>
      <ul>
        <li>
          <strong>Security deposit</strong> and <strong>caution fee</strong>:
          refundable amounts held against damage or unpaid bills. State clearly
          what can be deducted and when the balance is returned.
        </li>
        <li>
          <strong>Agreement fee</strong> and <strong>legal fee</strong>: the cost
          of preparing the paperwork.
        </li>
        <li>
          <strong>Agent fee</strong>: commission, where an agent is involved.
        </li>
        <li>
          <strong>Service charge</strong>: recurring costs for shared facilities
          such as security, a generator, or cleaning.
        </li>
      </ul>

      <h2>Common mistakes to avoid</h2>
      <ul>
        <li>Leaving the rent review or renewal terms vague.</li>
        <li>Not stating the notice period for either party to end the tenancy.</li>
        <li>Failing to list which fees are refundable and which are not.</li>
        <li>Using one tenant&apos;s name when several adults will live there.</li>
        <li>Not keeping a signed copy you can find later.</li>
      </ul>

      <h2>Issue it and keep it safe</h2>
      <p>
        A signed agreement that you cannot locate two years later is almost as bad
        as no agreement. Once both parties sign, each should keep a copy, and you
        should store yours somewhere it is tied to that specific tenant and unit.
      </p>
      <p>
        This is where doing it digitally pays off. With{" "}
        <Link href="/landlord">Property360</Link>, you can generate or upload a
        tenancy agreement, attach it directly to the tenant&apos;s lease, and find
        it instantly whenever you need it. The lease also carries the rent, the
        fees, and the payment history in the same place, so the agreement is never
        floating on its own.
      </p>

      <h2>Frequently asked questions</h2>
      <h3>Does a tenancy agreement have to be stamped?</h3>
      <p>
        Stamping by the relevant state stamp duty office gives the document
        stronger standing in court and is recommended, especially for higher-value
        or longer tenancies. Practice varies by state, so confirm the current
        requirement locally.
      </p>
      <h3>Can I use the same agreement for every tenant?</h3>
      <p>
        You can use the same template, but the parties, property, dates, rent, and
        fees must be filled in for each tenant. A reusable template saves time as
        long as the specifics are correct every time.
      </p>

      <p className="text-[14px] text-ink-muted">
        This article is general information for Nigerian landlords and tenants, not
        legal advice. For a specific dispute or a high-value tenancy, consult a
        qualified lawyer.
      </p>
    </>
  );
}
