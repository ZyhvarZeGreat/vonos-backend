import type { Metadata } from "next";

import MotocareMotion from "@/components/marketing/MotocareMotion";
import BlogPageHero from "@/components/marketing/pages/blog/BlogPageHero";
import BlogPageList from "@/components/marketing/pages/blog/BlogPageList";
import SiteFooter from "@/components/marketing/SiteFooter";
import SiteNav from "@/components/marketing/SiteNav";
import WebflowClientEffects from "@/components/marketing/WebflowClientEffects";

export const metadata: Metadata = {
  title: "Blog | Vonos",
  description:
    "Workshop notes, maintenance guides, and honest car advice from the Vonos team in Abuja.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return (
    <>
      <MotocareMotion />
      <WebflowClientEffects />
      <main className="main main--subpage">
        <SiteNav />
        <BlogPageHero />
        <BlogPageList />
        <SiteFooter showCta={false} />
      </main>
    </>
  );
}
