"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Item, ProductUnit, TenantConfig } from "@vonos/types";
import {
  PRODUCT_STOCK_BUSINESS_LOCATIONS,
  isPriceCatalogOnlyTenant,
  productHomeLocationsForTenant,
} from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { ProductImageDropzone } from "@/components/molecules/ProductImageDropzone";
import { Hq6AddProductFormBody } from "@/components/organisms/Hq6AddProductFormBody";
import { createItem, updateItem } from "@/lib/api/items";
import { uploadProductImage } from "@/lib/api/media";
import { getAllCatalogMeta } from "@/lib/api/catalogMeta";
import { toast } from "@/stores/toastStore";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import {
  optimisticTempId,
  patchEntityInQueries,
  prependEntityInQueries,
} from "@/lib/query/optimistic";
import { locationsForTenantConfig } from "@/lib/hooks/useBusinessLocationOptions";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { parseForm } from "@/lib/validation/parseForm";
import { productFormSchema } from "@/lib/validation/schemas";
import { hq6TaxSelectOptions } from "@/lib/utils/hq6TaxOptions";
import {
  buildProductSavePayload,
  type ProductSaveMode,
} from "@/lib/utils/productSavePayload";
import {
  emptyProductForm,
  itemHasForeignLocation,
  locationDetailsFromItem,
  productFormFromItem,
  productImageFileName,
  selectedLocationCodesFromItem,
} from "@/lib/utils/productFormFromItem";
import {
  patchFromMarginPercent,
  patchFromPurchaseExcTax,
  patchFromSellingPrice,
} from "@/lib/utils/productPriceForm";
import type { ProductCategory, Brand } from "@vonos/types";

export type { ProductSaveMode };

type LocationDetail = {
  locationCode: string;
  locationName: string;
  rack: string;
  row: string;
  position: string;
  quantity: string;
};

