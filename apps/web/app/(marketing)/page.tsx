import type { Metadata } from "next";

import BlogSection from "@/components/marketing/BlogSection";
import CaseStudiesSection from "@/components/marketing/CaseStudiesSection";
import ClientsSection from "@/components/marketing/ClientsSection";
import FaqSection from "@/components/marketing/FaqSection";
import GuaranteeSection from "@/components/marketing/GuaranteeSection";
import HeroSection from "@/components/marketing/HeroSection";
import MarqueeSection from "@/components/marketing/MarqueeSection";
import MotocareMotion from "@/components/marketing/MotocareMotion";
import PricingSection from "@/components/marketing/PricingSection";
import ReviewsSection from "@/components/marketing/ReviewsSection";
import ServicesSection from "@/components/marketing/ServicesSection";
import SiteFooter from "@/components/marketing/SiteFooter";
import SiteNav from "@/components/marketing/SiteNav";
import StatsSection from "@/components/marketing/StatsSection";
import TeamSection from "@/components/marketing/TeamSection";
import ValuePropsSection from "@/components/marketing/ValuePropsSection";
import WebflowClientEffects from "@/components/marketing/WebflowClientEffects";
import {
  autoRepairJsonLd,
  faqPageJsonLd,
  jsonLdScript,
} from "@/lib/seo/schema";

/** Mirrors the visible FaqSection accordion — keep in sync (schema rule). */
const HOMEPAGE_FAQS = [
  {
    question: "Do you work on all makes and models?",
    answer:
      "Yes. Being independent means we service and repair every make from a Ford Fiesta to a Range Rover with the right tools and genuine or OE-quality parts.",
  },
  {
    question: "Will I get a price before any work starts?",
    answer:
      "Yes. We provide a clear quote before any work begins, explaining the required repairs, expected costs, and available options so you can approve everything with complete confidence.",
  },
  {
    question: "Is the work guaranteed?",
    answer:
      "Yes. All repairs and servicing are completed to high standards and backed by our workmanship guarantee, giving you added confidence and reliable performance long after your visit.",
  },
  {
    question: "Do you offer vehicle collection?",
    answer:
      "Yes. Depending on availability, we can arrange vehicle collection and drop-off to help keep your day moving while your car is being serviced or repaired.",
  },
  {
    question: "How long will my car be off the road?",
    answer:
      "Most repairs are completed as quickly as possible, with timing depending on the work required and parts availability. We'll keep you updated and provide an estimated completion time.",
  },
];

export const metadata: Metadata = {
  title: "Vonos — Honest Repairs. Every Make.",
  description:
    "Manufacturer schedule servicing, MOT testing, brakes, diagnostics and more — fixed-price quotes and 12-month warranty on every repair.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(autoRepairJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(faqPageJsonLd(HOMEPAGE_FAQS)),
        }}
      />
      <MotocareMotion />
      <WebflowClientEffects />
      <main className="main">
        <SiteNav />
        <HeroSection />
        <MarqueeSection />
        <ServicesSection />
        <StatsSection />
        <ValuePropsSection />
        <ClientsSection />
        <CaseStudiesSection />
        <div id="reviews">
          <ReviewsSection />
        </div>
        <BlogSection />
        <TeamSection />
        <PricingSection />
        <GuaranteeSection />
        <FaqSection />
        <SiteFooter />
      </main>
    </>
  );
}
