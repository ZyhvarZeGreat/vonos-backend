"use client";

import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AddProductForm } from "@/components/organisms/AddProductForm";
import { Hq6FormShell } from "@/components/hq6/Hq6Chrome";
import { getItem } from "@/lib/api/items";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { hq6CopyForSlug } from "@/lib/registries/hq6PageCopy";

export function AddProductView() {
  const tenantId = useTenantId();
  const { config, tenantCode } = useRouteTenant();
  const queryClient = useQueryClient();
  const isHq6 = useIsVaHq6();
  const copy = hq6CopyForSlug("add-product");
  const retailMode = config?.archetype === "transaction" && tenantCode === "VC";
  const searchParams = useSearchParams();
  const duplicateId = searchParams.get("d");
  const editId = searchParams.get("edit");

  const { data: duplicateFrom } = useQuery({
    queryKey: ["item", "duplicate-page", duplicateId],
    queryFn: () => getItem(duplicateId!),
    enabled: Boolean(duplicateId) && !editId,
  });

  const { data: editFrom } = useQuery({
    queryKey: ["item", "edit-page", editId],
    queryFn: () => getItem(editId!),
    enabled: Boolean(editId),
  });

  if (!tenantId) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted">
        Select a business entity to add a product.
      </div>
    );
  }

  const form = (
    <AddProductForm
      tenantId={tenantId}
      tenantConfig={config}
      retailMode={retailMode}
      variant="page"
      duplicateFrom={duplicateId && !editId ? duplicateFrom ?? null : null}
      editFrom={editId ? editFrom ?? null : null}
      onSuccess={async () => {
        await queryClient.invalidateQueries({ queryKey: ["items"] });
        await queryClient.invalidateQueries({ queryKey: ["catalog"] });
        await queryClient.invalidateQueries({ queryKey: ["catalog-meta"] });
      }}
    />
  );

  const title = editId
    ? "Edit product"
    : duplicateId
      ? "Duplicate product"
      : copy.title;
  const subtitle = editId
    ? `Editing ${editFrom?.name ?? "product"}`
    : duplicateId
      ? `Prefilling from ${duplicateFrom?.name ?? "product"}`
      : copy.subtitle;

  if (isHq6) {
    return (
      <Hq6FormShell multiCard title={title} subtitle={subtitle}>
        {form}
      </Hq6FormShell>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        {editId ? "Edit product" : duplicateId ? "Duplicate product" : "Add new product"}
      </h1>
      {form}
    </div>
  );
}
