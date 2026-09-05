import type { Metadata } from "next";

import MotocareMotion from "@/components/marketing/MotocareMotion";
import AboutPageHeroSection from "@/components/marketing/pages/about/AboutPageHeroSection";
import AboutPagePeopleSection from "@/components/marketing/pages/about/AboutPagePeopleSection";
import AboutPageProcessSection from "@/components/marketing/pages/about/AboutPageProcessSection";
import AboutPageStatsSection from "@/components/marketing/pages/about/AboutPageStatsSection";
import AboutPageStorySection from "@/components/marketing/pages/about/AboutPageStorySection";
import AboutPageTeamSection from "@/components/marketing/pages/about/AboutPageTeamSection";
import SiteFooter from "@/components/marketing/SiteFooter";
import SiteNav from "@/components/marketing/SiteNav";
import WebflowClientEffects from "@/components/marketing/WebflowClientEffects";

export const metadata: Metadata = {
  title: "About | Vonos",
  description:
    "Independent since 2009 — honest repairs, genuine parts, and clear communication from a team of manufacturer-trained technicians.",
};

export default function AboutPage() {
  return (
    <>
      <MotocareMotion />
      <WebflowClientEffects />
      <main className="main main--subpage">
        <SiteNav />
        <AboutPageHeroSection />
        <AboutPageStatsSection />
        <AboutPageStorySection />
        <AboutPagePeopleSection />
        <AboutPageProcessSection />
        <AboutPageTeamSection />
        <SiteFooter />
      </main>
    </>
  );
}
