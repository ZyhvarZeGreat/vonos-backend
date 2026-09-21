import type { Metadata } from "next";
import { Suspense } from "react";

import MotocareMotion from "@/components/marketing/MotocareMotion";
import JobTrackPanel from "@/components/marketing/pages/track/JobTrackPanel";
import SiteFooter from "@/components/marketing/SiteFooter";
import SiteNav from "@/components/marketing/SiteNav";
import WebflowClientEffects from "@/components/marketing/WebflowClientEffects";

export const metadata: Metadata = {
  title: "Track my vehicle | Vonos",
  description: "Live repair status for your vehicle — no costs or parts list.",
};

export default async function JobTrackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <>
      <MotocareMotion />
      <WebflowClientEffects />
      <main className="main main--subpage">
        <SiteNav />
        <Suspense
          fallback={
            <section className="hero-section track-section">
              <div className="container">
                <p className="track-form-error" style={{ color: "inherit" }}>
                  Loading status…
                </p>
              </div>
            </section>
          }
        >
          <JobTrackPanel token={token} />
        </Suspense>
        <SiteFooter />
      </main>
    </>
  );
}
