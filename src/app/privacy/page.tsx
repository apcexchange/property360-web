import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Property360, a property management platform for landlords, tenants, and property managers in Nigeria.",
  alternates: { canonical: "https://property360.africa/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy" updated="10 May 2026">
      <p>
        Property360 (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates the Property360 mobile application
        and the <a href="https://api.property360.africa">api.property360.africa</a> service
        (together, the &ldquo;Service&rdquo;). This Privacy Policy explains what personal data
        we collect, how we use it, who we share it with, and the rights you have under
        the <strong>Nigeria Data Protection Act, 2023 (NDPA)</strong> and the Nigeria
        Data Protection Regulation (NDPR).
      </p>
      <p>
        Property360 is intended for landlords, tenants, and property managers operating in
        Nigeria. By using the Service you agree to this Policy.
      </p>

      <h2>1. Information We Collect</h2>

      <h3>1.1 Information you provide</h3>
      <ul>
        <li><strong>Account details:</strong> full name, email address, Nigerian mobile number (+234 format), password, role (landlord, tenant, or property manager), and profile photo.</li>
        <li><strong>Identity verification (KYC):</strong> one of National Identification Number (NIN), Driver&apos;s Licence, International Passport, or Voter&apos;s Card, plus a photo of the document. We use this to verify identity and reduce fraud on the platform.</li>
        <li><strong>Property &amp; lease data:</strong> property addresses, unit details, lease terms, fee structure (security deposit, caution fee, agent fee, agreement fee, legal fee, service charge), and tenancy agreements.</li>
        <li><strong>Payment &amp; payout details:</strong> bank account details for landlord payouts; payment instrument data is collected and stored by our payment processor (see §3) — we do not store full card numbers.</li>
        <li><strong>Documents you upload:</strong> tenancy agreements, maintenance request photos, and other files you choose to share.</li>
        <li><strong>Communications:</strong> in-app chat messages, maintenance requests, and support correspondence.</li>
      </ul>

      <h3>1.2 Information collected automatically</h3>
      <ul>
        <li>Device information (model, OS version, app version, language).</li>
        <li>IP address and approximate location derived from it.</li>
        <li>Usage events and crash logs used to diagnose problems and improve the Service.</li>
        <li>Authentication tokens and session identifiers.</li>
      </ul>

      <h3>1.3 Information from third parties</h3>
      <ul>
        <li>Payment confirmation and transaction status from our payment processor.</li>
        <li>E-signature events (signed, declined, voided) from our e-signing provider.</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>To create and manage your account and authenticate you.</li>
        <li>To provide core features: property and unit management, lease creation, invoicing, rent collection, payouts to landlords, maintenance requests, and in-app chat.</li>
        <li>To verify your identity through KYC checks before activating sensitive features.</li>
        <li>To process payments and remit landlord payouts.</li>
        <li>To extract structured data from uploaded tenancy agreements via optical character recognition.</li>
        <li>To send you service notifications (e.g. invoice issued, payment received, lease expiring) by push, in-app banner, and email.</li>
        <li>To respond to support requests and enforce our Terms.</li>
        <li>To comply with legal obligations including anti-money-laundering and tax reporting where applicable.</li>
      </ul>

      <h2>3. Third-Party Service Providers (Sub-processors)</h2>
      <p>
        We use the following providers to deliver the Service. Each receives only the
        data necessary for the purpose listed and is contractually bound to safeguard it.
      </p>
      <ul>
        <li><strong>Paystack Payments Limited</strong> — card, bank transfer, and USSD payment processing; landlord payouts via the Paystack Transfer API. (Nigeria)</li>
        <li><strong>Cloudinary Ltd.</strong> — storage and delivery of images and PDF documents you upload (profile photos, tenancy agreements, maintenance photos). (Israel / EU / US)</li>
        <li><strong>Google LLC — Document AI</strong> — OCR processing of uploaded tenancy agreements to extract structured fields. Documents are processed in transit and not retained by Google for model training. (US / EU)</li>
        <li><strong>DocuSeal</strong> — electronic signing of tenancy agreements. Signers&apos; name, email, and signature are shared. (EU / US)</li>
        <li><strong>Resend, Inc.</strong> — delivery of transactional email (e.g. password reset, invoice notifications). (US)</li>
        <li><strong>MongoDB, Inc. — Atlas (Frankfurt region)</strong> — primary database hosting. (Germany / EU)</li>
        <li><strong>Render Services, Inc.</strong> — application hosting for the API. (Germany / EU)</li>
        <li><strong>Apple Inc.</strong> and <strong>Google LLC</strong> — mobile push notification delivery via APNs and FCM respectively.</li>
      </ul>
      <p>We do not sell your personal data and we do not share it with advertisers.</p>

      <h2>4. Sharing Within the Platform</h2>
      <ul>
        <li>Landlords can see the tenants assigned to their properties (name, contact, lease, payment history).</li>
        <li>Tenants can see the landlord (or assigned property manager) for their unit and the property details.</li>
        <li>Property managers acting on a landlord&apos;s behalf can see the same data the landlord has authorised them to access via per-property permission flags.</li>
        <li>Marketplace listings show the property details you publish; your direct contact is shown only after a reservation request.</li>
      </ul>

      <h2>5. International Data Transfers</h2>
      <p>
        Your data may be processed outside Nigeria — primarily in the European Union
        (Germany) and the United States — by the providers named in §3. Where required by
        the NDPA, we rely on adequacy decisions, standard contractual clauses, or your
        informed consent for these transfers.
      </p>

      <h2>6. Data Retention</h2>
      <ul>
        <li>Account data is retained for as long as your account is active.</li>
        <li>When you delete your account, your personal identifiers are <strong>anonymised</strong> rather than hard-deleted, so historical lease and payment records remain accurate for the counterparties (landlord ↔ tenant) and for our legal and tax obligations. Anonymised records cannot be re-associated with you.</li>
        <li>KYC documents are retained for 5 years after the end of the relationship for anti-money-laundering compliance, then deleted.</li>
        <li>Payment records are retained for 7 years to meet Nigerian tax and accounting obligations.</li>
        <li>Crash and diagnostic logs are retained for 90 days.</li>
      </ul>

      <h2>7. Your Rights</h2>
      <p>Under the NDPA you have the right to:</p>
      <ul>
        <li>Access the personal data we hold about you.</li>
        <li>Correct inaccurate or incomplete data.</li>
        <li>Request deletion (subject to the retention exceptions in §6).</li>
        <li>Object to or restrict certain processing.</li>
        <li>Receive a copy of your data in a portable format.</li>
        <li>Withdraw consent at any time, where processing is based on consent.</li>
        <li>Lodge a complaint with the <a href="https://nitda.gov.ng/">Nigeria Data Protection Commission (NDPC)</a>.</li>
      </ul>
      <p>
        To exercise any of these rights, email{" "}
        <a href="mailto:privacy@property360.africa">privacy@property360.africa</a>. To
        delete your account specifically, you can use our self-service form at{" "}
        <a href="/delete-account">property360.africa/delete-account</a> — no login required.
        We respond within 30 days.
      </p>

      <h2>8. Security</h2>
      <ul>
        <li>All traffic between the app and our servers is encrypted with TLS 1.2+.</li>
        <li>Passwords are hashed (never stored in plaintext) and authentication tokens are short-lived.</li>
        <li>Access to production data is restricted to authorised personnel and audited.</li>
        <li>Payment card details are never transmitted to or stored on our servers — they go directly to Paystack.</li>
      </ul>
      <p>
        No system is perfectly secure. If you believe your account has been compromised,
        contact <a href="mailto:support@property360.africa">support@property360.africa</a> immediately.
      </p>

      <h2>9. Children</h2>
      <p>
        The Service is not directed to anyone under 18. We do not knowingly collect data
        from children. If you believe a child has provided us data, contact{" "}
        <a href="mailto:privacy@property360.africa">privacy@property360.africa</a> and we will delete it.
      </p>

      <h2>10. Changes to This Policy</h2>
      <p>
        We may update this Policy from time to time. Material changes will be notified
        through the app or by email at least 14 days before they take effect. The
        &ldquo;Last updated&rdquo; date at the top of this page always reflects the current version.
      </p>

      <h2>11. Contact</h2>
      <p>
        Property360<br />
        Lagos, Nigeria<br />
        Privacy enquiries: <a href="mailto:privacy@property360.africa">privacy@property360.africa</a><br />
        General support: <a href="mailto:support@property360.africa">support@property360.africa</a><br />
        Legal: <a href="mailto:legal@property360.africa">legal@property360.africa</a>
      </p>
    </LegalLayout>
  );
}
