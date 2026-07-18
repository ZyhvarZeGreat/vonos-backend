"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AddProductForm } from "@/components/organisms/AddProductForm";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";

export function AddProductView() {
  const tenantId = useTenantId();
  const { config, tenantCode } = useRouteTenant();
  const queryClient = useQueryClient();
  const retailMode = config?.archetype === "transaction" && tenantCode === "VC";

  if (!tenantId) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted">
        Select a business entity to add a product.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        Add new product
      </h1>
      <AddProductForm
        tenantId={tenantId}
        tenantConfig={config}
        retailMode={retailMode}
        variant="page"
        onSuccess={async () => {
          await queryClient.invalidateQueries({ queryKey: ["items"] });
          await queryClient.invalidateQueries({ queryKey: ["catalog"] });
          await queryClient.invalidateQueries({ queryKey: ["catalog-meta"] });
        }}
      />
    </div>
  );
}
