"use client";

import { VagGroupOverview } from "@/components/pages/VagAdminViews";
import { useAuthStore } from "@/stores/authStore";

export default function AdminOverviewPage() {
  const name = useAuthStore((state) => state.name);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted">Vonos Autos Group · Super admin</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
          Select an entity
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Welcome{name ? `, ${name}` : ""}. Choose a business to open its dashboard, or use the
          sidebar for users, finance, and reports across the group.
        </p>
      </div>
      <VagGroupOverview />
    </div>
  );
}
