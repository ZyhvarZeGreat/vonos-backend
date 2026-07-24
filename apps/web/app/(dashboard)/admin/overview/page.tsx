"use client";

import { Hq6PageFrame } from "@/components/hq6/Hq6Chrome";
import { VagGroupOverview } from "@/components/pages/VagAdminViews";
import { useAuthStore } from "@/stores/authStore";

export default function AdminOverviewPage() {
  const name = useAuthStore((state) => state.name);

  return (
    <Hq6PageFrame
      title="Group Overview"
      subtitle={
        name
          ? `Welcome, ${name} · Vonos Autos Group`
          : "Vonos Autos Group · Super admin"
      }
    >
      <div className="space-y-4">
        <div className="hq6-card px-4 py-3 text-sm text-[#6b7280]">
          Choose a business in the top-bar switcher to scope the workspace, or
          use the sidebar for HRM, finance, and reports across the group.
        </div>
        <VagGroupOverview />
      </div>
    </Hq6PageFrame>
  );
}
