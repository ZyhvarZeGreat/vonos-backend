import { ACADEMY_INSTRUCTOR_PHOTOS } from "@/lib/marketing/vonos-photos";

export type AcademyCourse = {
  id: string;
  title: string;
  duration: string;
  level: "Foundation" | "Intermediate" | "Advanced";
  summary: string;
  icon: string;
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
    icon: "/images/icons/tag.svg",
  },
  {
    id: "brakes-suspension",
    title: "Brakes & suspension",
    duration: "3 weeks",
    level: "Intermediate",
    summary:
      "Pad and disc replacement, bleeding, bushings, shocks, and how to diagnose noise and pull under braking.",
    icon: "/images/icons/calendar.svg",
  },
  {
    id: "diagnostics",
    title: "Diagnostics & electrics",
    duration: "6 weeks",
    level: "Advanced",
    summary:
      "Scan tools, live data, charging systems, sensors, and tracing faults without guessing parts.",
    icon: "/images/icons/security.svg",
  },
];

/** Three steps — matches Motocare `.grid-step-list` (3 columns). */
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
    title: "Train & certify",
    body: "Bay-led training with a completion certificate and paths into workshop placement.",
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
    icon: "/images/icons/tag.svg",
  },
  {
    title: "Completion certificate",
    body: "A clear record of the programme you finished, ready to show employers or attach to a CV.",
    icon: "/images/icons/calendar.svg",
  },
  {
    title: "Path into the workshop",
    body: "Strong performers get considered for placement and further training inside Vonos Mechanic.",
    icon: "/images/icons/security.svg",
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
  phoneDisplay: "+1 202 555 0147",
  phoneTel: "+12025550147",
  whatsappE164: "12025550147",
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
