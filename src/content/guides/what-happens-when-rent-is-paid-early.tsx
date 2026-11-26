import { guideSources } from "./sources";
import { GuideTable } from "@/components/marketing/GuideTable";
import Link from "next/link";
import type { GuideMeta } from "./types";
import { guidePhotos } from "./photos";

export const meta: GuideMeta = {
  slug: "what-happens-when-rent-is-paid-early",
  coverImage: guidePhotos.payments,
  title: "Early Rent Payment: How to Record It",
  heading: "What happens when a tenant pays rent early?",
  description:
    "Learn how landlords and tenants can record an early rent payment, state the period it covers, issue a receipt and avoid duplicate invoices.",
  keywords: [
    "tenant pays rent early",
    "early rent payment",
    "rent renewal payment",
    "rent receipt",
    "lease renewal",
  ],
  datePublished: "2026-09-28",
  dateModified: "2026-11-26",
  readingMinutes: 5,
  category: "Payments",
  author: "Property360 Editorial Team",
  stockPhoto: {
    src: "/guides/stock/what-happens-when-rent-is-paid-early.webp",
    alt: "Financial forms and a calculator arranged on a desk.",
    caption:
      "Record the date received and the rental period the payment is meant to cover.",
    sourceUrl:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&h=800&q=82",
    licenseUrl: "https://unsplash.com/license",
  },
  scopeNote:
    "Recordkeeping guidance for an early payment. Its legal effect and any advance-rent limits depend on the agreement, facts and law applicable to the property.",
  standfirst:
    "An early renewal payment should create a precise record for a future period—not a second tenancy today and not a duplicate invoice later.",
  tags: ["early rent payment", "rent receipt", "lease renewal"],
  takeaways: [
    {
      title: "Record what the money covers",
      body: "The payment date and the rent period are different facts. Show both, especially when payment arrives before the current term ends.",
    },
    {
      title: "Do not manufacture a duplicate debt",
      body: "Once a full future term is confirmed and receipted, the system should not automatically issue a second bill for the same term.",
    },
  ],
  faqs: [
    {
      question: "Does early payment automatically renew a lease?",
      answer:
        "Not by itself. Check what the agreement says and document any changed rent, dates, occupants or other terms in the appropriate renewal record.",
    },
    {
      question: "What if the payment is only partial?",
      answer:
        "Record it as a part payment, show the outstanding balance and do not label the future term fully paid until the balance is confirmed.",
    },
  ],
  sources: [guideSources.paymentVerification],
  checklist: [
    "Confirm the amount and transaction against the correct tenant and unit.",
    "State the exact future rent period covered by the payment.",
    "Issue a receipt and record the payment reference.",
    "Keep the existing lease active until its agreed end date.",
    "Avoid a duplicate invoice for a term that has already been paid.",
  ],
};

export function Body() {
  return (
    <>
      <p>
        An early payment needs two dates in the record: when the money was
        confirmed and which rent period it is intended to cover. Keeping those
        separate helps prevent duplicate invoices and confusion at renewal. The
        accounting entry should describe the parties&apos; arrangement, rather
        than decide its legal effect.
      </p>

      <h2>Ask what the money is for</h2>
      <p>
        Match the payer, property and unit before allocating a transfer. Confirm
        whether it is current rent, a future period, a deposit, part payment or
        another agreed amount. If the tenant&apos;s message and the invoice
        disagree, ask for clarification and keep the reply with the transaction
        record.
      </p>
      <p>
        Where a future tenancy or renewal is still being discussed, record that
        status accurately. A receipt can acknowledge money received while
        leaving a question about proposed terms unresolved. Obtain local legal
        advice if acceptance, refund or the tenancy&apos;s status is disputed; a
        ledger label cannot answer those questions.
      </p>

      <h2>Confirm receipt and preserve the transaction reference</h2>
      <p>
        For a provider payment, check its actual status. Paystack&apos;s
        verification documentation distinguishes a confirmed success from a
        pending, failed or reversed transaction. For a bank transfer, check the
        receiving account rather than relying solely on a screenshot. Link the
        reference to the tenant and intended period.
      </p>
      <p>
        If the amount is unexpected, clarify it before assigning the surplus to
        another fee or month. If it is a duplicate, document the agreed
        correction or refund and retain the original entry. Record subsequent
        changes so the bank history and rent account remain reconcilable.
      </p>

      <h2>A dated example</h2>
      <p>
        In this invented example, a current agreement ends on 31 March 2027. The
        parties have documented an annual renewal covering 1 April 2027 to 31
        March 2028 for ₦1,200,000. The tenant makes a confirmed payment on 15
        February 2027. These are illustrative dates and amounts, not a
        recommendation to collect a particular advance rent.
      </p>
      <GuideTable
        caption="Illustrative early-payment record"
        columns={["Field", "Entry"]}
        rows={[
          ["Confirmed payment date", "15 February 2027"],
          ["Rent coverage", "1 April 2027–31 March 2028"],
          ["Amount allocated to that period", "₦1,200,000"],
          [
            "Remaining rent for that agreed period",
            "₦0, assuming no other adjustments",
          ],
          [
            "Current agreement record",
            "Retain its actual end date of 31 March 2027",
          ],
        ]}
      />
      <p>
        The point is to retain the real coverage dates. Moving the renewal start
        date to February to match the transfer would make the records describe a
        different period from the one agreed.
      </p>

      <h2>Show part payments honestly</h2>
      <p>
        If only ₦800,000 of that illustrative ₦1,200,000 rent is confirmed,
        record a part payment and a ₦400,000 balance. Do not mark the period
        fully paid because the tenant intends to send the rest later. Keep any
        deposit or service charge separate so a total transfer is not mistaken
        for the rent component.
      </p>
      <p>
        If a due date or instalment plan changes, keep the written agreement
        about that change. A balance figure tells you what remains after
        allocation; it does not explain when the parties agreed to pay it.
      </p>

      <h2>Check reminders against the allocation</h2>
      <p>
        Before requesting the next payment, compare the invoice period with
        money already allocated to it. Suppress or correct a duplicate request
        for rent already confirmed against that period, while keeping genuinely
        unpaid items visible. Preserve an audit note if an invoice is cancelled
        or corrected rather than deleting the history.
      </p>
      <p>
        A tenant who receives a duplicate reminder can send the original
        reference and coverage dates and ask for reconciliation. Keep the reply
        with the receipt so the same issue does not have to be reconstructed at
        the next review.
      </p>

      <h2>Document renewal terms separately</h2>
      <p>
        A changed rent, duration, occupant or service arrangement belongs in the
        appropriate renewal or written variation. Check applicable local rules
        before collecting or accepting advance rent. Use the
        <Link href="/guides/how-to-write-tenancy-agreement-nigeria">
          {" "}
          agreement checklist
        </Link>{" "}
        to review the documents and the
        <Link href="/guides/rent-increase-rules-nigeria">
          {" "}
          rent-review guide
        </Link>{" "}
        for an unresolved proposed increase.
      </p>
      <p>
        These recordkeeping steps work with a platform or a carefully kept
        ledger. Confirm the current behaviour of any software automation before
        relying on it to prevent duplicate billing. The people responsible for
        the account should still review allocations, reversals and corrections.
      </p>
    </>
  );
}
