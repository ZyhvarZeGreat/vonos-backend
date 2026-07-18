"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AddSaleForm } from "@/components/organisms/AddSaleForm";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import type { SaleFormPresetStatus } from "@/stores/uiStore";

function AddSalePage({
  presetStatus,
  title,
}: {
  presetStatus: SaleFormPresetStatus;
  title: string;
}) {
  const tenantId = useTenantId();
  const { config } = useRouteTenant();
  const queryClient = useQueryClient();

  if (!tenantId) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted">
        Select a business entity to record a sale.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      <AddSaleForm
        tenantId={tenantId}
        tenantConfig={config}
        presetStatus={presetStatus}
        variant="page"
        onSuccess={async () => {
          await queryClient.invalidateQueries({ queryKey: ["sales"] });
          await queryClient.invalidateQueries({ queryKey: ["items"] });
          await queryClient.invalidateQueries({ queryKey: ["catalog"] });
          await queryClient.invalidateQueries({ queryKey: ["ledgerTablePage"] });
          await queryClient.invalidateQueries({ queryKey: ["ledgerSummary"] });
        }}
      />
    </div>
  );
}

export function AddSaleView() {
  return <AddSalePage presetStatus="final" title="Add Sale" />;
}

export function AddDraftView() {
  return <AddSalePage presetStatus="draft" title="Add Draft" />;
}

export function AddQuotationView() {
  return <AddSalePage presetStatus="quotation" title="Add Quotation" />;
}

export function AddOrderView() {
  return <AddSalePage presetStatus="final" title="Add Order" />;
}
