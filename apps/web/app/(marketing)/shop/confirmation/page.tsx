import type { Metadata } from "next";
import { Suspense } from "react";

import MotocareMotion from "@/components/marketing/MotocareMotion";
import OrderConfirmationPanel from "@/components/marketing/pages/shop/OrderConfirmationPanel";
import SiteFooter from "@/components/marketing/SiteFooter";
import SiteNav from "@/components/marketing/SiteNav";
import WebflowClientEffects from "@/components/marketing/WebflowClientEffects";

export const metadata: Metadata = {
  title: "Order confirmed | Vonos Shop",
  description: "Your Vonos parts order has been placed.",
};

export default function ShopConfirmationPage() {
  return (
    <>
      <MotocareMotion />
      <WebflowClientEffects />
      <main className="main main--subpage">
        <SiteNav />
        <Suspense fallback={null}>
          <OrderConfirmationPanel />
        </Suspense>
        <SiteFooter />
      </main>
    </>
  );
}