function emptyForm(manageStock = true, zeroPrices = false) {
  return emptyProductForm(manageStock, { zeroPrices });
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
  const isHq6 = useIsVaHq6();
  const homeLocations = productHomeLocationsForTenant(tenantConfig?.code);
  const presetLocations = locationsForTenantConfig(tenantConfig);
  const locations =
    homeLocations.length > 0
      ? homeLocations
      : presetLocations.length > 0
        ? presetLocations
        : PRODUCT_STOCK_BUSINESS_LOCATIONS;
  /** Job-centric (VA/VP): catalog only — no stock; prices default to 0 on create. */
  const priceCatalogOnly = isPriceCatalogOnlyTenant(
    tenantConfig?.code,
    tenantConfig?.archetype,
  );
  const tenantCode = (tenantConfig?.code ?? "").trim().toUpperCase();
  /** Applicable Tax on VA/VP (and other non-VISP); removed from VISP product edit. */
  const showApplicableTax = tenantCode !== "VISP";

  const [form, setForm] = useState(() =>
    emptyForm(!priceCatalogOnly, priceCatalogOnly),
  );
  const [locationDetails, setLocationDetails] = useState<LocationDetail[]>([]);
  const [selectedLocationCodes, setSelectedLocationCodes] = useState<string[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [saveMode, setSaveMode] = useState<ProductSaveMode>("save");
  const [imageName, setImageName] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(
    null,
  );
  const imageUploadGen = useRef(0);
  const [brochureName, setBrochureName] = useState("");
  const sourceItem = editFrom ?? duplicateFrom;

  useEffect(() => {
    if (!editFrom && !duplicateFrom) {
      setForm((prev) =>
        prev.manageStock === !priceCatalogOnly
          ? prev
          : { ...prev, manageStock: !priceCatalogOnly },
      );
    }
  }, [priceCatalogOnly, editFrom, duplicateFrom]);

  useEffect(() => {
    const source = editFrom ?? duplicateFrom;
    if (!source) return;
    setForm(
      productFormFromItem(source, {
        isDuplicate: Boolean(duplicateFrom) && !editFrom,
        priceCatalogOnly,
      }),
    );
    setImageName(productImageFileName(source.imageUrl));
    setImageUrl(source.imageUrl?.trim() || null);
    setImagePreviewUrl(source.imageUrl?.trim() || null);
  }, [duplicateFrom, editFrom, priceCatalogOnly]);

  const handleImageChange = async (file: File | null) => {
    if (!file) {
      imageUploadGen.current += 1;
      setImageUploading(false);
      setImageUploadProgress(null);
      setImageUrl(null);
      setImagePreviewUrl(null);
      setImageName("");
      return;
    }
    // Hard cap before compress (phone originals can be 20MB+); upload path
    // compresses further and enforces 12MB.
    if (file.size > 40 * 1024 * 1024) {
      toast.error("Image is too large — pick a file under 40MB");
      return;
    }
    const uploadGen = ++imageUploadGen.current;
    const previousUrl = imageUrl;
    const localPreview = URL.createObjectURL(file);
    setImagePreviewUrl(localPreview);
    setImageName(file.name);
    setImageUploading(true);
    setImageUploadProgress(null);
    try {
      const uploaded = await uploadProductImage(file, tenantId, {
        onProgress: (pct) => {
          if (imageUploadGen.current === uploadGen) {
            setImageUploadProgress(pct);
          }
        },
      });
      if (imageUploadGen.current !== uploadGen) return;
      setImageUrl(uploaded.url);
      setImagePreviewUrl(uploaded.url);
      setImageName(file.name);
      setImageUploadProgress(100);
      toast.success("Image uploaded");
    } catch (err) {
      if (imageUploadGen.current !== uploadGen) return;
      setImagePreviewUrl(previousUrl);
      setImageName(productImageFileName(previousUrl));
      toast.error(
        err instanceof Error ? err.message : "Image upload failed",
      );
    } finally {
      if (imageUploadGen.current === uploadGen) {
        setImageUploading(false);
        setImageUploadProgress(null);
      }
      URL.revokeObjectURL(localPreview);
    }
  };

  useEffect(() => {
    if (locations.length === 0) return;
    const source = editFrom ?? duplicateFrom;
    if (source) {
      setSelectedLocationCodes(selectedLocationCodesFromItem(source, locations));
      setLocationDetails(locationDetailsFromItem(source, locations));
      return;
    }
    // New product: default to this tenant's own home so location shows on the list.
    setSelectedLocationCodes(locations.map((loc) => loc.code));
    setLocationDetails(locationDetailsFromItem(undefined, locations));
  }, [locations, editFrom, duplicateFrom]);

  const metaStaleMs = 10 * 60_000;

  const { data: categories = [] } = useQuery({
    queryKey: ["catalog-meta", tenantId, "categories", "all"],
    queryFn: () =>
      getAllCatalogMeta(tenantId, "categories") as Promise<ProductCategory[]>,
    enabled: Boolean(tenantId),
    staleTime: metaStaleMs,
  });

  const { data: brands = [] } = useQuery({
    queryKey: ["catalog-meta", tenantId, "brands", "all"],
    queryFn: () =>
      getAllCatalogMeta(tenantId, "brands") as Promise<Brand[]>,
    enabled: Boolean(tenantId),
    staleTime: metaStaleMs,
  });

  const { data: units = [] } = useQuery({
    queryKey: ["catalog-meta", tenantId, "units", "all"],
    queryFn: () =>
      getAllCatalogMeta(tenantId, "units") as Promise<ProductUnit[]>,
    enabled: Boolean(tenantId),
    staleTime: metaStaleMs,
  });

  const categoryOptions = useMemo(() => {
    const fromMeta = categories.map((row) => row.name);
    const merged = [
      ...new Set([
        ...fromMeta,
        ...(tenantConfig?.itemCategories ?? []),
        ...(sourceItem?.category?.trim() ? [sourceItem.category.trim()] : []),
      ]),
    ].sort();
    return [
      { value: "", label: "Please Select" },
      ...merged.map((c) => ({ value: c, label: c })),
    ];
  }, [categories, sourceItem?.category, tenantConfig?.itemCategories]);

  const brandOptions = useMemo(() => {
    const names = [
      ...new Set(
        [
          ...brands.map((row) => row.name?.trim()),
          sourceItem?.brandName?.trim(),
        ].filter(Boolean),
      ),
    ] as string[];
    return [
      { value: "", label: "Please Select" },
      ...names.map((name) => ({ value: name, label: name })),
    ];
  }, [brands, sourceItem?.brandName]);

  const taxOptions = useMemo(
    () => hq6TaxSelectOptions(tenantId),
    [tenantId],
  );

  const unitOptions = useMemo(() => {
    const fromMeta = units.map((row) => ({
      value: row.name,
      label: row.shortName ? `${row.name} (${row.shortName})` : row.name,
    }));
    const base =
      fromMeta.length === 0
        ? [
            { value: "Single", label: "Single (sng)" },
            { value: "Piece", label: "Piece (pc)" },
          ]
        : fromMeta;
    if (form.unit && !base.some((row) => row.value === form.unit)) {
      return [{ value: form.unit, label: form.unit }, ...base];
    }
    return base;
  }, [units, form.unit]);

  const setField = (
    key: keyof ReturnType<typeof emptyForm>,
    value: string | boolean,
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  /**
   * UPOS price fields: cost / margin / sell stay independent at 0% margin
   * so a manual selling price is never overwritten by unit cost.
   */
  const setPurchaseExcTax = (next: string) => {
    setForm((prev) => patchFromPurchaseExcTax(prev, next) ?? prev);
  };

  const setSellingPrice = (next: string) => {
    setForm((prev) => patchFromSellingPrice(prev, next) ?? prev);
  };

  const setMarginPercent = (next: string) => {
    setForm((prev) => patchFromMarginPercent(prev, next) ?? prev);
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
    setForm(emptyForm(!priceCatalogOnly, priceCatalogOnly));
    setError(null);
    setSaveMode("save");
    if (locations.length > 0) {
      setSelectedLocationCodes([]);
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

      const costPrice = Number(form.purchaseExcTax || 0);
      if (!Number.isFinite(costPrice) || costPrice < 0) {
        throw new Error("Enter a valid purchase price");
      }

      const payload = buildProductSavePayload({
        form,
        mode,
        isEdit: Boolean(editFrom),
        retailMode,
        priceCatalogOnly,
        homeLocationCode: locations[0]?.code,
        rehomeForeignLocation:
          Boolean(editFrom) &&
          itemHasForeignLocation(editFrom, locations),
        selectedLocationCodes,
        locationDetails,
        ...(editFrom
          ? { imageUrl }
          : imageUrl
            ? { imageUrl }
            : {}),
      });

      if (editFrom) {
        return updateItem(editFrom.id, payload, tenantId);
      }

      return createItem(tenantId, payload);
    },
    successMessage: editFrom ? "Product updated" : "Product created",
    progressLabel: editFrom ? "Updating product" : "Saving product",
    optimistic: {
      keys: [["items"], ["catalog"], ["catalog-meta"]],
      update: (qc, mode) => {
        const now = new Date().toISOString();
        const sku =
          form.sku.trim() ||
          `PRD-${Date.now().toString(36).toUpperCase()}`;
        const costPrice = Number(form.purchaseExcTax || 0);
        const sellRaw = form.sellingExcTax.trim();
        const sellParsed = sellRaw === "" ? NaN : Number(sellRaw);
        const sellPrice = Number.isFinite(sellParsed)
          ? sellParsed
          : priceCatalogOnly && !editFrom
            ? 0
            : editFrom
              ? editFrom.sellPrice
              : null;
        const name = form.name.trim();
        if (editFrom) {
          const patch = {
            name,
            sku,
            category: form.category.trim() || null,
            subCategory: form.subCategory.trim() || null,
            description: form.description.trim() || null,
            unit: form.unit.trim() || null,
            costPrice: Number.isFinite(costPrice) ? costPrice : editFrom.costPrice,
            sellPrice,
            brandName: form.brand.trim() || null,
            availableForRetail: retailMode ? true : !form.notForSelling,
            ...(editFrom
              ? { imageUrl: imageUrl ?? null }
              : imageUrl
                ? { imageUrl }
                : {}),
            updatedAt: now,
          };
          // Products list is keyed under ["catalog", …] — patch both prefixes.
          patchEntityInQueries(qc, ["items"], editFrom.id, patch);
          patchEntityInQueries(qc, ["catalog"], editFrom.id, patch);
        } else {
          const provisional = {
            id: optimisticTempId("item"),
            tenantId,
            sku,
            name,
            category: form.category.trim() || null,
            subCategory: form.subCategory.trim() || null,
            description: form.description.trim() || null,
            barcodeType: form.barcodeType || null,
            unit: form.unit.trim() || null,
            weight: form.weight.trim() || null,
            carModel: form.carModel.trim() || null,
            enableImei: form.enableImei,
            preparationMinutes: form.preparationMinutes
              ? Number(form.preparationMinutes)
              : null,
            quantity: 0,
            binLocation: null,
            locationCode: null,
            reorderPoint: null,
            costPrice: Number.isFinite(costPrice) ? costPrice : 0,
            sellPrice,
            currency: "NGN",
            status: "in_stock",
            availableForRetail: retailMode ? true : !form.notForSelling,
            brandId: null,
            brandName: form.brand.trim() || null,
            imageUrl: imageUrl ?? null,
            locationStock: [],
            createdAt: now,
            updatedAt: now,
          } satisfies Item;
          // Products list is under ["catalog", …] for HQ6 — patch both so leave-early sees the row.
          prependEntityInQueries(qc, ["items"], provisional);
          prependEntityInQueries(qc, ["catalog"], provisional);
        }
        if (variant === "modal" && mode !== "saveAnother") {
          onCancel?.();
        }
      },
      commit: (qc, data) => {
        if (!data) return;
        if (editFrom) {
          // Replace optimistic fields with the server row in list + detail caches.
          patchEntityInQueries(qc, ["items"], data.id, data);
          patchEntityInQueries(qc, ["catalog"], data.id, data);
          qc.setQueryData(["item", "edit-page", data.id], data);
          qc.setQueryData(["item", tenantId, data.id, "catalog"], data);
          qc.setQueryData(["item", tenantId, data.id, "inventory"], data);
          return;
        }
        const entries = [
          ...qc.getQueriesData({ queryKey: ["items"] }),
          ...qc.getQueriesData({ queryKey: ["catalog"] }),
        ];
        for (const [queryKey, cached] of entries) {
          if (Array.isArray(cached)) {
            qc.setQueryData(
              queryKey,
              (cached as Item[]).filter((row) => !row.id.startsWith("item-")),
            );
          } else if (
            cached &&
            typeof cached === "object" &&
            Array.isArray((cached as { items?: Item[] }).items)
          ) {
            const list = cached as { items: Item[] };
            qc.setQueryData(queryKey, {
              ...list,
              items: list.items.filter((row) => !row.id.startsWith("item-")),
            });
          }
        }
        prependEntityInQueries(qc, ["items"], data);
        prependEntityInQueries(qc, ["catalog"], data);
      },
    },
    onSuccess: (item, mode) => {
      if (mode === "saveAnother" && !editFrom) {
        reset();
      }
      onSuccess?.(item, mode);
    },
    onError: (err: Error) => setError(err.message),
  });

  const submit = (mode: ProductSaveMode) => {
    if (imageUploading) {
      toast.error("Wait for the image upload to finish");
      return;
    }
    setSaveMode(mode);
    setError(null);
    const costPrice = Number(form.purchaseExcTax || 0);
    const valid = parseForm(
      productFormSchema,
      {
        name: form.name,
        unit: form.unit,
        costPrice,
        sku: form.sku,
      },
      { setError },
    );
    if (!valid) return;
    mutation.mutate(mode);
  };

  const shellClass =
    variant === "page" ? "space-y-4" : "flex-1 space-y-4 overflow-y-auto px-1 pb-2";

  if (isHq6) {
    return (
      <Hq6AddProductFormBody
        form={form}
        setField={setField}
        locationDetails={locationDetails}
        selectedLocationCodes={selectedLocationCodes}
        toggleLocation={toggleLocation}
        updateLocationDetail={updateLocationDetail}
        setPurchaseExcTax={setPurchaseExcTax}
        setSellingPrice={setSellingPrice}
        setMarginPercent={setMarginPercent}
        unitOptions={unitOptions}
        brandOptions={brandOptions}
        categoryOptions={categoryOptions}
        taxOptions={taxOptions}
        locations={locations}
        error={error}
        isPending={mutation.isPending}
        saveMode={saveMode}
        isEdit={Boolean(editFrom)}
        priceCatalogOnly={priceCatalogOnly}
        showApplicableTax={showApplicableTax}
        onCancel={onCancel}
        onSubmit={submit}
        imageName={imageName}
        brochureName={brochureName}
        imagePreviewUrl={imagePreviewUrl}
        imageUploading={imageUploading}
        imageUploadProgress={imageUploadProgress}
        onImageChange={(file) => {
          void handleImageChange(file);
        }}
        onBrochureChange={setBrochureName}
      />
    );
  }

  return (
    <div className={shellClass} aria-busy={mutation.isPending || undefined}>
      {mutation.isPending ? (
        <p className="rounded-md border border-border bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-muted">
          Saving product…
        </p>
      ) : null}

      <section
        className="space-y-3 rounded-lg border border-border bg-card p-4"
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
          {priceCatalogOnly ? (
            <>
              <Input
                id="cost_price"
                label="Cost price"
                type="text"
                inputMode="decimal"
                value={form.purchaseExcTax}
                onChange={(e) => setPurchaseExcTax(e.target.value)}
                placeholder="0.00"
              />
              <Input
                id="sell_price"
                label="Selling price"
                type="text"
                inputMode="decimal"
                value={form.sellingExcTax}
                onChange={(e) => setSellingPrice(e.target.value)}
                placeholder="0.00"
              />
              {showApplicableTax ? (
                <Select
                  label="Applicable Tax"
                  value={form.applicableTax}
                  onChange={(e) => setField("applicableTax", e.target.value)}
                  options={taxOptions}
                />
              ) : null}
            </>
          ) : null}
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
          {locations.length > 0 && !priceCatalogOnly ? (
            <div className="md:col-span-2 lg:col-span-3">
              <p className="mb-1 text-xs font-medium text-muted">
                Business Locations{" "}
                <span className="font-normal">(optional)</span>
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
                    {loc.name}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {!priceCatalogOnly ? (
          <>
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
          </>
        ) : (
          <p className="text-xs text-muted">
            Product catalog only — no stock. Set prices here (default 0) or
            click a price on the list to edit later.
          </p>
        )}

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
          <ProductImageDropzone
            variant="tile"
            previewUrl={imagePreviewUrl}
            fileName={imageName}
            uploading={imageUploading}
            progress={imageUploadProgress}
            disabled={mutation.isPending}
            onFileSelect={(file) => {
              void handleImageChange(file);
            }}
          />
          <div className="rounded-lg border border-dashed border-border p-3 text-sm">
            <p className="font-medium text-foreground">Product brochure</p>
            <p className="mt-1 text-xs text-muted">
              Choose File — pdf, csv, zip, doc, images (upload not wired yet)
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap gap-4">
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.enableImei}
              onChange={(e) => setField("enableImei", e.target.checked)}
              className="mt-0.5"
            />
            <span>Enable Product description, IMEI or Serial Number</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.notForSelling}
              onChange={(e) => setField("notForSelling", e.target.checked)}
            />
            <span>Not for selling</span>
          </label>
        </div>

        {locationDetails
          .filter((row) => selectedLocationCodes.includes(row.locationCode))
          .map((row) => (
            <div
              key={row.locationCode}
              className="rounded-lg border border-border p-3"
            >
              <p className="mb-2 text-sm font-medium text-foreground">
                {row.locationName} ({row.locationCode}) — Rack / Row / Position
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
            onChange={(e) => setField("preparationMinutes", e.target.value)}
          />
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-3">
          {showApplicableTax && !priceCatalogOnly ? (
            <Select
              label="Applicable Tax"
              value={form.applicableTax}
              onChange={(e) => setField("applicableTax", e.target.value)}
              options={taxOptions}
            />
          ) : null}
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

        {!priceCatalogOnly ? (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="bg-emerald-600 text-left text-white">
                  <th className="px-3 py-2 font-semibold" colSpan={2}>
                    Default Purchase Price
                  </th>
                  <th className="px-3 py-2 font-semibold">x Margin (%)</th>
                  <th className="px-3 py-2 font-semibold">
                    Default Selling Price
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border">
                  <td className="px-3 py-2">
                    <label className="mb-1 block text-xs text-muted">
                      Exc. tax *
                    </label>
                    <input
                      id="cost_price"
                      type="text"
                      inputMode="decimal"
                      value={form.purchaseExcTax}
                      onChange={(e) => setPurchaseExcTax(e.target.value)}
                      className="w-full rounded border border-border px-2 py-1.5"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <label className="mb-1 block text-xs text-muted">
                      Inc. tax *
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.purchaseIncTax}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (next !== "" && !/^\d*\.?\d*$/.test(next)) return;
                        setField("purchaseIncTax", next);
                      }}
                      className="w-full rounded border border-border px-2 py-1.5"
                    />
                  </td>
                  <td className="px-3 py-2 align-bottom">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={form.marginPercent}
                      onChange={(e) => setMarginPercent(e.target.value)}
                      className="w-full rounded border border-border px-2 py-1.5"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <label className="mb-1 block text-xs text-muted">
                      Exc. Tax
                    </label>
                    <input
                      id="sell_price"
                      type="text"
                      inputMode="decimal"
                      value={form.sellingExcTax}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      className="w-full rounded border border-border px-2 py-1.5"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {error ? <p className="text-sm text-error">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-center gap-2 pb-2">
        {onCancel ? (
          <Button variant="secondary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        {!priceCatalogOnly ? (
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
        ) : null}
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
