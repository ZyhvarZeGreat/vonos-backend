import type { Metadata } from "next";

import MotocareMotion from "@/components/marketing/MotocareMotion";
import ShopCartPage from "@/components/marketing/shop/ShopCartPage";
import SiteFooter from "@/components/marketing/SiteFooter";
import SiteNav from "@/components/marketing/SiteNav";
import WebflowClientEffects from "@/components/marketing/WebflowClientEffects";

export const metadata: Metadata = {
  title: "Cart | Vonos Shop",
  description: "Review selected parts before checkout.",
};

export default function ShopCartRoutePage() {
  return (
    <>
      <MotocareMotion />
      <WebflowClientEffects />
      <main className="main main--subpage">
        <SiteNav />
        <ShopCartPage />
        <SiteFooter />
      </main>
    </>
  );
}
