import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { TrustStrip } from "@/components/landing/TrustStrip";
import { PainPoints } from "@/components/landing/PainPoints";
import { VideoTour } from "@/components/landing/VideoTour";
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

export default function Home() {
  return (
    <div className="min-h-screen bg-paper text-foundation-700">
      <FoundingBar />
      <Nav />
      <Hero />
      <TrustStrip />
      <PainPoints />
      <VideoTour />
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
