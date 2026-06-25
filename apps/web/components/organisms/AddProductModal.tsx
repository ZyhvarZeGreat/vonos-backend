"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Modal, ModalFooter, ModalHeader } from "@/components/atoms/Modal";
import { Select } from "@/components/atoms/Select";
import { createItem, getItems } from "@/lib/api/items";
import { getCatalogMeta } from "@/lib/api/catalogMeta";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import {
  assertBusinessLocationSelected,
  useBusinessLocationOptions,
} from "@/lib/hooks/useBusinessLocationOptions";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { useUiStore } from "@/stores/uiStore";

function emptyProductForm() {
  return {
    name: "",
    sku: "",
    barcodeType: "C128",
    unit: "",
    brand: "",
    category: "",
    subCategory: "",
    manageStock: true,
    alertQuantity: "0",
    description: "",
    purchaseExcTax: "",
    purchaseIncTax: "",
    marginPercent: "0",
    sellingExcTax: "",
    locationCode: "",
    notForSelling: false,
  };
}

export function AddProductModal() {
  const activeModal = useUiStore((state) => state.activeModal);
  const productFlow = useUiStore((state) => state.productFlow);
  const closeModal = useUiStore((state) => state.closeModal);
  const tenantId = useTenantId();
  const { config: tenantConfig } = useRouteTenant();
  const { options: businessLocationOptions, required: locationRequired } =
    useBusinessLocationOptions(tenantConfig);
  const queryClient = useQueryClient();
  const open = activeModal === "addProduct";

  const [form, setForm] = useState(emptyProductForm);
  const [error, setError] = useState<string | null>(null);

  const retailMode = productFlow === "menu-item";

  const { data: items = [] } = useQuery({
    queryKey: ["items", tenantId],
    queryFn: () => getItems(tenantId!),
    enabled: Boolean(tenantId) && open,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["catalog-meta", tenantId, "categories"],
    queryFn: () => getCatalogMeta(tenantId!, "categories"),
    enabled: Boolean(tenantId) && open,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["catalog-meta", tenantId, "brands"],
    queryFn: () => getCatalogMeta(tenantId!, "brands"),
    enabled: Boolean(tenantId) && open,
  });

  const { data: units = [] } = useQuery({
    queryKey: ["catalog-meta", tenantId, "units"],
    queryFn: () => getCatalogMeta(tenantId!, "units"),
    enabled: Boolean(tenantId) && open,
  });

  const categoryOptions = useMemo(() => {
    const fromMeta = categories.map((row) => row.name);
    const fromItems = [...new Set(items.map((item) => item.category).filter(Boolean))] as string[];
    const merged = [...new Set([...fromMeta, ...fromItems, ...(tenantConfig?.itemCategories ?? [])])].sort();
    return [{ value: "", label: "Select category…" }, ...merged.map((c) => ({ value: c, label: c }))];
  }, [categories, items, tenantConfig?.itemCategories]);

  const brandOptions = useMemo(
    () => [
      { value: "", label: "Select brand…" },
      ...brands.map((row) => ({ value: row.name, label: row.name })),
    ],
    [brands],
  );

  const unitOptions = useMemo(
    () => [
      { value: "", label: "Select unit…" },
      ...units.map((row) => ({ value: row.name, label: row.name })),
    ],
    [units],
  );

  const showLocationField = (tenantConfig?.businessLocations?.length ?? 0) > 0;

  const reset = () => {
    setForm(emptyProductForm());
    setError(null);
  };

  const handleClose = () => {
    reset();
    closeModal();
  };

  const setField = (key: keyof ReturnType<typeof emptyProductForm>, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const applyMarginToSelling = (purchase: string, margin: string) => {
    const base = Number(purchase);
    const pct = Number(margin);
    if (!Number.isFinite(base) || !Number.isFinite(pct)) return;
    const selling = base * (1 + pct / 100);
    setField("sellingExcTax", selling.toFixed(2));
  };

  const mutation = useAppMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant selected");
      assertBusinessLocationSelected(locationRequired, form.locationCode);
      const cost = Number(form.sellingExcTax || form.purchaseExcTax);
      if (!form.name.trim()) throw new Error("Product name is required");
      if (!form.sku.trim()) throw new Error("SKU is required");
      if (!Number.isFinite(cost) || cost < 0) throw new Error("Enter a valid selling price");
      return createItem(tenantId, {
        sku: form.sku.trim(),
        name: form.name.trim(),
        category: form.category.trim() || undefined,
        quantity: form.manageStock ? Number(form.alertQuantity) || 0 : 0,
        costPrice: cost,
        reorderPoint: form.manageStock ? Number(form.alertQuantity) || undefined : undefined,
        locationCode: form.locationCode.trim() || undefined,
        availableForRetail: retailMode ? true : !form.notForSelling,
      });
    },
    successMessage: "Product created",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["items"] });
      await queryClient.invalidateQueries({ queryKey: ["catalog"] });
      handleClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!open) return null;

  return (
    <Modal open={open} onClose={handleClose} panelClassName="max-w-3xl max-h-[92vh] flex flex-col">
      <ModalHeader
        title="Add new product"
        subtitle="Basic info, stock, and pricing in one form"
        onClose={handleClose}
      />
      <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-2">
        <section className="space-y-3 rounded-lg border border-border p-3">
          <p className="text-sm font-medium text-foreground">Product information</p>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              label="Product name"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
            />
            <Input label="SKU" value={form.sku} onChange={(e) => setField("sku", e.target.value)} />
            <Select
              label="Barcode type"
              value={form.barcodeType}
              onChange={(e) => setField("barcodeType", e.target.value)}
              options={[{ value: "C128", label: "Code 128 (C128)" }]}
            />
            <Select
              label="Unit"
              value={form.unit}
              onChange={(e) => setField("unit", e.target.value)}
              options={unitOptions}
            />
            <Select
              label="Brand"
              value={form.brand}
              onChange={(e) => setField("brand", e.target.value)}
              options={brandOptions}
            />
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setField("category", e.target.value)}
              options={categoryOptions}
            />
            <Input
              label="Sub category"
              value={form.subCategory}
              onChange={(e) => setField("subCategory", e.target.value)}
            />
            {showLocationField ? (
              <Select
                label="Business location"
                value={form.locationCode}
                onChange={(e) => setField("locationCode", e.target.value)}
                options={businessLocationOptions}
              />
            ) : null}
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.manageStock}
              onChange={(e) => setField("manageStock", e.target.checked)}
            />
            Manage stock at product level
          </label>
          {form.manageStock ? (
            <Input
              label="Alert quantity"
              type="number"
              min="0"
              value={form.alertQuantity}
              onChange={(e) => setField("alertQuantity", e.target.value)}
            />
          ) : null}
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.notForSelling}
              onChange={(e) => setField("notForSelling", e.target.checked)}
            />
            Not for selling
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Product description</span>
            <textarea
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm"
            />
          </label>
        </section>

        <section className="space-y-3 rounded-lg border border-border p-3">
          <p className="text-sm font-medium text-foreground">Pricing & tax</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="px-2 py-2 font-medium">Purchase (exc. tax)</th>
                  <th className="px-2 py-2 font-medium">Purchase (inc. tax)</th>
                  <th className="px-2 py-2 font-medium">Margin %</th>
                  <th className="px-2 py-2 font-medium">Selling (exc. tax)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.purchaseExcTax}
                      onChange={(e) => {
                        setField("purchaseExcTax", e.target.value);
                        applyMarginToSelling(e.target.value, form.marginPercent);
                      }}
                      className="w-full rounded border border-border px-2 py-1"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.purchaseIncTax}
                      onChange={(e) => setField("purchaseIncTax", e.target.value)}
                      className="w-full rounded border border-border px-2 py-1"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.marginPercent}
                      onChange={(e) => {
                        setField("marginPercent", e.target.value);
                        applyMarginToSelling(form.purchaseExcTax, e.target.value);
                      }}
                      className="w-full rounded border border-border px-2 py-1"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.sellingExcTax}
                      onChange={(e) => setField("sellingExcTax", e.target.value)}
                      className="w-full rounded border border-border px-2 py-1"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {error ? <p className="text-sm text-error">{error}</p> : null}
      </div>
      <ModalFooter>
        <Button variant="secondary" size="sm" onClick={handleClose}>
          Cancel
        </Button>
        <Button size="sm" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
          {mutation.isPending ? "Saving…" : "Save product"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
