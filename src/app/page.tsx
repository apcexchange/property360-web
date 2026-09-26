import type { Metadata } from "next";
import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { RoleSplit } from "@/components/landing/RoleSplit";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { Founding50 } from "@/components/marketing/Founding50";
import { FoundingBar } from "@/components/marketing/FoundingBar";
import { FeaturedProperties } from "@/components/marketing/FeaturedProperties";
import { Faq } from "@/components/landing/Faq";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";
import { NewsletterBlock } from "@/components/marketing/NewsletterBlock";

export const metadata: Metadata = {
  title: "Find, list and manage property everywhere",
  description:
    "Property360 is where people list homes, land, shops, shortlets and hotel rooms free, then manage rent, leases, payments and maintenance in one place.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Property360, a global property marketplace and management app",
    description:
      "List property free, find your next home or stay, and manage everything after move-in.",
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
      <FeaturedProperties />
      <RoleSplit />
      <HowItWorks />
      <Features />
      <Founding50 />
      <Faq />
      <NewsletterBlock source="newsletter-landing" />
      <FinalCta />
      <Footer />
    </div>
  );
}
