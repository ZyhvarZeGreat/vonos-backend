import type { Metadata } from "next";

import ContactSiteFooter from "@/components/marketing/ContactSiteFooter";
import MotocareMotion from "@/components/marketing/MotocareMotion";
import ContactPageDetailsSection from "@/components/marketing/pages/contact/ContactPageDetailsSection";
import ContactPageHeroSection from "@/components/marketing/pages/contact/ContactPageHeroSection";
import ContactPageMarqueeSection from "@/components/marketing/pages/contact/ContactPageMarqueeSection";
import ContactPageWhySection from "@/components/marketing/pages/contact/ContactPageWhySection";
import SiteNav from "@/components/marketing/SiteNav";
import WebflowClientEffects from "@/components/marketing/WebflowClientEffects";

export const metadata: Metadata = {
  title: "Contact | Vonos",
  description:
    "Book your car in — tell us what's going on, pick a time, and we'll confirm by phone with a fixed-price quote before any work starts.",
};

export default function ContactPage() {
  return (
    <>
      <MotocareMotion />
      <WebflowClientEffects />
      <main className="main main--subpage">
        <SiteNav />
        <ContactPageHeroSection />
        <ContactPageDetailsSection />
        <ContactPageWhySection />
        <ContactPageMarqueeSection />
        <ContactSiteFooter />
      </main>
    </>
  );
}
