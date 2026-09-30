import type { Metadata } from "next";

import MotocareMotion from "@/components/marketing/MotocareMotion";
import ServicesPageHeroSection from "@/components/marketing/pages/services/ServicesPageHeroSection";
import ServicesDetailLinksSection from "@/components/marketing/pages/services/ServicesDetailLinksSection";
import ServicesPageListSection from "@/components/marketing/pages/services/ServicesPageListSection";
import ServicesPageMarqueeSection from "@/components/marketing/pages/services/ServicesPageMarqueeSection";
import SiteFooter from "@/components/marketing/SiteFooter";
import SiteNav from "@/components/marketing/SiteNav";
import WebflowClientEffects from "@/components/marketing/WebflowClientEffects";

export const metadata: Metadata = {
  title: "Car Servicing & Repairs in Abuja | Vonos",
  description:
    "Manufacturer schedule servicing, brakes, diagnostics, engine and transmission, air-con, tires and alignment in Kubwa, Abuja — fixed-price quotes and 12-month warranty on every job.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <>
      <MotocareMotion />
      <WebflowClientEffects />
      <main className="main main--subpage">
        <SiteNav />
        <ServicesPageHeroSection />
        <ServicesPageListSection />
        <ServicesDetailLinksSection />
        <ServicesPageMarqueeSection />
        <SiteFooter />
      </main>
    </>
  );
}
