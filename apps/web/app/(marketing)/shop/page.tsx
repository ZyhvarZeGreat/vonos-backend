import type { Metadata } from "next";
import { Suspense } from "react";

import EcomHero from "@/components/marketing/ecommerce/EcomHero";
import ShopLanding from "@/components/marketing/ecommerce/ShopLanding";
import MotocareMotion from "@/components/marketing/MotocareMotion";
import SiteFooter from "@/components/marketing/SiteFooter";
import SiteNav from "@/components/marketing/SiteNav";
import WebflowClientEffects from "@/components/marketing/WebflowClientEffects";

export const metadata: Metadata = {
  title: "Shop Auto Parts | Vonos",
  description:
    "Genuine auto parts from the Vonos warehouse — filters, oils, brakes, sensors and more. Delivered nationwide or fitted at the Abuja workshop.",
  alternates: { canonical: "/shop" },
};

export default function ShopPage() {
  return (
    <>
      <MotocareMotion />
      <WebflowClientEffects />
      <main className="main main--subpage vg-page">
        <SiteNav />
        <EcomHero />
        <Suspense fallback={null}>
          <ShopLanding />
        </Suspense>
        <SiteFooter />
      </main>
    </>
  );
}
