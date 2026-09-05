import type { Metadata } from "next";

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

export const metadata: Metadata = {
  title: "Vonos — Honest Repairs. Every Make.",
  description:
    "Manufacturer schedule servicing, MOT testing, brakes, diagnostics and more — fixed-price quotes and 12-month warranty on every repair.",
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
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
        <ReviewsSection />
        <TeamSection />
        <PricingSection />
        <GuaranteeSection />
        <FaqSection />
        <SiteFooter />
      </main>
    </>
  );
}
