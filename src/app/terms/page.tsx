import type { Metadata } from "next";
import { LegalLayout } from "@/components/legal/LegalLayout";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for Property360, a property management platform for landlords, tenants, and agents in Nigeria.",
  alternates: { canonical: "https://property360.africa/terms" },
};

export default function TermsPage() {
  return (
    <LegalLayout title="Terms of Service" updated="10 May 2026">
      <p>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your access to and use of the
        Property360 mobile application and the api.property360.africa service (together,
        the &ldquo;Service&rdquo;) operated by Property360 (&ldquo;we&rdquo;, &ldquo;our&rdquo;,
        &ldquo;us&rdquo;). By creating an account or using the Service you agree to these
        Terms. If you do not agree, do not use the Service.
      </p>

      <h2>1. Eligibility</h2>
      <ul>
        <li>You must be at least 18 years old and legally capable of entering into a binding contract under Nigerian law.</li>
        <li>If you use the Service on behalf of a company, you represent that you are authorised to bind that company to these Terms.</li>
      </ul>

      <h2>2. The Service</h2>
      <p>
        Property360 is a property management platform for landlords, tenants, and letting
        agents operating in Nigeria. It enables, among other things: property and unit
        management, lease creation, invoice generation, rent collection via Paystack,
        landlord payouts, tenancy-agreement storage and e-signing, in-app chat, and
        maintenance requests.
      </p>
      <p>
        Property360 is a software platform. We are <strong>not</strong> a landlord,
        tenant, agent, estate broker, escrow agent, payment institution, or party to any
        tenancy agreement created using the Service.
      </p>

      <h2>3. Accounts</h2>
      <ul>
        <li>You must provide accurate, current, and complete information when registering.</li>
        <li>You are responsible for all activity under your account and for keeping your credentials secret.</li>
        <li>Notify us immediately at <a href="mailto:support@property360.africa">support@property360.africa</a> of any suspected unauthorised use.</li>
        <li>We may require identity verification (KYC) before activating sensitive features such as receiving payouts.</li>
      </ul>

      <h2>4. Roles &amp; Responsibilities</h2>
      <h3>4.1 Landlords</h3>
      <ul>
        <li>You are responsible for the accuracy of property listings, lease terms, and fee structures you create.</li>
        <li>You are solely responsible for compliance with all Nigerian and state laws applicable to your tenancy (including the Tenancy Law of your state, tax obligations, and habitability standards).</li>
        <li>You authorise us, via Paystack, to remit collected rent to the bank account you have nominated, less any fees disclosed in the app.</li>
      </ul>
      <h3>4.2 Tenants</h3>
      <ul>
        <li>You are responsible for the accuracy of the information and identity documents you submit.</li>
        <li>Payments made through the Service settle your obligation to your landlord on the date funds are confirmed received by Paystack — not the date you initiate the payment.</li>
      </ul>
      <h3>4.3 Agents</h3>
      <ul>
        <li>You may only act on behalf of a landlord with their explicit invitation and within the per-property permissions they grant you in the Service.</li>
        <li>You must not misrepresent your authority to act for a landlord.</li>
      </ul>

      <h2>5. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Service for any unlawful purpose or to facilitate fraud, money laundering, or harassment.</li>
        <li>Upload false, misleading, or fraudulent listings, identity documents, or maintenance reports.</li>
        <li>Attempt to access another user&apos;s account, data, or messages.</li>
        <li>Reverse-engineer, scrape, or interfere with the Service or its underlying APIs.</li>
        <li>Circumvent or remove security or rate-limiting measures.</li>
        <li>Use the Service to send unsolicited bulk messages.</li>
      </ul>

      <h2>6. Payments &amp; Fees</h2>
      <ul>
        <li>Payments are processed by Paystack Payments Limited under their own terms. We are not a party to your relationship with Paystack.</li>
        <li>Service fees and any platform fees, where charged, are disclosed in the app before you confirm a transaction. Continuing the transaction is acceptance of those fees.</li>
        <li>Once a payment has been transmitted to a landlord&apos;s wallet or bank account, refunds are at the discretion of the landlord. We may assist in coordinating a refund but cannot compel one.</li>
        <li>You authorise us to deduct platform fees, where applicable, from amounts collected before payout.</li>
      </ul>

      <h2>7. Tenancy Agreements &amp; E-Signing</h2>
      <ul>
        <li>Tenancy agreements created or signed via the Service are contracts between the landlord and tenant. Property360 is not a party.</li>
        <li>Electronic signatures are captured in-app via clickwrap: the signer types their full name, ticks an "I agree" acknowledgement, and may optionally upload or draw a signature image. Property360 records the typed name, document hash, IP address, user agent, and timestamp as evidence. Signed agreements are stored on Cloudinary and are downloadable by both parties.</li>
        <li>You are responsible for ensuring the legal validity of any agreement you sign and for obtaining independent legal advice where needed.</li>
      </ul>

      <h2>8. User Content</h2>
      <ul>
        <li>You retain ownership of the content you upload (photos, documents, listings, messages).</li>
        <li>You grant Property360 a worldwide, non-exclusive, royalty-free licence to host, store, reproduce, and display your content solely as needed to operate the Service.</li>
        <li>You represent that you have the rights necessary to grant this licence and that your content does not infringe any third-party right.</li>
      </ul>

      <h2>9. Intellectual Property</h2>
      <p>
        The Service, including its software, design, trademarks, and content (excluding
        user content), is owned by Property360 and protected by Nigerian and
        international intellectual-property laws. Nothing in these Terms grants you a
        licence to use our marks or branding without prior written permission.
      </p>

      <h2>10. Disclaimers</h2>
      <p>
        The Service is provided <strong>&ldquo;as is&rdquo;</strong> and{" "}
        <strong>&ldquo;as available&rdquo;</strong>. To the maximum extent permitted by law,
        we disclaim all warranties, express or implied, including fitness for a particular
        purpose, merchantability, and non-infringement. We do not warrant that the
        Service will be uninterrupted, error-free, or secure, nor do we verify the
        identity, conduct, creditworthiness, or solvency of any user beyond the KYC
        checks described in our Privacy Policy.
      </p>

      <h2>11. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, Property360 will not be liable for any
        indirect, incidental, special, consequential, or punitive damages, or for any
        loss of profits, revenue, data, or goodwill, arising out of or in connection with
        your use of the Service. Our aggregate liability for all claims relating to the
        Service in any 12-month period will not exceed the greater of (a) the total
        platform fees you paid to us in that period, or (b) NGN 50,000.
      </p>

      <h2>12. Indemnity</h2>
      <p>
        You agree to indemnify and hold harmless Property360, its officers, employees,
        and agents from any claim, demand, loss, or expense (including reasonable legal
        fees) arising out of (i) your breach of these Terms, (ii) your violation of any
        law or third-party right, or (iii) any tenancy or transaction you enter into
        using the Service.
      </p>

      <h2>13. Suspension &amp; Termination</h2>
      <ul>
        <li>You may stop using the Service and delete your account at any time from within the app.</li>
        <li>We may suspend or terminate your account, with or without notice, if we reasonably believe you have breached these Terms, exposed us to legal liability, or used the Service to harm other users.</li>
        <li>Sections 5–14 survive termination.</li>
      </ul>

      <h2>14. Changes to the Service or Terms</h2>
      <p>
        We may modify the Service and these Terms from time to time. Material changes to
        these Terms will be notified through the app or by email at least 14 days before
        they take effect. Continued use of the Service after the effective date
        constitutes acceptance of the revised Terms.
      </p>

      <h2>15. Governing Law &amp; Disputes</h2>
      <p>
        These Terms are governed by the laws of the Federal Republic of Nigeria. Any
        dispute arising out of or in connection with these Terms or the Service will be
        submitted to the exclusive jurisdiction of the courts of Lagos State, Nigeria,
        save that we may seek injunctive relief in any court of competent jurisdiction
        to protect our intellectual property.
      </p>

      <h2>16. Contact</h2>
      <p>
        Property360<br />
        Lagos, Nigeria<br />
        Legal: <a href="mailto:legal@property360.africa">legal@property360.africa</a><br />
        Support: <a href="mailto:support@property360.africa">support@property360.africa</a>
      </p>
    </LegalLayout>
  );
}
