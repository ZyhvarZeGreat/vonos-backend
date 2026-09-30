import type { Metadata } from "next";
import { Suspense } from "react";

import MotocareMotion from "@/components/marketing/MotocareMotion";
import AcademyAbout from "@/components/marketing/pages/academy/AcademyAbout";
import AcademyCourses from "@/components/marketing/pages/academy/AcademyCourses";
import AcademyEnrolForm from "@/components/marketing/pages/academy/AcademyEnrolForm";
import AcademyFaq from "@/components/marketing/pages/academy/AcademyFaq";
import AcademyHero from "@/components/marketing/pages/academy/AcademyHero";
import AcademyHowItWorks from "@/components/marketing/pages/academy/AcademyHowItWorks";
import AcademyInstructors from "@/components/marketing/pages/academy/AcademyInstructors";
import AcademyOutcomes from "@/components/marketing/pages/academy/AcademyOutcomes";
import AcademyStats from "@/components/marketing/pages/academy/AcademyStats";
import AcademyWhoFor from "@/components/marketing/pages/academy/AcademyWhoFor";
import SiteFooter from "@/components/marketing/SiteFooter";
import SiteNav from "@/components/marketing/SiteNav";
import WebflowClientEffects from "@/components/marketing/WebflowClientEffects";

export const metadata: Metadata = {
  title: "Vonos Academy | Automotive training · Abuja",
  description:
    "Practical automotive training at Vonos Academy in Kubwa, Abuja — courses, enrolment, and institute programmes for apprentices and technicians.",
  alternates: { canonical: "/academy" },
};

export default function AcademyPage() {
  return (
    <>
      <MotocareMotion />
      <WebflowClientEffects />
      <main className="main main--subpage">
        <SiteNav />
        <AcademyHero />
        <AcademyStats />
        <AcademyAbout />
        <AcademyWhoFor />
        <AcademyCourses />
        <AcademyHowItWorks />
        <AcademyOutcomes />
        <AcademyInstructors />
        <AcademyFaq />
        <Suspense fallback={null}>
          <AcademyEnrolForm />
        </Suspense>
        <SiteFooter />
      </main>
    </>
  );
}
