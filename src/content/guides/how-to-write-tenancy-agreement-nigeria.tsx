import { guideSources } from "./sources";
import { GuideTable } from "@/components/marketing/GuideTable";
import Link from "next/link";
import type { GuideMeta } from "./types";
import { guidePhotos } from "./photos";

export const meta: GuideMeta = {
  slug: "how-to-write-tenancy-agreement-nigeria",
  coverImage: guidePhotos.paperwork,
  title: "Tenancy Agreement in Nigeria: What to Include",
  heading: "How to write a tenancy agreement in Nigeria",
  description:
    "Learn what to include in a Nigerian tenancy agreement, from rent and fees to repairs, notice, handover and the records each party should keep.",
  keywords: [
    "tenancy agreement Nigeria",
    "how to write a tenancy agreement",
    "tenancy agreement template Nigeria",
    "lease agreement Nigeria",
    "landlord tenant agreement",
  ],
  datePublished: "2026-06-23",
  dateModified: "2026-11-26",
  readingMinutes: 5,
  category: "Leases",
  author: "Property360 Editorial Team",
  stockPhoto: {
    src: "/guides/stock/how-to-write-tenancy-agreement-nigeria.webp",
    alt: "A hand holding a pen over a document.",
    caption:
      "Put names, rent, dates, fees and notice obligations in writing before signing.",
    sourceUrl:
      "https://images.unsplash.com/photo-1521791055366-0d553872125f?auto=format&fit=crop&w=1200&h=800&q=82",
    licenseUrl: "https://unsplash.com/license",
  },
  scopeNote:
    "A practical drafting checklist. The agreement, tenancy type and law applicable to the property determine the legal position; obtain local advice before using a template.",
  standfirst:
    "A good agreement makes the rent, responsibilities, notices and refund rules clear before there is a disagreement. Use this practical checklist to get the essentials on paper.",
  tags: ["tenancy agreement", "leases", "landlord guide"],
  takeaways: [
    {
      title: "Write the facts, not assumptions",
      body: "Names, address, rent period, every fee and the exact start/end dates should be specific enough for someone outside the deal to understand.",
    },
    {
      title: "Plan handover at move-in",
      body: "Describe the inspection, keys, final bills and deposit accounting before either party needs them. Have notice and termination terms checked locally.",
    },
  ],
  faqs: [
    {
      question: "Can I use a tenancy-agreement template?",
      answer:
        "A template can provide a starting structure, but it must be completed for the actual parties, property, rent, dates and applicable state rules. Obtain legal advice for unusual terms or a high-value arrangement.",
    },
    {
      question: "Should the agreement list every fee separately?",
      answer:
        "Yes. A separate amount, purpose, recipient and refund condition for each fee makes the first payment easier to check and future disputes easier to resolve.",
    },
  ],
  sources: [guideSources.tenancyLaw],
  checklist: [
    "Write the full legal names of every landlord and tenant.",
    "Describe the exact property and the tenancy dates.",
    "List rent and every fee separately, including refund conditions.",
    "Write down repair, utility, renewal, and notice responsibilities.",
    "Give each party a signed copy and keep a retrievable record.",
  ],
};

export function Body() {
  return (
    <>
      <p>
        A useful tenancy agreement lets a landlord and tenant find the same
        answer to a simple question: what exactly did we agree? Start with the
        people, the home, the dates and the money, then describe how the tenancy
        will work in practice. This guide is a drafting checklist to discuss
        with a qualified local professional.
      </p>

      <h2>Confirm who is making the agreement</h2>
      <p>
        Write the landlord&apos;s and tenant&apos;s full names and contact
        addresses. If a manager or agent acts for the landlord, identify that
        role and ask for evidence of authority to sign or receive money. A name
        on a business card or the ability to show a flat is insufficient by
        itself to establish that authority.
      </p>
      <p>
        Identify everyone who is actually entering the contract. Additional
        occupants, emergency contacts and guarantors may have different roles;
        listing someone as a resident should not silently make them a guarantor.
        Anyone asked to sign a guarantee should understand the obligation and
        have an opportunity to obtain advice.
      </p>

      <h2>Describe the home and the period precisely</h2>
      <p>
        Include the street address, building and flat number, together with any
        parking space, store, furniture or shared facilities included. Record
        the start and end dates and the rent payment schedule separately. An
        annual rent figure does not explain whether the parties have agreed to
        one payment or several instalments.
      </p>
      <p>
        In the published Lagos Tenancy Law 2011, section 3 recognises oral,
        written and implied agreements. A written record is useful, but its
        absence does not by itself settle whether a tenancy exists.
      </p>

      <h2>Give every payment its own line</h2>
      <p>
        Set out the rent, deposit and any separately agreed fee. For each,
        record the amount, purpose, recipient, due date and refund conditions.
        Ask about unexplained charges before signing. Including a charge in a
        draft is a proposal to assess, rather than proof that the charge is
        permitted by the law governing the property.
      </p>
      <GuideTable
        caption="Details to settle before signing"
        columns={["Term", "A useful written answer"]}
        rows={[
          [
            "Rent",
            "Amount, currency, coverage dates, due dates and payment recipient",
          ],
          [
            "Deposit",
            "What it secures, evidence for deductions and the accounting timetable",
          ],
          [
            "Service charge",
            "Included services, billing period and how changes are communicated",
          ],
          [
            "Repairs",
            "Reporting contact, access arrangements and how responsibility is agreed",
          ],
        ]}
      />

      <h2>Replace vague promises with a process</h2>
      <p>
        &ldquo;The landlord will fix the bathroom&rdquo; leaves several
        questions unanswered. A more useful record identifies the defective
        fitting, the proposed work, the responsible person and an agreed date
        for checking completion. Keep this repair list as an attachment and make
        sure the signed agreement refers to it.
      </p>
      <p>
        Describe how routine maintenance is reported, who arranges access and
        how urgent problems are escalated. For shared power, water, cleaning or
        security, ask how costs are calculated and which services are included.
        Avoid signing an obligation you cannot explain in ordinary language. Our{" "}
        <Link href="/guides/how-to-report-rental-maintenance">
          maintenance guide
        </Link>{" "}
        gives a practical reporting example.
      </p>

      <h2>Prepare for renewal and handover</h2>
      <p>
        Identify any rent-review clause, renewal discussion date and notice
        terms. Ask a local lawyer to check their legal effect, including any
        service, stamping or registration requirements. A downloaded template
        cannot resolve those questions for every state or type of tenancy.
      </p>
      <p>
        Agree a condition record at move-in, with dated photographs, meter
        readings, keys and included items. Use the same record at move-out.
        Write down how the final inspection, bills and any deposit accounting
        will be handled. See our{" "}
        <Link href="/guides/caution-fee-vs-security-deposit-nigeria">
          deposit guide
        </Link>{" "}
        for an example of an itemised calculation.
      </p>

      <h2>Read the finished draft as one document</h2>
      <p>
        Check names, unit number, dates and totals against the quote and payment
        instructions. Resolve contradictions between the main agreement and its
        attachments. For example, a clause describing a refundable deposit needs
        to be reconciled with a separate statement that all payments are
        non-refundable; do not leave the parties to discover that conflict at
        handover.
      </p>
      <p>
        Each party should receive the complete signed version and attachments.
        Keep later changes with that version and preserve earlier copies. Clear
        drafting helps the parties understand their arrangement; a qualified
        lawyer should assess unusual clauses and disputed rights.
      </p>
    </>
  );
}
