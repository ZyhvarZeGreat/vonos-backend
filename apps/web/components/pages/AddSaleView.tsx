"use client";

import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AddSaleForm } from "@/components/organisms/AddSaleForm";
import { Hq6FormShell } from "@/components/hq6/Hq6Chrome";
import { getSale } from "@/lib/api/sales";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { hq6CopyForSlug } from "@/lib/registries/hq6PageCopy";
import type { SaleFormPresetStatus } from "@/stores/uiStore";

function AddSalePage({
  presetStatus,
  title,
  slug,
}: {
  presetStatus: SaleFormPresetStatus;
  title: string;
  slug: string;
}) {
  const tenantId = useTenantId();
  const { config } = useRouteTenant();
  const queryClient = useQueryClient();
  const isHq6 = useIsVaHq6();
  const copy = hq6CopyForSlug(slug);
  const searchParams = useSearchParams();
  const editSaleId = searchParams.get("edit");
  const jobId = searchParams.get("job");
  const docLabel = title.replace(/^Add /, "");

  const { data: editSale } = useQuery({
    queryKey: ["sale", "edit-title", editSaleId],
    queryFn: () => getSale(editSaleId!, tenantId!),
    enabled: Boolean(editSaleId && tenantId),
  });

  if (!tenantId) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted">
        Select a business entity to record a sale.
      </div>
    );
  }

  const pageTitle = editSaleId
    ? editSale?.reference
      ? `Edit ${docLabel} (Invoice No: ${editSale.reference})`
      : `Edit ${docLabel}`
    : copy.title || title;

  const form = (
    <AddSaleForm
      tenantId={tenantId}
      tenantConfig={config}
      presetStatus={presetStatus}
      editSaleId={editSaleId}
      initialJobId={jobId}
      variant="page"
      onSuccess={async () => {
        await queryClient.invalidateQueries({ queryKey: ["sales"] });
        await queryClient.invalidateQueries({ queryKey: ["items"] });
        await queryClient.invalidateQueries({ queryKey: ["catalog"] });
        await queryClient.invalidateQueries({ queryKey: ["ledgerTablePage"] });
        await queryClient.invalidateQueries({ queryKey: ["ledgerSummary"] });
      }}
    />
  );

  if (isHq6) {
    return (
      <Hq6FormShell
        multiCard
        title={pageTitle}
        subtitle={editSaleId ? undefined : copy.subtitle}
      >
        {form}
      </Hq6FormShell>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        {pageTitle}
      </h1>
      {form}
    </div>
  );
}

export function AddSaleView() {
  return <AddSalePage presetStatus="final" title="Add Sale" slug="add-sale" />;
}

export function AddDraftView() {
  return <AddSalePage presetStatus="draft" title="Add Draft" slug="add-draft" />;
}

export function AddQuotationView() {
  return (
    <AddSalePage
      presetStatus="quotation"
      title="Add Quotation"
      slug="add-quotation"
    />
  );
}

export function AddOrderView() {
  return <AddSalePage presetStatus="final" title="Add Order" slug="add-sale" />;
}
