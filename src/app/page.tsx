import type { Metadata } from "next";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { PainPoints } from "@/components/landing/PainPoints";
import { RoleSplit } from "@/components/landing/RoleSplit";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { Founding50 } from "@/components/marketing/Founding50";
import { FoundingBar } from "@/components/marketing/FoundingBar";
import { Marketplace } from "@/components/landing/Marketplace";
import { Testimonials } from "@/components/landing/Testimonials";
import { Faq } from "@/components/landing/Faq";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";

export const metadata: Metadata = {
  title: "Property management software for Nigerian landlords",
  description:
    "Property360 is the all-in-one app for Nigerian landlords, tenants, and agents. Collect rent online with Paystack, automate invoices and receipts, manage leases and maintenance, and list vacant units. Start free.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Property360 — Property management for Nigerian landlords",
    description:
      "Collect rent online, automate invoices and receipts, manage leases, and fill vacant units. The all-in-one property platform built for Nigeria.",
    url: "https://property360.africa/",
    type: "website",
  },
};

export default function Home() {
  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <FoundingBar />
      <Nav />
      <Hero />
      <TrustStrip />
      <PainPoints />
      <RoleSplit />
      <HowItWorks />
      <Features />
      <Founding50 />
      <section id="marketplace">
        <Marketplace />
      </section>
      <Testimonials />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}
