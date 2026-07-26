"use client";

import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AddProductForm } from "@/components/organisms/AddProductForm";
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
      : isHq6
        ? "Add new product"
        : copy.title;

  if (isHq6) {
    return (
      <div className="hq6-page hq6-add-product-page">
        <section className="content-header">
          <h1 className="tw-text-xl md:tw-text-3xl tw-font-bold tw-text-black">
            {title}
          </h1>
        </section>
        <section className="content">{form}</section>
        <p className="hq6-footer">
          Vonos Autos Head Office - V8.1 | Copyright ©{" "}
          {new Date().getFullYear()} All rights reserved.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight text-foreground">
        {title}
      </h1>
      {form}
    </div>
  );
}
