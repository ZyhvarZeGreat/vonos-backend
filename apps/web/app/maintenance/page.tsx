import type { Metadata } from "next";

import { VonosMaintenanceLanding } from "@/components/pages/VonosMaintenanceLanding";

export const metadata: Metadata = {
  title: "Vonos Group — Maintenance",
  description:
    "We are working on a new and improved experience for our customers.",
};

/** Former apex landing — kept for ops/basePath fallback and status pages. */
export default function MaintenancePage() {
  return <VonosMaintenanceLanding />;
}
