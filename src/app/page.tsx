import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { PainPoints } from "@/components/landing/PainPoints";
import { RoleSplit } from "@/components/landing/RoleSplit";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { Marketplace } from "@/components/landing/Marketplace";
import { Testimonials } from "@/components/landing/Testimonials";
import { Faq } from "@/components/landing/Faq";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <Nav />
      <Hero />
      <TrustStrip />
      <PainPoints />
      <RoleSplit />
      <HowItWorks />
      <Features />
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
