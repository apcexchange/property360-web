import { guideSources } from "./sources";
import { GuideTable } from "@/components/marketing/GuideTable";
import Link from "next/link";
import type { GuideMeta } from "./types";
import { guidePhotos } from "./photos";

export const meta: GuideMeta = {
  slug: "agent-fees-in-nigeria-explained",
  coverImage: guidePhotos.budget,
  title: "Rental Agent Fees in Nigeria: What to Check",
  heading: "Agent and agency fees in Nigeria, explained",
  description:
    "Understand rental agent, agency, agreement and legal fees in Nigeria. Get a written breakdown, verify recipients and know what to check before paying.",
  keywords: [
    "agent fee Nigeria",
    "agency fee Nigeria",
    "how much is agent fee",
    "legal fee rent Nigeria",
    "Lagos tenancy law fees",
  ],
  datePublished: "2026-06-24",
  dateModified: "2026-11-26",
  readingMinutes: 5,
  category: "Payments",
  author: "Property360 Editorial Team",
  articleImage: {
    src: "/images/guides/generated/article-agent-fees.webp",
    alt: "A miniature house model beside a piggy bank.",
    caption:
      "Ask for an itemised fee breakdown and confirm the recipient and service before paying.",
  },
  scopeNote:
    "Fee names and permitted charges depend on the transaction and location. This guide helps you assess a quote; it does not set a national fee percentage or decide whether a charge is lawful.",
  standfirst:
    "Before you pay, turn every verbal fee into a written line item: who receives it, what it pays for, whether it is refundable, and the receipt you will receive.",
  tags: ["agent fees", "rental costs", "tenant checklist"],
  takeaways: [
    {
      title: "Ask for the total before you inspect",
      body: "An early itemised estimate prevents a headline rent from becoming an unaffordable move-in bill after time and transport have been spent.",
    },
    {
      title: "A receipt is part of the service",
      body: "Match each transfer to a named recipient, purpose and amount. Keep it with the agreement and any inventory record.",
    },
  ],
  faqs: [
    {
      question: "Is a quoted percentage automatically legal?",
      answer:
        "No. A familiar market percentage is not a substitute for a written explanation of the service, the agreement and the rules that apply in the state.",
    },
    {
      question: "Should I pay an agreement fee before seeing an agreement?",
      answer:
        "Ask what document will be provided, who prepares it and when you will receive a signed copy. Do not rely on an undefined verbal promise.",
    },
  ],
  sources: [guideSources.tenancyLaw],
  checklist: [
    "Ask for a written breakdown of every fee before paying.",
    "Confirm who receives each fee and what service it covers.",
    "Check current rules for the state and type of tenancy.",
    "Get a receipt for each payment and keep it with the agreement.",
    "Do not rely on a verbal promise that a fee is refundable.",
  ],
};

export function Body() {
  return (
    <>
      <p>
        The annual rent on an advertisement may be only one part of the cash
        requested before move-in. Ask for a written, itemised quote before
        deciding whether a home fits your budget. Then check what each fee pays
        for, who receives it and whether it repeats at renewal.
      </p>

      <h2>Separate the services being charged for</h2>
      <p>
        A quote may include an agent or agency fee for arranging the letting, an
        agreement or legal fee for document preparation, and a service charge
        for shared facilities. Ask the person issuing the quote to explain their
        own labels. Do not assume that &ldquo;agreement&rdquo; and
        &ldquo;legal&rdquo; describe two separate services simply because both
        appear on the list.
      </p>
      <p>
        Deposits need a separate explanation because they may be held for later
        accounting. Ask whether money is paid for a completed service, held
        against an obligation or credited towards rent. Our
        <Link href="/guides/caution-fee-vs-security-deposit-nigeria">
          {" "}
          deposit guide
        </Link>{" "}
        explains the records to request for money held against damage or bills.
      </p>

      <h2>Turn a percentage into a checkable amount</h2>
      <p>
        If a charge is expressed as a percentage, ask which figure it is based
        on and what period it covers. A percentage of one year&apos;s rent and a
        percentage of several years&apos; rent produce different totals. Ask for
        the final naira amount and whether any other charge will be added before
        you agree.
      </p>
      <p>
        Arithmetic does not establish whether a charge is permitted. Ask which
        state rules, professional rules and contractual terms apply. Section 11
        of the published Lagos Tenancy Law 2011 concerns professional fees; it
        is not a nationwide fee schedule.
      </p>

      <h2>Compare the whole quote</h2>
      <p>
        These invented quotes illustrate why a lower rent can still require more
        cash upfront. The fees are hypothetical, not recommended rates or market
        averages. No conclusion about their lawfulness is implied.
      </p>
      <GuideTable
        caption="Illustrative move-in quotes for two homes"
        columns={["Quoted item", "Home A", "Home B"]}
        rows={[
          ["Annual rent", "₦1,200,000", "₦1,100,000"],
          ["Agency service", "₦90,000", "₦130,000"],
          ["Document preparation", "₦40,000", "₦60,000"],
          ["Deposit held", "₦100,000", "₦180,000"],
          ["Service charge paid upfront", "₦80,000", "₦120,000"],
          ["Total cash quoted", "₦1,510,000", "₦1,590,000"],
        ]}
      />
      <p>
        Home B&apos;s headline rent is ₦100,000 lower, but its quoted upfront
        total is ₦80,000 higher. Some money may be refundable later; it still
        needs funding now. Put your actual quote into the
        <Link href="/guides/tools/move-in-cost-calculator">
          {" "}
          move-in cost calculator
        </Link>{" "}
        and add transport, furnishing and other costs you expect to incur.
      </p>

      <h2>Verify each recipient before transferring</h2>
      <p>
        Request the name of the landlord or authorised representative and a
        written payment instruction identifying the service and amount. Confirm
        unexpected account changes through a contact route you independently
        trust. A company account, individual account or polished invoice is
        insufficient on its own to establish authority.
      </p>
      <p>
        If a viewing fee is proposed, clarify what viewing it covers, when the
        appointment takes place and the cancellation or refund terms before
        paying. A small initial payment should not become a reason to skip
        verification before a much larger transfer.
      </p>

      <h2>Ask what happens if the letting does not proceed</h2>
      <p>
        Obtain written answers about withdrawn applications, failed checks, an
        unavailable property and work already carried out. Distinguish a payment
        reserved towards rent from a separate service fee. Do not assume that
        all charges share the same refund conditions.
      </p>
      <p>
        Save the quote, accepted terms, payment evidence and receipt together.
        If a new charge appears after you paid, request its basis and the
        earlier agreement said to support it. A receipt shows what was paid; it
        does not settle whether a disputed charge was authorised. Take
        unresolved questions to an appropriate local adviser or regulator.
      </p>
    </>
  );
}
