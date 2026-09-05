import type { Metadata } from "next";
import { Suspense } from "react";

import MotocareMotion from "@/components/marketing/MotocareMotion";
import TrackVehiclePanel from "@/components/marketing/pages/track/TrackVehiclePanel";
import SiteFooter from "@/components/marketing/SiteFooter";
import SiteNav from "@/components/marketing/SiteNav";
import WebflowClientEffects from "@/components/marketing/WebflowClientEffects";

export const metadata: Metadata = {
  title: "Track my vehicle | Vonos",
  description:
    "Track your vehicle repair status with Vonos — enter your name and registration plate for live updates.",
};

export default function TrackPage() {
  return (
    <>
      <MotocareMotion />
      <WebflowClientEffects />
      <main className="main main--subpage">
        <SiteNav />
        <Suspense fallback={null}>
          <TrackVehiclePanel />
        </Suspense>
        <SiteFooter />
      </main>
    </>
  );
}
