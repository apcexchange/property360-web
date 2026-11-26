import { guideSources } from "./sources";
import { GuideTable } from "@/components/marketing/GuideTable";
import Link from "next/link";
import type { GuideMeta } from "./types";
import { guidePhotos } from "./photos";

export const meta: GuideMeta = {
  slug: "caution-fee-vs-security-deposit-nigeria",
  coverImage: guidePhotos.budget,
  title: "Caution Fee vs Security Deposit in Nigeria",
  heading: "Caution fee vs security deposit in Nigeria",
  description:
    "Caution fee vs security deposit in Nigeria: learn what each may cover, what your agreement should say, and how to document a fair refund.",
  keywords: [
    "caution fee Nigeria",
    "security deposit Nigeria",
    "caution fee vs security deposit",
    "is caution fee refundable",
    "rent fees Nigeria",
  ],
  datePublished: "2026-06-23",
  dateModified: "2026-11-26",
  readingMinutes: 5,
  category: "Payments",
  author: "Property360 Editorial Team",
  stockPhoto: {
    src: "/guides/stock/caution-fee-vs-security-deposit-nigeria.webp",
    alt: "A detached home and swimming pool in a landscaped garden.",
    caption:
      "Define what each deposit covers and document the property's condition at handover.",
    sourceUrl:
      "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&h=800&q=82",
    licenseUrl: "https://unsplash.com/license",
  },
  scopeNote:
    "A guide to documenting deposits and deductions. Refund rights depend on the facts, agreement and applicable law; the worked amounts are illustrative.",
  standfirst:
    "Before paying a deposit, agree what it secures, how deductions will be evidenced and when the account will be settled. Keep the same condition record at move-in and handover.",
  tags: ["security deposit", "caution fee", "move-in costs"],
  takeaways: [
    {
      title: "Give every payment one purpose",
      body: "If two deposits are collected, the agreement should say what each covers rather than leaving a landlord free to label deductions after move-out.",
    },
    {
      title: "Create a handover record",
      body: "Photos, meter readings, key counts and an agreed condition list make a later refund calculation evidence-based.",
    },
  ],
  faqs: [
    {
      question: "Is a caution fee always refundable?",
      answer:
        "The name alone does not decide that. Check the agreement, evidence and applicable law. Ask for written refund conditions and an itemised explanation of any proposed deduction.",
    },
    {
      question: "Can one deposit cover unpaid bills and damage?",
      answer:
        "The parties can agree on one combined deposit, but the agreement should clearly state the risks it secures and require an itemised accounting at handover.",
    },
  ],
  sources: [guideSources.tenancyLaw],
  checklist: [
    "Ask whether each payment is refundable and what deductions may apply.",
    "Record the amount, purpose, recipient, and payment date for every fee.",
    "Get a receipt and keep it with the tenancy agreement.",
    "Agree how and when any refundable balance will be returned.",
  ],
};

export function Body() {
  return (
    <>
      <p>
        A quote may call money a caution fee, a security deposit or both. Before
        comparing the labels, ask what each payment secures and how its balance
        will be accounted for. The useful distinction is in the agreed purpose,
        permitted deductions and applicable rules, rather than the name alone.
      </p>

      <h2>Ask why there are two charges</h2>
      <p>
        If a landlord describes a caution fee as protection against damage and a
        security deposit as cover for unpaid bills, write those explanations
        down. Ask whether one incident could be charged against both amounts and
        how duplicate deductions would be avoided. If one combined deposit is
        proposed, clarify all the obligations it is intended to secure.
      </p>
      <p>
        A fee for a completed service, a payment held for later accounting and
        rent for a specified period have different purposes. Keep them on
        separate lines. Do not assume that a label makes a payment refundable or
        non-refundable without checking the agreement and applicable law.
      </p>

      <h2>Settle the accounting process before payment</h2>
      <p>
        Request the amount, recipient, receipt, permitted deductions and the
        proposed refund timetable in writing. Ask who will hold the money and
        how both parties can obtain a statement. Section 10 of the published
        Lagos Tenancy Law 2011 deals with service charges and deposits; a lawyer
        should check its application to the specific property.
      </p>
      <p>
        If the draft says &ldquo;refundable after inspection&rdquo;, ask when
        the inspection will happen and how any unresolved utility bill will be
        handled. A timetable agreed in advance gives both parties a reference
        for follow-up. This guide does not prescribe a universal refund
        deadline.
      </p>

      <h2>Create a condition record that can be compared</h2>
      <p>
        At move-in, list included items and visible defects room by room. Take
        dated photographs with permission and note meter readings and key
        counts. Mark an appliance as untested if it could not be demonstrated.
        Share the record so an omission can be raised while it is still easy to
        check. Our{" "}
        <Link href="/guides/apartment-inspection-checklist-nigeria">
          inspection checklist
        </Link>{" "}
        helps organise that visit.
      </p>
      <p>
        Use the same list at handover. Identify what changed and the evidence
        for it before discussing a deduction. An existing mark, an ageing
        fitting and a new breakage need separate consideration. Photos help
        establish condition; they do not decide responsibility on their own.
      </p>

      <h2>A worked deposit statement</h2>
      <p>
        The following figures are invented to show the arithmetic. They are not
        a typical Nigerian deposit, a recommended charge or a ruling that a
        deduction is permitted. In this example, both parties have checked the
        supporting records and agreed the two deductions.
      </p>
      <GuideTable
        caption="Illustrative deposit accounting"
        columns={["Entry", "Amount", "Supporting record"]}
        rows={[
          ["Deposit received", "₦120,000", "Original receipt"],
          [
            "Agreed repair deduction",
            "−₦15,000",
            "Condition record and repair invoice",
          ],
          ["Agreed utility balance", "−₦5,000", "Final bill and allocation"],
          ["Balance to return", "₦100,000", "₦120,000 − ₦15,000 − ₦5,000"],
        ]}
      />
      <p>
        A useful statement explains the issue, amount and evidence for each
        entry. Avoid a single &ldquo;repairs&rdquo; figure with no supporting
        detail. Record when the balance is returned and its payment reference,
        keeping the original deposit receipt in the same file.
      </p>

      <h2>Handle disagreement as a separate question</h2>
      <p>
        A tenant can ask for the agreement clause, condition evidence and cost
        calculation behind an amount withheld. A landlord can ask for evidence
        contradicting a proposed deduction. Mark disputed entries clearly and
        keep the correspondence. Do not rewrite the original receipt to make an
        unresolved amount disappear.
      </p>
      <p>
        If a final utility bill has not arrived, discuss how it will be checked
        and when the remaining account will be reviewed. Obtain local advice
        where the parties cannot agree on responsibility, deductions or timing.
        An inspection checklist or receipt cannot override rights under the law
        governing the tenancy.
      </p>
    </>
  );
}
