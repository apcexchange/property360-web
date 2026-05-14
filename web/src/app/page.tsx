import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { PainPoints } from "@/components/landing/PainPoints";
import { RoleSplit } from "@/components/landing/RoleSplit";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Features } from "@/components/landing/Features";
import { Stats } from "@/components/landing/Stats";
import { Testimonials } from "@/components/landing/Testimonials";
import { Faq } from "@/components/landing/Faq";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-canvas text-foundation-700">
      <Nav />
      <Hero />
      <PainPoints />
      <RoleSplit />
      <HowItWorks />
      <Features />
      <Stats />
      <Testimonials />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}
