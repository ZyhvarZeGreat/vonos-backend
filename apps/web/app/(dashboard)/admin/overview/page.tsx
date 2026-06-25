"use client";

import { VagGroupOverview } from "@/components/pages/VagAdminViews";
import { EntityPicker } from "@/components/organisms/EntityPicker";
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
          Welcome{name ? `, ${name}` : ""}. Select any entity to enter its operational workspace —
          same templates, config-driven per tenant. Use the sidebar for cross-entity users, finance,
          and reports.
        </p>
      </div>
      <VagGroupOverview />
      <details className="rounded-xl border border-border bg-card p-4">
        <summary className="cursor-pointer text-sm font-medium text-foreground">
          Compact entity picker
        </summary>
        <div className="mt-4">
          <EntityPicker />
        </div>
      </details>
    </div>
  );
}
