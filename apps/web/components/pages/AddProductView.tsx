"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Item } from "@vonos/types";
import { AddProductForm } from "@/components/organisms/AddProductForm";
import { getProductForForm } from "@/lib/api/catalog";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { hq6CopyForSlug } from "@/lib/registries/hq6PageCopy";
import {
  DETAIL_RECORD_STALE_MS,
  productDuplicateQueryKey,
  productEditQueryKey,
} from "@/lib/query/prefetchListDetails";
import { goToList } from "@/lib/utils/goToList";
import { tenantBasePath } from "@/lib/utils/tenantMount";

function productsListSlug(
  isHq6: boolean,
  archetype: string | null | undefined,
): "catalog" | "inventory" {
  // Match sidebar List Products (posNavSections): HQ6 always uses /catalog.
  if (isHq6) return "catalog";
  return archetype === "stock" ? "inventory" : "catalog";
}

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

  const catalogListPath = tenantCode
    ? `${tenantBasePath(tenantCode)}/${productsListSlug(isHq6, config?.archetype)}`
    : null;

  const cachedItem = (id: string | null): Item | undefined => {
    if (!id || !tenantId) return undefined;
    return (
      queryClient.getQueryData<Item>(["item", tenantId, id, "catalog"]) ??
      queryClient.getQueryData<Item>(["item", tenantId, id, "inventory"]) ??
      queryClient.getQueryData<Item>(["item", "edit-page", id]) ??
      queryClient.getQueryData<Item>(["item", "duplicate-page", id])
    );
  };

  // Keep last good row so a failed background refetch does not blank the form
  // (placeholderData alone is discarded on error in TanStack Query).
  const lastEditRef = useRef<Item | null>(null);
  const lastDuplicateRef = useRef<Item | null>(null);
  useEffect(() => {
    lastEditRef.current = null;
  }, [editId]);
  useEffect(() => {
    lastDuplicateRef.current = null;
  }, [duplicateId]);

  const cachedDuplicate = cachedItem(duplicateId);
  const cachedEdit = cachedItem(editId);

  const {
    data: duplicateFrom,
    isError: duplicateError,
    isPending: duplicatePending,
  } = useQuery({
    queryKey: productDuplicateQueryKey(duplicateId ?? ""),
    // Catalog first (own tenant), then /items for local migration rows.
    queryFn: () => getProductForForm(duplicateId!),
    enabled: Boolean(duplicateId) && !editId,
    staleTime: DETAIL_RECORD_STALE_MS,
    // initialData survives refetch errors; placeholderData does not.
    initialData: cachedDuplicate,
    initialDataUpdatedAt: cachedDuplicate ? 0 : undefined,
    retry: 2,
  });

  const {
    data: editFrom,
    isError: editError,
    isPending: editPending,
  } = useQuery({
    queryKey: productEditQueryKey(editId ?? ""),
    queryFn: () => getProductForForm(editId!),
    enabled: Boolean(editId),
    staleTime: DETAIL_RECORD_STALE_MS,
    initialData: cachedEdit,
    initialDataUpdatedAt: cachedEdit ? 0 : undefined,
    retry: 2,
  });

  if (editFrom) lastEditRef.current = editFrom;
  if (duplicateFrom) lastDuplicateRef.current = duplicateFrom;

  const resolvedEdit =
    editFrom ?? lastEditRef.current ?? (editId ? cachedEdit : undefined) ?? null;
  const resolvedDuplicate =
    duplicateFrom ??
    lastDuplicateRef.current ??
    (duplicateId ? cachedDuplicate : undefined) ??
    null;

  if (!tenantId) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted">
        Select a business entity to add a product.
      </div>
    );
  }

  // Only hard-fail when we have nothing to paint (cold load + fetch failed).
  if (
    (editId && editError && !resolvedEdit) ||
    (duplicateId && !editId && duplicateError && !resolvedDuplicate)
  ) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted">
        Could not load that product. Refresh and try again.
      </div>
    );
  }

  // Show the form as soon as we have data (incl. list prefetch / initialData).
  // Do not block on isPlaceholderData — that left VISP/VSP edits stuck on Loading.
  if (
    (editId && !resolvedEdit && editPending) ||
    (duplicateId && !editId && !resolvedDuplicate && duplicatePending)
  ) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted">
        Loading product…
      </div>
    );
  }

  const form = (
    <AddProductForm
      tenantId={tenantId}
      tenantConfig={config}
      retailMode={retailMode}
      variant="page"
      duplicateFrom={duplicateId && !editId ? resolvedDuplicate : null}
      editFrom={editId ? resolvedEdit : null}
      onSuccess={(item, mode) => {
        queryClient.setQueryData(productEditQueryKey(item.id), item);
        queryClient.setQueryData(
          ["item", tenantId, item.id, "catalog"],
          item,
        );
        queryClient.setQueryData(
          ["item", tenantId, item.id, "inventory"],
          item,
        );
        void queryClient.invalidateQueries({ queryKey: ["items"] });
        void queryClient.invalidateQueries({ queryKey: ["catalog"] });
        void queryClient.invalidateQueries({ queryKey: ["catalog-meta"] });
        if (mode === "saveAnother") return;
        if (catalogListPath) goToList(catalogListPath);
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
