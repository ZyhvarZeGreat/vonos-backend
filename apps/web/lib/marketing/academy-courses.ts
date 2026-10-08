import { cdn } from "@/lib/cdn";
import {
  ACADEMY_COURSE_PHOTOS,
  ACADEMY_INSTRUCTOR_PHOTOS,
} from "@/lib/marketing/vonos-photos";

export type AcademyCourse = {
  id: string;
  title: string;
  duration: string;
  level: "Foundation" | "Intermediate" | "Advanced";
  summary: string;
  icon: string;
  image: string;
};

/** Editable programme list for /academy — no CMS yet. */
export const ACADEMY_COURSES: AcademyCourse[] = [
  {
    id: "service-basics",
    title: "Service & maintenance fundamentals",
    duration: "4 weeks",
    level: "Foundation",
    summary:
      "Oil, filters, fluids, multi-point inspection, and workshop safety — the core habits every bay starts with.",
    icon: cdn("/images/icons/tag.svg"),
    image: ACADEMY_COURSE_PHOTOS[0],
  },
  {
    id: "brakes-suspension",
    title: "Brakes & suspension",
    duration: "3 weeks",
    level: "Intermediate",
    summary:
      "Pad and disc replacement, bleeding, bushings, shocks, and how to diagnose noise and pull under braking.",
    icon: cdn("/images/icons/calendar.svg"),
    image: ACADEMY_COURSE_PHOTOS[1],
  },
  {
    id: "diagnostics",
    title: "Diagnostics & electrics",
    duration: "6 weeks",
    level: "Advanced",
    summary:
      "Scan tools, live data, charging systems, sensors, and tracing faults without guessing parts.",
    icon: cdn("/images/icons/security.svg"),
    image: ACADEMY_COURSE_PHOTOS[2],
  },
];

/** Six steps — matches the Gozy-style 2 × 3 "step-by-step" grid. */
export const ACADEMY_STEPS = [
  {
    title: "Enquire",
    body: "Tell us which programme you want and how to reach you. We reply by phone or WhatsApp.",
  },
  {
    title: "Confirm your seat",
    body: "We confirm dates, fees, and what to bring. A seat is held once you accept the offer.",
  },
  {
    title: "Induction & tools",
    body: "First session covers bay safety, tool discipline, and how work flows through the shop.",
  },
  {
    title: "Bay-led training",
    body: "You work on live vehicles under working technicians — the same floor as Vonos Mechanic.",
  },
  {
    title: "Assessment",
    body: "Practical checks on the skills that matter for the programme you enrolled on.",
  },
  {
    title: "Certificate & next steps",
    body: "Complete the programme and receive a Vonos Academy certificate, with placement considered for strong trainees.",
  },
] as const;

/**
 * Student feedback for the /academy testimonials grid.
 * TODO(copy): placeholder quotes — replace with real trainee reviews before launch.
 */
export const ACADEMY_TESTIMONIALS = [
  {
    name: "Chinedu O.",
    detail: "Service & maintenance fundamentals",
    quote:
      "Four weeks in and I was doing real oil services under supervision. The trainers correct you in the moment instead of letting bad habits stick.",
  },
  {
    name: "Amina B.",
    detail: "Diagnostics & electrics",
    quote:
      "I came in knowing how to change parts, not how to find a fault. Live data and wiring work finally made sense after a week on the scan tools.",
  },
  {
    name: "Tunde A.",
    detail: "Brakes & suspension",
    quote:
      "Small group, so you are not waiting your turn. I logged enough brake jobs in three weeks to feel confident doing them solo.",
  },
  {
    name: "Grace E.",
    detail: "Service & maintenance fundamentals",
    quote:
      "Career change from retail. The bay time is the difference — you leave with your hands on real cars, not just notes.",
  },
  {
    name: "Ibrahim S.",
    detail: "Diagnostics & electrics",
    quote:
      "They teach you to prove the fault before quoting. That one habit is what workshop managers ask about in interviews.",
  },
  {
    name: "Blessing N.",
    detail: "Brakes & suspension",
    quote:
      "Certificate came through straight after assessment and the team helped prep my CV for workshop roles.",
  },
] as const;

export const ACADEMY_STATS = [
  { value: "3", label: "Core programmes" },
  { value: "80%", label: "Bay time, not slides" },
  { value: "1:6", label: "Trainer to trainee" },
  { value: "Abuja", label: "Kubwa workshop" },
] as const;

export const ACADEMY_WHO_FOR = [
  "School leavers and apprentices starting in the trade",
  "Career-changers who want supervised bay hours",
  "Working technicians sharpening diagnostics skills",
] as const;

/** What you leave with — Motocare `.grid-why-choose` (3 columns). */
export const ACADEMY_OUTCOMES = [
  {
    title: "Hands-on hours logged",
    body: "Real vehicles, real tools, supervised by working technicians — not a theory-only classroom.",
    icon: cdn("/images/icons/tag.svg"),
  },
  {
    title: "Completion certificate",
    body: "A clear record of the programme you finished, ready to show employers or attach to a CV.",
    icon: cdn("/images/icons/calendar.svg"),
  },
  {
    title: "Path into the workshop",
    body: "Strong performers get considered for placement and further training inside Vonos Mechanic.",
    icon: cdn("/images/icons/security.svg"),
  },
] as const;

/**
 * Instructor cards — photos from Vonos workshop shoot.
 */
export const ACADEMY_INSTRUCTORS = [
  {
    name: "Lead trainer",
    role: "Service & maintenance · workshop lead",
    image: ACADEMY_INSTRUCTOR_PHOTOS[0],
  },
  {
    name: "Diagnostics coach",
    role: "Electrics & scan tools · senior tech",
    image: ACADEMY_INSTRUCTOR_PHOTOS[1],
  },
  {
    name: "Chassis specialist",
    role: "Brakes & suspension · instructor",
    image: ACADEMY_INSTRUCTOR_PHOTOS[2],
  },
] as const;

export const ACADEMY_FAQS = [
  {
    q: "Do I need prior workshop experience?",
    a: "Foundation programmes welcome beginners. Intermediate and Advanced assume you’ve spent time around tools or completed an earlier course — tell us your background when you enquire.",
  },
  {
    q: "Where does training happen?",
    a: "At Vonos Plaza, Military Roundabout, Kubwa, Abuja — the same site as the working workshop, so you train on live bay conditions.",
  },
  {
    q: "How do fees and seats work?",
    a: "Enquire first. We confirm dates, fees, and what to bring by phone or WhatsApp. A seat is held once you accept the offer — no online payment on this page.",
  },
  {
    q: "Will I get a certificate?",
    a: "Yes. Complete the programme and assessments and you’ll receive a Vonos Academy completion certificate for that course.",
  },
  {
    q: "Can this lead to a job at Vonos?",
    a: "Strong trainees may be considered for placement or further training with Vonos Mechanic. Placement isn’t guaranteed — we match workshop needs with performance.",
  },
] as const;

export const ACADEMY_CONTACT = {
  email: "info@vonos.com",
  phoneDisplay: "+234 916 629 5819",
  phoneTel: "+2349166295819",
  whatsappE164: "2349166295819",
  location: "Vonos Plaza, Military Roundabout, Kubwa, Abuja",
} as const;

export const ACADEMY_TICKER = [
  "Bay-led training",
  "Manufacturer-minded skills",
  "Abuja · Kubwa",
  "Apprentice to technician",
  "Supervised workshop hours",
  "Certificate on completion",
] as const;
