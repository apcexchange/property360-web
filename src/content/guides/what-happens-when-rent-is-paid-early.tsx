import Link from "next/link";
import type { GuideMeta } from "./types";

export const meta: GuideMeta = {
  slug: "what-happens-when-rent-is-paid-early",
  title: "What Happens When a Tenant Pays Rent Early?",
  heading: "What happens when a tenant pays rent early?",
  description:
    "A clear guide for landlords and tenants on recording early rent payments, issuing receipts, and handling the next lease term without creating duplicate invoices.",
  keywords: [
    "tenant pays rent early",
    "early rent payment",
    "rent renewal payment",
    "rent receipt",
    "lease renewal",
  ],
  datePublished: "2026-09-28",
  readingMinutes: 5,
  category: "Rent payments",
};

export function Body() {
  return (
    <>
      <p>
        A tenant pays next year&apos;s rent before their current lease has ended. It
        should be good news, but it can easily create confusion: has the tenant
        renewed already? Should a fresh invoice still go out? Does the receipt
        cover today&apos;s lease or the next one?
      </p>

      <p>
        The simple answer is this: the current lease remains active until its end
        date. A confirmed full payment for the next term should be recorded as a
        <strong> paid renewal</strong>, with the dates it covers shown clearly.
        That protects both parties and prevents the same rent being requested
        twice.
      </p>

      <h2>Early payment is not the same as a new tenancy today</h2>
      <p>
        If a lease runs from 26 October 2025 to 25 October 2026, a payment made
        in September 2026 does not change the fact that the current term is still
        running. The tenant remains on the existing lease through 25 October.
      </p>
      <p>
        Once the current term ends, the paid renewal takes over automatically for
        the agreed frequency and amount, unless the landlord and tenant change
        the dates or terms before then. This gives everyone one continuous record
        instead of two overlapping leases.
      </p>

      <h2>What a good payment record should show</h2>
      <p>
        A payment history should answer the important questions without either
        person having to search through bank alerts or WhatsApp messages. For an
        early renewal payment, record:
      </p>
      <ul>
        <li><strong>Amount received:</strong> the exact amount paid by the tenant.</li>
        <li><strong>Payment date:</strong> when the transfer, card payment, or cash payment was confirmed.</li>
        <li><strong>Payment method and reference:</strong> for example bank transfer, card, cash, or a transaction reference.</li>
        <li><strong>Coverage period:</strong> the dates that payment pays for, such as 26 October 2026 to 25 October 2027.</li>
        <li><strong>Current lease status:</strong> active until its original end date.</li>
        <li><strong>Next term status:</strong> paid and scheduled to begin automatically.</li>
      </ul>

      <p>
        A receipt should use the same information. A receipt proves payment was
        received; the coverage dates make clear what that payment is for.
      </p>

      <h2>Do not send a second invoice for an already paid term</h2>
      <p>
        This is the most common avoidable error. If the full renewal amount has
        been accepted and receipted, the next invoice should not be drafted or
        sent again. Instead, the system should mark that future term as paid and
        keep the current lease visible until it expires.
      </p>
      <p>
        If only part of the renewal amount has been paid, it is different. The
        payment should be shown as a <strong>part payment</strong>, together with
        the balance still due. The term should only be marked fully paid after the
        remaining amount is confirmed.
      </p>

      <h2>What landlords should do</h2>
      <ol>
        <li>Confirm the payment against the right tenant and unit.</li>
        <li>Check that the amount covers the agreed rent and any applicable charges.</li>
        <li>Issue a receipt promptly.</li>
        <li>Record the next term&apos;s start and end dates.</li>
        <li>Leave the current lease active until its natural end date.</li>
        <li>Edit the renewal only if the rent, frequency, or dates have genuinely changed.</li>
      </ol>

      <p>
        It is also wise to keep the lease agreement current. If the parties are
        changing rent, duration, occupants, or other terms, document the change
        clearly rather than relying on a payment alone. Our guide to{" "}
        <Link href="/guides/how-to-write-tenancy-agreement-nigeria">
          writing a clear tenancy agreement
        </Link>{" "}
        covers the basics.
      </p>

      <h2>What tenants should look for</h2>
      <p>
        Before considering a renewal complete, a tenant should be able to see the
        receipt, amount, payment date, and the exact dates covered. If the payment
        is only a deposit or part payment, the outstanding balance should be
        visible too. This avoids a difficult conversation months later when the
        next due date arrives.
      </p>

      <h2>Make the renewal process calm and traceable</h2>
      <p>
        Paying early should remove stress, not create more admin. Property360
        keeps the active lease, payment history, receipt, and paid next term in
        one place. The current lease remains active, the paid term begins on its
        correct date, and duplicate billing is avoided.
      </p>

      <p>
        For day-to-day rent collection, invoices and receipts are easier to keep
        straight when every payment is recorded in one place. Read our guide on{" "}
        <Link href="/guides/how-to-collect-rent-online-nigeria">
          collecting rent online
        </Link>{" "}
        or <Link href="/onboarding">start using Property360</Link> today.
      </p>

      <p className="text-[14px] text-ink-muted">
        This guide is general information, not legal advice. For a dispute or a
        change to a tenancy&apos;s legal terms, seek advice appropriate to your
        location and agreement.
      </p>
    </>
  );
}
