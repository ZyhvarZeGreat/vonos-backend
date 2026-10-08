import type { Metadata } from "next";

import BlogIndex from "@/components/marketing/ecommerce/BlogIndex";
import FaqSection from "@/components/marketing/ecommerce/FaqSection";
import MotocareMotion from "@/components/marketing/MotocareMotion";
import SiteFooter from "@/components/marketing/SiteFooter";
import SiteNav from "@/components/marketing/SiteNav";
import WebflowClientEffects from "@/components/marketing/WebflowClientEffects";
import { fetchPublicCmsPosts } from "@/lib/marketing/cms-api";

export const metadata: Metadata = {
  title: "Blog | Vonos",
  description:
    "Workshop notes, maintenance guides, and honest car advice from the Vonos team in Abuja.",
  alternates: { canonical: "/blog" },
};

/** Hourly ISR — CMS publishes are rare; editors can revalidate on demand. */
export const revalidate = 3600;

export default async function BlogPage() {
  const { items } = await fetchPublicCmsPosts(50);

  return (
    <>
      <MotocareMotion />
      <WebflowClientEffects />
      <main className="main main--subpage vg-page">
        <SiteNav />
        <BlogIndex posts={items} />
        <FaqSection />
        <SiteFooter showCta={false} />
      </main>
    </>
  );
}
