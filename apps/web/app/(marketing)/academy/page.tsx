import type { Metadata } from "next";
import { Suspense } from "react";

import MotocareMotion from "@/components/marketing/MotocareMotion";
import AcademyCta from "@/components/marketing/pages/academy/AcademyCta";
import AcademyEnrolForm from "@/components/marketing/pages/academy/AcademyEnrolForm";
import AcademyFaq from "@/components/marketing/pages/academy/AcademyFaq";
import AcademyHero from "@/components/marketing/pages/academy/AcademyHero";
import AcademyInstructors from "@/components/marketing/pages/academy/AcademyInstructors";
import AcademyPhilosophy from "@/components/marketing/pages/academy/AcademyPhilosophy";
import AcademyPosts from "@/components/marketing/pages/academy/AcademyPosts";
import AcademyCourses from "@/components/marketing/pages/academy/AcademyCourses";
import AcademyShowcase from "@/components/marketing/pages/academy/AcademyShowcase";
import AcademyStats from "@/components/marketing/pages/academy/AcademyStats";
import AcademySteps from "@/components/marketing/pages/academy/AcademySteps";
import AcademyTestimonials from "@/components/marketing/pages/academy/AcademyTestimonials";
import SiteFooter from "@/components/marketing/SiteFooter";
import SiteNav from "@/components/marketing/SiteNav";
import WebflowClientEffects from "@/components/marketing/WebflowClientEffects";

import "@/styles/academy.css";

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
      <main className="main main--subpage ac-page">
        <SiteNav />
        <AcademyHero />
        <AcademyPhilosophy />
        <AcademyShowcase />
        <AcademyCourses />
        <AcademySteps />
        <AcademyInstructors />
        <AcademyTestimonials />
        <AcademyPosts />
        <AcademyStats />
        <AcademyCta />
        <AcademyFaq />
        <Suspense fallback={null}>
          <AcademyEnrolForm />
        </Suspense>
        <SiteFooter />
      </main>
    </>
  );
}
