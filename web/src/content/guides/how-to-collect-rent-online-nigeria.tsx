import Link from "next/link";
import type { GuideMeta } from "./types";

export const meta: GuideMeta = {
  slug: "how-to-collect-rent-online-nigeria",
  title: "How to Collect Rent Online in Nigeria (Without Chasing Tenants)",
  heading: "How to collect rent online in Nigeria",
  description:
    "Stop chasing rent on WhatsApp. Here is how Nigerian landlords can collect rent online with Paystack, automate invoices and receipts, and get paid straight to their bank.",
  keywords: [
    "collect rent online Nigeria",
    "online rent payment Nigeria",
    "rent collection app Nigeria",
    "Paystack rent",
    "how to collect rent from tenants",
  ],
  datePublished: "2026-06-23",
  readingMinutes: 6,
  category: "Payments",
};

export function Body() {
  return (
    <>
      <p>
        For most Nigerian landlords, collecting rent is the most stressful part of
        the job. Rent comes in as bank transfers you have to confirm by hand, cash
        you have to track in your head, and a stream of WhatsApp messages chasing
        tenants who have gone quiet. There is a better way. Here is how to move
        your rent collection online and get your weekends back.
      </p>

      <h2>Why collect rent online?</h2>
      <ul>
        <li>
          <strong>You stop chasing.</strong> The system sends the invoice and the
          reminder, not you.
        </li>
        <li>
          <strong>Every payment is recorded.</strong> No more trying to remember
          who paid what and when.
        </li>
        <li>
          <strong>Tenants get instant receipts.</strong> That ends the &ldquo;I
          already paid you&rdquo; arguments.
        </li>
        <li>
          <strong>Your money is traceable.</strong> You can see exactly what came
          in, what is pending, and what is owed.
        </li>
      </ul>

      <h2>Step 1: Put each tenant on a digital lease</h2>
      <p>
        Online collection starts with knowing who owes what. Each tenant should
        sit on a lease that records the rent, the payment frequency (monthly,
        quarterly, or annually), and the due dates. Once that exists, billing can
        be automated.
      </p>

      <h2>Step 2: Automate the invoice</h2>
      <p>
        Instead of remembering to ask for rent, let the system generate the invoice
        on schedule. A recurring invoice goes out for each cycle, and the tenant
        sees exactly what is due and by when. In Property360 this is a single
        toggle on the lease called auto-invoice.
      </p>

      <h2>Step 3: Let tenants pay with Paystack</h2>
      <p>
        Paystack is the standard payment gateway in Nigeria, supporting card, bank
        transfer, and USSD. When a tenant pays an invoice online, the payment is
        confirmed automatically and matched to the right lease. You do not have to
        check your bank app and tick it off manually.
      </p>

      <h2>Step 4: Money lands in your wallet, then your bank</h2>
      <p>
        Online rent payments settle into a wallet inside your dashboard. From
        there you add your bank account once (the account name is verified for you)
        and withdraw whenever you like. You can see your available balance, what is
        still pending settlement, your total earnings, and everything you have paid
        out.
      </p>

      <h2>Step 5: Receipts and records happen automatically</h2>
      <p>
        Every payment, whether it came in online through Paystack or you recorded a
        cash or transfer payment by hand, generates a clean receipt. That gives the
        tenant proof and gives you a complete, exportable record for your own books
        or your accountant.
      </p>

      <h2>What about tenants who still pay cash?</h2>
      <p>
        Not every tenant will switch to online payment overnight, and that is fine.
        You can still record cash, bank transfer, cheque, or mobile money payments
        manually, and they show up in the same history with the same receipts. The
        goal is one place where every naira is accounted for, however it arrived.
      </p>

      <h2>Get started</h2>
      <p>
        <Link href="/landlord">Property360</Link> brings all of this together for
        Nigerian landlords: digital leases, automatic invoices, Paystack payments,
        a wallet with bank payouts, and receipts generated for you. You can{" "}
        <Link href="/onboarding">start free</Link> and have your first tenant
        billing online in minutes.
      </p>

      <p className="text-[14px] text-ink-muted">
        Paystack is a registered trademark of its respective owner. Property360 is
        not affiliated with Paystack beyond using it as a payment gateway.
      </p>
    </>
  );
}
