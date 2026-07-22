"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Info } from "lucide-react";
import type { Item, ItemLocationStockInput, ProductUnit, TenantConfig } from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { createItem, updateItem } from "@/lib/api/items";
import { getCatalogMeta } from "@/lib/api/catalogMeta";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { cn } from "@/lib/utils/cn";

export type ProductSaveMode = "save" | "saveAnother" | "saveOpeningStock";

type LocationDetail = {
  locationCode: string;
  locationName: string;
  rack: string;
  row: string;
  position: string;
  quantity: string;
};

function emptyForm() {
  return {
    name: "",
    sku: "",
    barcodeType: "C128",
    unit: "Single",
    relatedSubUnit: "",
    brand: "",
    category: "",
    subCategory: "",
    manageStock: true,
    alertQuantity: "",
    description: "",
    enableImei: false,
    notForSelling: false,
    weight: "",
    carModel: "",
    preparationMinutes: "",
    applicableTax: "none",
    sellingPriceTaxType: "exclusive",
    productType: "single",
    purchaseExcTax: "",
    purchaseIncTax: "",
    marginPercent: "0",
    sellingExcTax: "",
  };
}

function encodeBin(rack: string, row: string, position: string): string | undefined {
  const parts = [
    rack.trim() ? `Rack ${rack.trim()}` : "",
    row.trim() ? `Row ${row.trim()}` : "",
    position.trim() ? `Pos ${position.trim()}` : "",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export interface AddProductFormProps {
  tenantId: string;
  tenantConfig: TenantConfig | null | undefined;
  retailMode?: boolean;
  variant?: "page" | "modal";
  /** Prefill from an existing product (HQ6 Duplicate Product). */
  duplicateFrom?: Item | null;
  /** Prefill + PATCH existing product (HQ6 Edit product route). */
  editFrom?: Item | null;
  onSuccess?: (item: Item, mode: ProductSaveMode) => void;
  onCancel?: () => void;
}

export function AddProductForm({
  tenantId,
  tenantConfig,
  retailMode = false,
  variant = "page",
  duplicateFrom = null,
  editFrom = null,
  onSuccess,
  onCancel,
}: AddProductFormProps) {
  const queryClient = useQueryClient();
  const isHq6 = useIsVaHq6();
  const locations = tenantConfig?.businessLocations ?? [];

  const [form, setForm] = useState(emptyForm);
  const [locationDetails, setLocationDetails] = useState<LocationDetail[]>([]);
  const [selectedLocationCodes, setSelectedLocationCodes] = useState<string[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [saveMode, setSaveMode] = useState<ProductSaveMode>("save");

  useEffect(() => {
    const source = editFrom ?? duplicateFrom;
    if (!source) return;
    const isDuplicate = Boolean(duplicateFrom) && !editFrom;
    setForm({
      ...emptyForm(),
      name: isDuplicate ? `${source.name} (copy)` : source.name,
      sku: isDuplicate ? `${source.sku}-COPY` : source.sku,
      brand: source.brandName ?? "",
      category: source.category ?? "",
      description: source.description ?? "",
      unit: source.unit ?? "Single",
      weight: source.weight ?? "",
      carModel: source.carModel ?? "",
      purchaseExcTax: String(source.costPrice ?? ""),
      sellingExcTax: String(source.sellPrice ?? source.costPrice ?? ""),
      alertQuantity:
        source.reorderPoint != null ? String(source.reorderPoint) : "",
      enableImei: Boolean(source.enableImei),
      preparationMinutes:
        source.preparationMinutes != null
          ? String(source.preparationMinutes)
          : "",
      notForSelling: source.availableForRetail === false,
    });
  }, [duplicateFrom, editFrom]);

  useEffect(() => {
    if (locations.length === 0) return;
    setSelectedLocationCodes(locations.map((loc) => loc.code));
    setLocationDetails(
      locations.map((loc) => ({
        locationCode: loc.code,
        locationName: loc.name,
        rack: "",
        row: "",
        position: "",
        quantity: "",
      })),
    );
  }, [locations]);

  const metaStaleMs = 10 * 60_000;

  const { data: categories = [] } = useQuery({
    queryKey: ["catalog-meta", tenantId, "categories"],
    queryFn: () => getCatalogMeta(tenantId, "categories"),
    enabled: Boolean(tenantId),
    staleTime: metaStaleMs,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["catalog-meta", tenantId, "brands"],
    queryFn: () => getCatalogMeta(tenantId, "brands"),
    enabled: Boolean(tenantId),
    staleTime: metaStaleMs,
  });

  const { data: units = [] } = useQuery({
    queryKey: ["catalog-meta", tenantId, "units"],
    queryFn: () => getCatalogMeta(tenantId, "units") as Promise<ProductUnit[]>,
    enabled: Boolean(tenantId),
    staleTime: metaStaleMs,
  });

  const categoryOptions = useMemo(() => {
    const fromMeta = categories.map((row) => row.name);
    const merged = [
      ...new Set([...fromMeta, ...(tenantConfig?.itemCategories ?? [])]),
    ].sort();
    return [
      { value: "", label: "Please Select" },
      ...merged.map((c) => ({ value: c, label: c })),
    ];
  }, [categories, tenantConfig?.itemCategories]);

  const brandOptions = useMemo(
    () => [
      { value: "", label: "Please Select" },
      ...brands.map((row) => ({ value: row.name, label: row.name })),
    ],
    [brands],
  );

  const unitOptions = useMemo(() => {
    const fromMeta = units.map((row) => ({
      value: row.name,
      label: row.shortName ? `${row.name} (${row.shortName})` : row.name,
    }));
    if (fromMeta.length === 0) {
      return [
        { value: "Single", label: "Single (sng)" },
        { value: "Piece", label: "Piece (pc)" },
      ];
    }
    return fromMeta;
  }, [units]);

  const setField = (
    key: keyof ReturnType<typeof emptyForm>,
    value: string | boolean,
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const applyMarginToSelling = (purchase: string, margin: string) => {
    const base = Number(purchase);
    const pct = Number(margin);
    if (!Number.isFinite(base) || !Number.isFinite(pct)) return;
    setField("sellingExcTax", (base * (1 + pct / 100)).toFixed(2));
  };

  const updateLocationDetail = (
    code: string,
    patch: Partial<LocationDetail>,
  ) => {
    setLocationDetails((prev) =>
      prev.map((row) =>
        row.locationCode === code ? { ...row, ...patch } : row,
      ),
    );
  };

  const toggleLocation = (code: string) => {
    setSelectedLocationCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const reset = () => {
    setForm(emptyForm());
    setError(null);
    setSaveMode("save");
    if (locations.length > 0) {
      setSelectedLocationCodes(locations.map((loc) => loc.code));
      setLocationDetails(
        locations.map((loc) => ({
          locationCode: loc.code,
          locationName: loc.name,
          rack: "",
          row: "",
          position: "",
          quantity: "",
        })),
      );
    }
  };

  const mutation = useAppMutation({
    mutationFn: async (mode: ProductSaveMode) => {
      if (!form.name.trim()) throw new Error("Product name is required");
      if (!form.unit.trim()) throw new Error("Unit is required");

      const costPrice = Number(form.purchaseExcTax || form.sellingExcTax || 0);
      const sellPrice = Number(form.sellingExcTax || form.purchaseExcTax || 0);
      if (!Number.isFinite(costPrice) || costPrice < 0) {
        throw new Error("Enter a valid purchase / selling price");
      }

      const activeLocations = locationDetails.filter((row) =>
        selectedLocationCodes.includes(row.locationCode),
      );

      let locationStock: ItemLocationStockInput[] | undefined;
      if (activeLocations.length > 0) {
        locationStock = activeLocations.map((row) => {
          const qty =
            mode === "saveOpeningStock" ? Number(row.quantity) || 0 : 0;
          return {
            locationCode: row.locationCode,
            binLocation: encodeBin(row.rack, row.row, row.position),
            quantity: Number.isFinite(qty) ? qty : 0,
          };
        });
      }

      const openingQty = (() => {
        if (locationStock) return undefined;
        if (mode === "saveOpeningStock") {
          const fromAlert = Number(form.alertQuantity);
          return Number.isFinite(fromAlert) ? fromAlert : 0;
        }
        return 0;
      })();

      const sku =
        form.sku.trim() ||
        `PRD-${Date.now().toString(36).toUpperCase()}`;

      const payload = {
        sku,
        name: form.name.trim(),
        category: form.category.trim() || undefined,
        subCategory: form.subCategory.trim() || undefined,
        description: form.description.trim() || undefined,
        barcodeType: form.barcodeType || undefined,
        unit: form.unit.trim() || undefined,
        weight: form.weight.trim() || undefined,
        carModel: form.carModel.trim() || undefined,
        enableImei: form.enableImei,
        preparationMinutes: form.preparationMinutes
          ? Number(form.preparationMinutes)
          : undefined,
        quantity: locationStock ? undefined : openingQty,
        costPrice,
        sellPrice: Number.isFinite(sellPrice) ? sellPrice : costPrice,
        reorderPoint: form.manageStock
          ? Number(form.alertQuantity) || undefined
          : undefined,
        locationCode: activeLocations[0]?.locationCode,
        locationStock,
        brandName: form.brand.trim() || undefined,
        availableForRetail: retailMode ? true : !form.notForSelling,
      };

      if (editFrom) {
        return updateItem(editFrom.id, payload);
      }

      return createItem(tenantId, payload);
    },
    successMessage: editFrom ? "Product updated" : "Product created",
    onSuccess: async (item) => {
      await queryClient.invalidateQueries({ queryKey: ["items"] });
      await queryClient.invalidateQueries({ queryKey: ["catalog"] });
      await queryClient.invalidateQueries({ queryKey: ["catalog-meta"] });
      const mode = saveMode;
      if (mode === "saveAnother" && !editFrom) {
        reset();
      }
      onSuccess?.(item, mode);
    },
    onError: (err: Error) => setError(err.message),
  });

  const submit = (mode: ProductSaveMode) => {
    setSaveMode(mode);
    setError(null);
    mutation.mutate(mode);
  };

  const shellClass =
    variant === "page" ? "space-y-4" : "flex-1 space-y-4 overflow-y-auto px-1 pb-2";

  return (
    <div className={shellClass} aria-busy={mutation.isPending || undefined}>
      {mutation.isPending ? (
        <p className="rounded-md border border-border bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-muted">
          Saving product…
        </p>
      ) : null}

      <section
        className={cn(
          "space-y-3",
          isHq6
            ? "hq6-form-card"
            : "rounded-lg border border-border bg-card p-4",
        )}
      >
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <Input
            label="Product Name *"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            placeholder="Product Name"
          />
          <Input
            label="SKU"
            value={form.sku}
            onChange={(e) => setField("sku", e.target.value)}
            placeholder="SKU"
          />
          <Select
            label="Barcode Type *"
            value={form.barcodeType}
            onChange={(e) => setField("barcodeType", e.target.value)}
            options={[
              { value: "C128", label: "Code 128 (C128)" },
              { value: "C39", label: "Code 39 (C39)" },
              { value: "EAN13", label: "EAN-13" },
            ]}
          />
          <Select
            label="Unit *"
            value={form.unit}
            onChange={(e) => setField("unit", e.target.value)}
            options={unitOptions}
          />
          <Select
            label="Related Sub Units"
            value={form.relatedSubUnit}
            onChange={(e) => setField("relatedSubUnit", e.target.value)}
            options={[
              { value: "", label: "Please Select" },
              ...unitOptions.filter((row) => row.value !== form.unit),
            ]}
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
            placeholder="Please Select"
          />
          {locations.length > 0 ? (
            <div className="md:col-span-2 lg:col-span-3">
              <p className="mb-1 text-xs font-medium text-muted">
                Business Locations
              </p>
              <div className="flex flex-wrap gap-3 rounded-lg border border-border px-3 py-2">
                {locations.map((loc) => (
                  <label
                    key={loc.code}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <input
                      type="checkbox"
                      checked={selectedLocationCodes.includes(loc.code)}
                      onChange={() => toggleLocation(loc.code)}
                    />
                    {loc.name} ({loc.code})
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={form.manageStock}
            onChange={(e) => setField("manageStock", e.target.checked)}
          />
          Manage Stock?
        </label>
        <p className="text-xs text-muted">
          Enable stock management at product level.
        </p>
        {form.manageStock ? (
          <div className="max-w-xs">
            <Input
              label="Alert quantity"
              type="number"
              min="0"
              value={form.alertQuantity}
              onChange={(e) => setField("alertQuantity", e.target.value)}
            />
          </div>
        ) : null}

        <label className="block text-sm">
          <span className="mb-1 block text-muted">Product Description</span>
          <textarea
            value={form.description}
            onChange={(e) => setField("description", e.target.value)}
            rows={4}
            className="w-full rounded-lg border border-border px-3 py-2 text-sm"
          />
        </label>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-dashed border-border p-3 text-sm">
            <p className="font-medium text-foreground">Product image</p>
            <p className="mt-1 text-xs text-muted">
              Browse… — Max 5MB, aspect ratio 1:1 (upload not wired yet)
            </p>
          </div>
          <div className="rounded-lg border border-dashed border-border p-3 text-sm">
            <p className="font-medium text-foreground">Product brochure</p>
            <p className="mt-1 text-xs text-muted">
              Choose File — pdf, csv, zip, doc, images (upload not wired yet)
            </p>
          </div>
        </div>
      </section>

      <section
        className={cn(
          "space-y-3",
          isHq6
            ? "hq6-form-card"
            : "rounded-lg border border-border bg-card p-4",
        )}
      >
        <div
          className={cn(
            "flex flex-wrap",
            isHq6 ? "gap-x-10 gap-y-3" : "gap-4",
          )}
        >
          <label
            className={cn(
              "flex items-start gap-2 text-sm text-foreground",
              isHq6 && "hq6-product-check",
            )}
          >
            <input
              type="checkbox"
              checked={form.enableImei}
              onChange={(e) => setField("enableImei", e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Enable Product description, IMEI or Serial Number
              {isHq6 ? (
                <Info className="hq6-product-info-icon mt-0.5" aria-hidden />
              ) : null}
            </span>
          </label>
          <label
            className={cn(
              "flex items-center gap-2 text-sm text-foreground",
              isHq6 && "hq6-product-check",
            )}
          >
            <input
              type="checkbox"
              checked={form.notForSelling}
              onChange={(e) => setField("notForSelling", e.target.checked)}
            />
            <span className="inline-flex items-center gap-1.5">
              Not for selling
              {isHq6 ? (
                <Info className="hq6-product-info-icon" aria-hidden />
              ) : null}
            </span>
          </label>
        </div>

        {isHq6 ? (
          <>
            <h3 className="hq6-product-rack-title">
              Rack/Row/Position Details:
              <Info className="hq6-product-info-icon" aria-hidden />
            </h3>
            <div className="hq6-product-rack-grid">
              {locationDetails
                .filter((row) =>
                  selectedLocationCodes.includes(row.locationCode),
                )
                .map((row) => (
                  <div key={row.locationCode} className="hq6-product-rack-col">
                    <div className="hq6-product-rack-loc">
                      {row.locationName} ({row.locationCode}):
                    </div>
                    <div className="hq6-product-rack-stack">
                      <input
                        className="hq6-form-input"
                        placeholder="Rack"
                        value={row.rack}
                        onChange={(e) =>
                          updateLocationDetail(row.locationCode, {
                            rack: e.target.value,
                          })
                        }
                        aria-label={`${row.locationName} rack`}
                      />
                      <input
                        className="hq6-form-input"
                        placeholder="Row"
                        value={row.row}
                        onChange={(e) =>
                          updateLocationDetail(row.locationCode, {
                            row: e.target.value,
                          })
                        }
                        aria-label={`${row.locationName} row`}
                      />
                      <input
                        className="hq6-form-input"
                        placeholder="Position"
                        value={row.position}
                        onChange={(e) =>
                          updateLocationDetail(row.locationCode, {
                            position: e.target.value,
                          })
                        }
                        aria-label={`${row.locationName} position`}
                      />
                    </div>
                  </div>
                ))}
              <label className="hq6-form-label hq6-product-rack-col">
                <span>Weight:</span>
                <input
                  className="hq6-form-input"
                  placeholder="Weight"
                  value={form.weight}
                  onChange={(e) => setField("weight", e.target.value)}
                />
              </label>
              <label className="hq6-form-label hq6-product-rack-col">
                <span>Car Model:</span>
                <input
                  className="hq6-form-input"
                  placeholder="Car Model"
                  value={form.carModel}
                  onChange={(e) => setField("carModel", e.target.value)}
                />
              </label>
              <label className="hq6-form-label hq6-product-rack-col">
                <span>
                  Service staff timer/Preparation time (In minutes):
                </span>
                <input
                  className="hq6-form-input"
                  type="number"
                  min={0}
                  placeholder="Service staff timer/Preparation time"
                  value={form.preparationMinutes}
                  onChange={(e) =>
                    setField("preparationMinutes", e.target.value)
                  }
                />
              </label>
            </div>
          </>
        ) : (
          <>
            {locationDetails
              .filter((row) =>
                selectedLocationCodes.includes(row.locationCode),
              )
              .map((row) => (
                <div
                  key={row.locationCode}
                  className="rounded-lg border border-border p-3"
                >
                  <p className="mb-2 text-sm font-medium text-foreground">
                    {row.locationName} ({row.locationCode}) — Rack / Row /
                    Position
                  </p>
                  <div className="grid gap-2 sm:grid-cols-4">
                    <Input
                      label="Rack"
                      value={row.rack}
                      onChange={(e) =>
                        updateLocationDetail(row.locationCode, {
                          rack: e.target.value,
                        })
                      }
                    />
                    <Input
                      label="Row"
                      value={row.row}
                      onChange={(e) =>
                        updateLocationDetail(row.locationCode, {
                          row: e.target.value,
                        })
                      }
                    />
                    <Input
                      label="Position"
                      value={row.position}
                      onChange={(e) =>
                        updateLocationDetail(row.locationCode, {
                          position: e.target.value,
                        })
                      }
                    />
                    <Input
                      label="Opening qty"
                      type="number"
                      min="0"
                      value={row.quantity}
                      onChange={(e) =>
                        updateLocationDetail(row.locationCode, {
                          quantity: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              ))}

            <div className="grid gap-3 md:grid-cols-3">
              <Input
                label="Weight"
                value={form.weight}
                onChange={(e) => setField("weight", e.target.value)}
              />
              <Input
                label="Car Model"
                value={form.carModel}
                onChange={(e) => setField("carModel", e.target.value)}
                placeholder="e.g. Toyota Camry 2018"
              />
              <Input
                label="Service staff timer / Preparation time (minutes)"
                type="number"
                min="0"
                value={form.preparationMinutes}
                onChange={(e) =>
                  setField("preparationMinutes", e.target.value)
                }
              />
            </div>
          </>
        )}
      </section>

      <section
        className={cn(
          "space-y-3",
          isHq6
            ? "hq6-form-card"
            : "rounded-lg border border-border bg-card p-4",
        )}
      >
        <div className="grid gap-3 md:grid-cols-3">
          <Select
            label="Applicable Tax"
            value={form.applicableTax}
            onChange={(e) => setField("applicableTax", e.target.value)}
            options={[{ value: "none", label: "None" }]}
          />
          <Select
            label="Selling Price Tax Type *"
            value={form.sellingPriceTaxType}
            onChange={(e) => setField("sellingPriceTaxType", e.target.value)}
            options={[
              { value: "exclusive", label: "Exclusive" },
              { value: "inclusive", label: "Inclusive" },
            ]}
          />
          <Select
            label="Product Type"
            value={form.productType}
            onChange={(e) => setField("productType", e.target.value)}
            options={[
              { value: "single", label: "Single" },
              { value: "variable", label: "Variable" },
              { value: "combo", label: "Combo" },
            ]}
          />
        </div>

        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="bg-emerald-600 text-left text-white">
                <th className="px-3 py-2 font-semibold" colSpan={2}>
                  Default Purchase Price
                </th>
                <th className="px-3 py-2 font-semibold">x Margin (%)</th>
                <th className="px-3 py-2 font-semibold">Default Selling Price</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-border">
                <td className="px-3 py-2">
                  <label className="mb-1 block text-xs text-muted">
                    Exc. tax *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.purchaseExcTax}
                    onChange={(e) => {
                      setField("purchaseExcTax", e.target.value);
                      applyMarginToSelling(e.target.value, form.marginPercent);
                    }}
                    className="w-full rounded border border-border px-2 py-1.5"
                  />
                </td>
                <td className="px-3 py-2">
                  <label className="mb-1 block text-xs text-muted">
                    Inc. tax *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.purchaseIncTax}
                    onChange={(e) => setField("purchaseIncTax", e.target.value)}
                    className="w-full rounded border border-border px-2 py-1.5"
                  />
                </td>
                <td className="px-3 py-2 align-bottom">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.marginPercent}
                    onChange={(e) => {
                      setField("marginPercent", e.target.value);
                      applyMarginToSelling(form.purchaseExcTax, e.target.value);
                    }}
                    className="w-full rounded border border-border px-2 py-1.5"
                  />
                </td>
                <td className="px-3 py-2">
                  <label className="mb-1 block text-xs text-muted">Exc. Tax</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.sellingExcTax}
                    onChange={(e) => setField("sellingExcTax", e.target.value)}
                    className="w-full rounded border border-border px-2 py-1.5"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {error ? <p className="text-sm text-error">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-center gap-2 pb-2">
        {onCancel ? (
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="secondary"
          className="bg-violet-700 text-white hover:bg-violet-800"
          isLoading={mutation.isPending && saveMode === "saveOpeningStock"}
          loadingText="Saving…"
          disabled={mutation.isPending}
          onClick={() => submit("saveOpeningStock")}
        >
          Save & Add Opening Stock
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="bg-pink-600 text-white hover:bg-pink-700"
          isLoading={mutation.isPending && saveMode === "saveAnother"}
          loadingText="Saving…"
          disabled={mutation.isPending}
          onClick={() => submit("saveAnother")}
        >
          Save And Add Another
        </Button>
        <Button
          size="sm"
          isLoading={mutation.isPending && saveMode === "save"}
          loadingText="Saving…"
          disabled={mutation.isPending}
          onClick={() => submit("save")}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
