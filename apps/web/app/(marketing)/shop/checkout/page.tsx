import type { Metadata } from "next";

import MotocareMotion from "@/components/marketing/MotocareMotion";
import CheckoutPanel from "@/components/marketing/pages/shop/CheckoutPanel";
import SiteFooter from "@/components/marketing/SiteFooter";
import SiteNav from "@/components/marketing/SiteNav";
import WebflowClientEffects from "@/components/marketing/WebflowClientEffects";

export const metadata: Metadata = {
  title: "Checkout | Vonos Shop",
  description: "Complete your Vonos parts order — collection or workshop fitment.",
};

export default function ShopCheckoutPage() {
  return (
    <>
      <MotocareMotion />
      <WebflowClientEffects />
      <main className="main main--subpage">
        <SiteNav />
        <CheckoutPanel />
        <SiteFooter />
      </main>
    </>
  );
}
