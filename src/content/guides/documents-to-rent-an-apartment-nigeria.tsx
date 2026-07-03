import Link from "next/link";
import type { GuideMeta } from "./types";

export const meta: GuideMeta = {
  slug: "documents-to-rent-an-apartment-nigeria",
  title: "Documents You Need to Rent an Apartment in Nigeria",
  heading: "Documents you need to rent an apartment in Nigeria",
  description:
    "A simple checklist of what landlords and agents ask for before you rent in Nigeria: ID, proof of income, a guarantor, references, and the tenancy agreement.",
  keywords: [
    "documents to rent apartment Nigeria",
    "what you need to rent a house Nigeria",
    "tenancy requirements Nigeria",
    "guarantor for rent Nigeria",
    "rent apartment checklist",
  ],
  datePublished: "2026-06-24",
  readingMinutes: 5,
  category: "Renting",
};

export function Body() {
  return (
    <>
      <p>
        Once you&apos;ve found a place, the landlord or agent will ask for a few
        things before handing over the keys. Having them ready makes you a more
        attractive tenant and speeds the whole process up. Here&apos;s the typical
        checklist in Nigeria.
      </p>

      <h2>1. A valid means of identification</h2>
      <p>
        Expect to provide a government-issued ID, your NIN, driver&apos;s licence,
        international passport, or voter&apos;s card. Increasingly, platforms run a
        KYC check, which also protects you, since it means the landlord has been
        verified too.
      </p>

      <h2>2. Proof of income or employment</h2>
      <p>
        Landlords want comfort that you can pay. That might be a letter of
        employment, recent payslips, bank statements, or for business owners, proof
        of the business. The bar is higher for premium units.
      </p>

      <h2>3. A guarantor</h2>
      <p>
        Many landlords ask for a guarantor, someone who vouches for you and can be
        contacted if there&apos;s an issue. Have their name, occupation, address
        and phone number ready, and check they&apos;re willing before you list
        them.
      </p>

      <h2>4. References</h2>
      <p>
        A previous landlord or an employer reference can tip a decision in your
        favour, especially in a competitive area.
      </p>

      <h2>5. The tenancy agreement</h2>
      <p>
        This is the document that protects both sides. Read it before signing and
        make sure it names the rent, the term, every fee, and the conditions for
        refunds. See our guide on{" "}
        <Link href="/guides/how-to-write-tenancy-agreement-nigeria">
          writing a tenancy agreement
        </Link>
        .
      </p>

      <h2>6. The money, ready and traceable</h2>
      <p>
        Have your first payment ready, rent plus the move-in fees, and pay it in a
        way that leaves a record. Never hand over untraceable cash, and get a
        receipt for everything.
      </p>

      <h2>Make it easier on both sides</h2>
      <p>
        On <Link href="/tenant">Property360</Link>, your KYC, lease, signed
        tenancy agreement and every receipt live in one place, so you&apos;re not
        digging through email or WhatsApp when you need them. You can{" "}
        <Link href="/listings">browse verified homes</Link> and reserve when
        you&apos;re ready.
      </p>

      <p className="text-[14px] text-ink-muted">
        This article is general guidance. Exact requirements vary by landlord,
        property type and location.
      </p>
    </>
  );
}
