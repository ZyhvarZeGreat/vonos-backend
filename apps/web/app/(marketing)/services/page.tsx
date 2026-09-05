import type { Metadata } from "next";

import MotocareMotion from "@/components/marketing/MotocareMotion";
import ServicesPageHeroSection from "@/components/marketing/pages/services/ServicesPageHeroSection";
import ServicesPageListSection from "@/components/marketing/pages/services/ServicesPageListSection";
import ServicesPageMarqueeSection from "@/components/marketing/pages/services/ServicesPageMarqueeSection";
import SiteFooter from "@/components/marketing/SiteFooter";
import SiteNav from "@/components/marketing/SiteNav";
import WebflowClientEffects from "@/components/marketing/WebflowClientEffects";

export const metadata: Metadata = {
  title: "Services | Vonos",
  description:
    "Manufacturer schedule servicing, MOT testing, brakes, diagnostics, tires, air-con and engine work — fixed-price quotes on every job.",
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
        <ServicesPageMarqueeSection />
        <SiteFooter />
      </main>
    </>
  );
}
