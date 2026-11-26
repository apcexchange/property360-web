import { guideSources } from "./sources";
import { GuideTable } from "@/components/marketing/GuideTable";
import Link from "next/link";
import type { GuideMeta } from "./types";
import { guidePhotos } from "./photos";

export const meta: GuideMeta = {
  slug: "how-to-collect-rent-online-nigeria",
  coverImage: guidePhotos.payments,
  title: "Collect Rent Online in Nigeria: Landlord Guide",
  heading: "How to collect rent online in Nigeria",
  description:
    "Learn to collect rent online in Nigeria, compare payment providers, send clear invoices and receipts, and reconcile digital and offline payments accurately.",
  keywords: [
    "collect rent online Nigeria",
    "online rent payment Nigeria",
    "rent collection app Nigeria",
    "Paystack rent",
    "how to collect rent from tenants",
  ],
  datePublished: "2026-06-23",
  dateModified: "2026-11-26",
  readingMinutes: 5,
  category: "Payments",
  author: "Property360 Editorial Team",
  stockPhoto: {
    src: "/guides/stock/how-to-collect-rent-online-nigeria.webp",
    alt: "A customer paying with a smartphone at a counter.",
    caption:
      "Match each transaction to the right tenant and rent period, then issue a clear receipt.",
    sourceUrl:
      "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&h=800&q=82",
    licenseUrl: "https://unsplash.com/license",
  },
  scopeNote:
    "A collection and reconciliation workflow. Payment methods, fees, confirmation and settlement depend on the provider and account; check current terms.",
  standfirst:
    "Online collection works when every payment has a tenant, a rent period, a verifiable transaction reference and a receipt—not when it is merely a transfer notification in a chat.",
  tags: ["rent collection", "online payments", "landlord operations"],
  takeaways: [
    {
      title: "A payment alert is not reconciliation",
      body: "Confirm the transaction with the provider or bank record, then match it to the exact tenant, unit and covered rent period.",
    },
    {
      title: "Receipts protect both sides",
      body: "A useful receipt states amount, date, method, reference and coverage period. It should never expose card credentials or other sensitive payment information.",
    },
  ],
  faqs: [
    {
      question: "Can I record cash and bank transfer with online payments?",
      answer:
        "Yes, if the same ledger clearly records the method, reference, payer and rent period. The aim is one reconciled record, not one payment channel.",
    },
    {
      question: "What if a tenant disputes an online payment?",
      answer:
        "Check the provider or bank record, the invoice and the receipt before changing a balance. If the issue involves a regulated financial institution, follow its complaint process.",
    },
  ],
  sources: [guideSources.paymentVerification],
  checklist: [
    "Match every payment to the correct tenant, lease, and rent period.",
    "Confirm the transaction in the payment provider dashboard, not only from a screenshot.",
    "Issue a receipt showing amount, date, and period covered.",
    "Reconcile online and manually recorded payments against the same ledger.",
    "Keep payment credentials private and never request a tenant's card PIN.",
  ],
};

export function Body() {
  return (
    <>
      <p>
        Online rent collection is useful when a confirmed payment can be traced
        to the right tenant, home and rent period. Choose the collection channel
        after deciding how invoices, confirmation, receipts and corrections will
        be recorded. A payment link alone does not provide that complete record.
      </p>

      <h2>Define what is due before requesting payment</h2>
      <p>
        Identify the landlord or authorised collector, property, unit and
        tenant. Record the agreed rent, coverage dates, due date and any
        separate charge. If the tenant pays in instalments, list the amounts and
        dates that were actually agreed. Use one invoice reference for the
        obligation so several payment attempts do not create several rents.
      </p>
      <p>
        Show the beneficiary and payment instructions clearly. Explain any
        collection fee before the tenant pays, including who bears it. Check the
        provider&apos;s current terms instead of assuming that every available
        method has the same fees, limits or settlement timetable.
      </p>

      <h2>Choose a channel both parties can use</h2>
      <p>
        Compare a payment link, an identified bank-transfer arrangement and
        other supported methods for the actual account and location. Consider
        the tenant&apos;s access, the confirmation record, refund handling and
        support contact. Avoid advertising a payment method as available until
        you have checked it in the live account.
      </p>
      <p>
        For accounts using Property360, keep the lease and payment history
        together and check the current workflow for the account&apos;s plan. The
        same recordkeeping principles apply if you use a bank ledger or another
        service. Test the process with a small agreed transaction before relying
        on it for a new collection arrangement.
      </p>

      <h2>Confirm a transaction before marking the rent paid</h2>
      <p>
        Paystack distinguishes successful, pending, failed and reversed
        transactions in its payment-verification documentation. Check the
        confirmed result through the provider or receiving bank; a screenshot or
        a tenant&apos;s successful-looking browser page is insufficient by
        itself to reconcile the rent.
      </p>
      <p>
        Match the confirmed transaction with its amount, reference and invoice.
        A successful payment and a payout arriving in a landlord&apos;s bank are
        separate events to check. Do not promise instant settlement or a
        guaranteed withdrawal time without the applicable provider terms.
      </p>

      <h2>Use a reconciliation routine</h2>
      <GuideTable
        caption="A practical rent-payment reconciliation sequence"
        columns={["Check", "What to record"]}
        rows={[
          ["Invoice", "Tenant, unit, rent period, agreed amount and due date"],
          [
            "Transaction",
            "Provider or bank reference, confirmed status, amount and date",
          ],
          [
            "Allocation",
            "Amount applied to this invoice and remaining balance",
          ],
          ["Receipt", "A retrievable acknowledgement linked to that payment"],
          [
            "Correction",
            "Any later refund, reversal or reallocation, with its reason",
          ],
        ]}
      />
      <p>
        Review confirmed transactions before sending reminders. If a tenant
        reports a missing payment, ask for the reference and investigate the
        allocation. Avoid asking them to pay again merely because a dashboard
        has not yet updated; check the actual transaction first.
      </p>

      <h2>Keep part payments and other charges visible</h2>
      <p>
        In an invented example, an invoice for ₦600,000 has a confirmed payment
        of ₦450,000. The rent balance is ₦150,000, assuming no other payments or
        adjustments. Label the receipt as a part payment and keep the agreed due
        date visible. If the parties agree to change that date, record the
        change separately.
      </p>
      <p>
        If a transfer includes a deposit or service charge, allocate each
        component explicitly. For money intended for a future term, follow the
        <Link href="/guides/what-happens-when-rent-is-paid-early">
          {" "}
          early-payment checklist
        </Link>{" "}
        rather than moving the current tenancy dates to fit the bank entry.
      </p>

      <h2>Record offline payments and corrections in the same history</h2>
      <p>
        If an agreed offline method is used, keep a receipt and record who
        accepted the payment, when, and which period it covers. Mark manually
        entered payments clearly so they are not confused with
        provider-confirmed transactions. A later bank entry should be matched to
        that record, rather than entered as a second payment.
      </p>
      <p>
        Preserve an audit trail for a refund, reversal or duplicate. Update the
        balance with an explanation and notify the tenant where their account
        changes. For a payment-service problem, use the provider&apos;s official
        support route and keep the complaint reference. A collection system
        supports records; disputed tenancy obligations still need assessment
        under the agreement and applicable law.
      </p>
    </>
  );
}
