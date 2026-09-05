import type { Metadata } from "next";

import MotocareMotion from "@/components/marketing/MotocareMotion";
import ShopPageContent from "@/components/marketing/pages/shop/ShopPageContent";
import ShopPageHero from "@/components/marketing/pages/shop/ShopPageHero";
import SiteFooter from "@/components/marketing/SiteFooter";
import SiteNav from "@/components/marketing/SiteNav";
import WebflowClientEffects from "@/components/marketing/WebflowClientEffects";

export const metadata: Metadata = {
  title: "Shop | Vonos",
  description:
    "Buy genuine auto parts from Vonos — brake kits, filters, fluids, batteries and more. Order online for workshop collection or fitment.",
};

export default function ShopPage() {
  return (
    <>
      <MotocareMotion />
      <WebflowClientEffects />
      <main className="main main--subpage">
        <SiteNav />
        <ShopPageHero />
        <ShopPageContent />
        <SiteFooter />
      </main>
    </>
  );
}
