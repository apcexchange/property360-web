import Link from "next/link";
import type { GuideMeta } from "./types";

export const meta: GuideMeta = {
  slug: "rent-increase-rules-nigeria",
  title: "Rent Increase in Nigeria: How Much and How Often Can Rent Go Up?",
  heading: "Rent increase rules in Nigeria",
  description:
    "Can a landlord increase rent every year in Nigeria? How much notice is needed, what counts as unreasonable, and how landlords and tenants can handle rent reviews fairly.",
  keywords: [
    "rent increase Nigeria",
    "how much can a landlord increase rent",
    "rent review Nigeria",
    "unreasonable rent increase",
    "rent increase notice",
  ],
  datePublished: "2026-06-23",
  readingMinutes: 5,
  category: "Leases",
};

export function Body() {
  return (
    <>
      <p>
        Rent reviews are a frequent source of friction between Nigerian landlords
        and tenants. Landlords face rising costs and want to keep rent in line with
        the market. Tenants want stability and fair warning. Here is a practical
        look at how rent increases work, and how to handle them without losing a
        good tenant or ending up in a dispute.
      </p>

      <h2>Can a landlord increase rent in Nigeria?</h2>
      <p>
        Yes. A landlord can review rent, usually at the end of a tenancy term when
        it is up for renewal. What a landlord generally cannot do is increase the
        rent partway through a fixed term that has already been agreed and paid for.
        If a tenant has paid for the year, that price holds for the year.
      </p>

      <h2>How much notice should a tenant get?</h2>
      <p>
        A rent increase should not arrive as a surprise on the day rent is due. The
        fair and common practice is to give the tenant reasonable written notice
        ahead of renewal, so they can decide whether to accept the new rent or make
        other arrangements. Putting the renewal and review terms in the tenancy
        agreement removes the guesswork for both sides.
      </p>

      <h2>What counts as an unreasonable increase?</h2>
      <p>
        Some states, Lagos among them, have provisions allowing a tenant to
        challenge a rent increase they consider unreasonable, with a tribunal or
        court able to assess what is fair for comparable properties in the area.
        The practical test is whether the new rent is in line with similar units
        nearby. A sharp jump well above the local market is more likely to be
        contested.
      </p>

      <h2>How to handle a rent review well</h2>
      <ul>
        <li>
          <strong>Put it in the agreement.</strong> State when and how rent will be
          reviewed at renewal.
        </li>
        <li>
          <strong>Give written notice early.</strong> Tell the tenant before
          renewal, not at the last minute.
        </li>
        <li>
          <strong>Benchmark the market.</strong> Base the new figure on what
          comparable units in the area actually rent for.
        </li>
        <li>
          <strong>Keep good tenants in mind.</strong> A reliable tenant who pays on
          time is worth more than a small increase that pushes them out and leaves
          the unit empty.
        </li>
      </ul>

      <h2>Renewals made simple</h2>
      <p>
        Rent reviews are easier when you can see the full picture: when each lease
        ends, what the tenant currently pays, and how reliably they have paid.{" "}
        <Link href="/landlord">Property360</Link> tracks each lease and its
        renewal date, lets you renew with updated terms, and keeps the payment
        history that tells you which tenants are worth keeping. You raise rent from
        a position of information, not guesswork.
      </p>

      <p className="text-[14px] text-ink-muted">
        This article is general information, not legal advice. Rent control and
        tenancy rules vary by state in Nigeria. Check the current law in your state
        before acting.
      </p>
    </>
  );
}
