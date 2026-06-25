"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { createFlowSuccessMessage } from "@/lib/utils/createFlowToasts";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Modal, ModalFooter, ModalHeader } from "@/components/atoms/Modal";
import { Select } from "@/components/atoms/Select";
import { createItem } from "@/lib/api/items";
import { createJob } from "@/lib/api/jobs";
import { createSale } from "@/lib/api/sales";
import { createStockMovement } from "@/lib/api/stockMovements";
import { createSupplier } from "@/lib/api/suppliers";
import { createAppointment } from "@/lib/api/appointments";
import { getItems } from "@/lib/api/items";
import { useTenantId, useRouteTenant } from "@/lib/hooks/useRouteTenant";
import {
  assertBusinessLocationSelected,
  useBusinessLocationOptions,
} from "@/lib/hooks/useBusinessLocationOptions";
import {
  isItemFlow,
  movementTypeForFlow,
  type CreateFlowKey,
} from "@/lib/registries/createFlows";
import { useUiStore } from "@/stores/uiStore";

function resetOnClose() {
  return {
    sku: "",
    name: "",
    category: "",
    quantity: "0",
    costPrice: "",
    binLocation: "",
    locationCode: "",
    reference: "",
    notes: "",
    itemId: "",
    lineQuantity: "1",
    description: "",
    customerName: "",
    hasQuote: false,
    quoteAmount: "",
    dueDate: "",
    unitPrice: "",
    contactName: "",
    email: "",
    phone: "",
    address: "",
    stylistName: "",
    serviceName: "",
    servicePrice: "",
    startTime: "",
    endTime: "",
  };
}

interface MovementLineDraft {
  itemId: string;
  quantity: string;
  unitCost: string;
}

function defaultMovementLines(): MovementLineDraft[] {
  return [{ itemId: "", quantity: "1", unitCost: "" }];
}

export function CreateRecordModal() {
  const activeModal = useUiStore((state) => state.activeModal);
  const createFlow = useUiStore((state) => state.createFlow);
  const createCopy = useUiStore((state) => state.createCopy);
  const closeModal = useUiStore((state) => state.closeModal);
  const tenantId = useTenantId();
  const { config: tenantConfig } = useRouteTenant();
  const { options: businessLocationOptions, required: locationRequired } =
    useBusinessLocationOptions(tenantConfig);
  const queryClient = useQueryClient();
  const open = activeModal === "create" && createFlow !== null;

  const [form, setForm] = useState(resetOnClose);
  const [movementLines, setMovementLines] = useState(defaultMovementLines);
  const [error, setError] = useState<string | null>(null);

  const resetMovementLines = useCallback(() => {
    setMovementLines(defaultMovementLines());
  }, []);

  useEffect(() => {
    if (!open || !locationRequired) return;
    const locations = tenantConfig?.businessLocations ?? [];
    if (locations.length === 1 && !form.locationCode) {
      setForm((prev) => ({ ...prev, locationCode: locations[0]!.code }));
    }
  }, [form.locationCode, locationRequired, open, tenantConfig?.businessLocations]);

  const movementType =
    createFlow !== null ? movementTypeForFlow(createFlow) : null;

  const { data: items = [] } = useQuery({
    queryKey: ["items", tenantId],
    queryFn: () => getItems(tenantId!),
    enabled:
      Boolean(tenantId) &&
      open &&
      (movementType !== null || createFlow === "sale"),
  });

  const categoryOptions = useMemo(() => {
    const fromConfig = tenantConfig?.itemCategories ?? [];
    const fromItems = [...new Set(items.map((item) => item.category).filter(Boolean))] as string[];
    const merged = [...new Set([...fromConfig, ...fromItems])].sort();
    return [{ value: "", label: "Select category…" }, ...merged.map((c) => ({ value: c, label: c }))];
  }, [items, tenantConfig?.itemCategories]);

  const storageOptions = useMemo(() => {
    const fromConfig = tenantConfig?.storageLocations ?? [];
    const fromItems = [...new Set(items.map((item) => item.binLocation).filter(Boolean))] as string[];
    const merged = [...new Set([...fromConfig, ...fromItems])].sort();
    return [{ value: "", label: "Select bin…" }, ...merged.map((loc) => ({ value: loc, label: loc }))];
  }, [items, tenantConfig?.storageLocations]);

  const saleCatalogItems = useMemo(() => {
    return items.filter((item) => {
      if (createFlow === "sale" && item.availableForRetail === false) return false;
      if (form.category && item.category !== form.category) return false;
      return true;
    });
  }, [createFlow, form.category, items]);

  const saleItemOptions = useMemo(
    () => [
      { value: "", label: "Select from catalog…" },
      ...saleCatalogItems.map((item) => ({
        value: item.id,
        label: `${item.sku} — ${item.name}${item.category ? ` (${item.category})` : ""}`,
      })),
    ],
    [saleCatalogItems],
  );

  const itemOptions = items.map((item) => ({
    value: item.id,
    label: `${item.sku} — ${item.name}`,
  }));

  const showLocationField = (tenantConfig?.businessLocations?.length ?? 0) > 0;

  const mutation = useAppMutation({
    mutationFn: async (flow: CreateFlowKey) => {
      if (!tenantId) throw new Error("No tenant selected");
      assertBusinessLocationSelected(locationRequired, form.locationCode);
      const locationCode = form.locationCode.trim() || undefined;

      if (isItemFlow(flow)) {
        const cost = Number(form.costPrice);
        if (!form.sku.trim() || !form.name.trim()) {
          throw new Error("SKU and name are required");
        }
        if (!Number.isFinite(cost) || cost < 0) {
          throw new Error("Enter a valid cost price");
        }
        return createItem(tenantId, {
          sku: form.sku.trim(),
          name: form.name.trim(),
          category: form.category.trim() || undefined,
          quantity: Number(form.quantity) || 0,
          costPrice: cost,
          binLocation: form.binLocation.trim() || undefined,
          locationCode,
          availableForRetail: flow === "menu-item",
        });
      }

      if (movementType) {
        if (!form.reference.trim()) throw new Error("Reference is required");
        const builtLines = movementLines
          .map((line) => {
            const selected = items.find((row) => row.id === line.itemId);
            if (!selected) return null;
            const qty = Number(line.quantity);
            if (!Number.isFinite(qty) || qty <= 0) return null;
            const unitCostRaw = line.unitCost.trim();
            const unitCost =
              unitCostRaw.length > 0 ? Number(unitCostRaw) : undefined;
            return {
              itemId: selected.id,
              sku: selected.sku,
              name: selected.name,
              quantity: qty,
              ...(unitCost !== undefined && Number.isFinite(unitCost)
                ? { unitCost }
                : {}),
            };
          })
          .filter((line): line is NonNullable<typeof line> => line !== null);
        if (builtLines.length === 0) {
          throw new Error("Add at least one valid line item");
        }
        return createStockMovement(tenantId, {
          type: movementType,
          reference: form.reference.trim(),
          notes: form.notes.trim() || undefined,
          locationCode,
          lines: builtLines,
        });
      }

      if (flow === "job") {
        if (!form.reference.trim() || !form.description.trim()) {
          throw new Error("Reference and description are required");
        }
        return createJob(tenantId, {
          reference: form.reference.trim(),
          description: form.description.trim(),
          customerName: form.customerName.trim() || undefined,
          locationCode,
          hasQuote: form.hasQuote,
          quoteAmount: form.hasQuote ? Number(form.quoteAmount) || undefined : undefined,
          dueDate: form.dueDate || undefined,
        });
      }

      if (flow === "sale") {
        if (!form.reference.trim() || !form.name.trim()) {
          throw new Error("Reference and item name are required");
        }
        const qty = Number(form.lineQuantity);
        const price = Number(form.unitPrice);
        if (!Number.isFinite(qty) || qty <= 0) throw new Error("Invalid quantity");
        if (!Number.isFinite(price) || price < 0) throw new Error("Invalid unit price");
        return createSale(tenantId, {
          reference: form.reference.trim(),
          customerName: form.customerName.trim() || undefined,
          locationCode,
          lines: [
            {
              sku: form.sku.trim() || "SKU",
              name: form.name.trim(),
              quantity: qty,
              unitPrice: price,
            },
          ],
        });
      }

      if (flow === "supplier") {
        if (!form.name.trim()) throw new Error("Supplier name is required");
        return createSupplier({
          name: form.name.trim(),
          contactName: form.contactName.trim() || undefined,
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          address: form.address.trim() || undefined,
          locationCode,
        });
      }

      if (flow === "appointment") {
        if (!form.stylistName.trim() || !form.serviceName.trim()) {
          throw new Error("Stylist and service are required");
        }
        if (!form.startTime || !form.endTime) {
          throw new Error("Start and end time are required");
        }
        return createAppointment(tenantId, {
          customerName: form.customerName.trim() || undefined,
          stylistName: form.stylistName.trim(),
          serviceName: form.serviceName.trim(),
          servicePrice: form.servicePrice ? Number(form.servicePrice) : undefined,
          startTime: new Date(form.startTime).toISOString(),
          endTime: new Date(form.endTime).toISOString(),
          locationCode,
        });
      }

      throw new Error("Unsupported create flow");
    },
    successMessage: (_data, flow) => createFlowSuccessMessage(flow),
    onSuccess: async (_data, flow) => {
      if (isItemFlow(flow)) {
        await queryClient.invalidateQueries({ queryKey: ["items"] });
      } else if (movementTypeForFlow(flow)) {
        await queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      } else if (flow === "job") {
        await queryClient.invalidateQueries({ queryKey: ["jobs"] });
      } else if (flow === "sale") {
        await queryClient.invalidateQueries({ queryKey: ["sales"] });
        await queryClient.invalidateQueries({ queryKey: ["orders"] });
      } else if (flow === "supplier") {
        await queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      } else if (flow === "appointment") {
        await queryClient.invalidateQueries({ queryKey: ["appointments"] });
      }
      setForm(resetOnClose());
      resetMovementLines();
      setError(null);
      closeModal();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleClose = () => {
    setForm(resetOnClose());
    resetMovementLines();
    setError(null);
    closeModal();
  };

  const setField = (key: keyof ReturnType<typeof resetOnClose>, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (!createFlow) return null;

  return (
    <Modal open={open} onClose={handleClose}>
      <ModalHeader
        title={createCopy.title}
        subtitle={createCopy.subtitle}
        onClose={handleClose}
      />
      <div className="space-y-3.5 px-4 pb-2">
        {showLocationField ? (
          <Select
            label="Business location"
            value={form.locationCode}
            onChange={(e) => setField("locationCode", e.target.value)}
            options={businessLocationOptions}
          />
        ) : null}

        {isItemFlow(createFlow) ? (
          <>
            <Input label="SKU" value={form.sku} onChange={(e) => setField("sku", e.target.value)} />
            <Input label="Name" value={form.name} onChange={(e) => setField("name", e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Quantity"
                type="number"
                value={form.quantity}
                onChange={(e) => setField("quantity", e.target.value)}
              />
              <Input
                label="Cost price"
                type="number"
                value={form.costPrice}
                onChange={(e) => setField("costPrice", e.target.value)}
              />
            </div>
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => setField("category", e.target.value)}
              options={categoryOptions}
            />
            <Select
              label="Bin location"
              value={form.binLocation}
              onChange={(e) => setField("binLocation", e.target.value)}
              options={storageOptions}
            />
          </>
        ) : null}

        {movementType ? (
          <>
            <Input
              label="Reference"
              value={form.reference}
              onChange={(e) => setField("reference", e.target.value)}
            />
            <Input
              label={movementType === "inbound" ? "Supplier" : "Destination / notes"}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
            />
            <div className="space-y-3 rounded-lg border border-border p-3">
              <p className="text-sm font-medium text-foreground">Line items</p>
              {movementLines.map((line, index) => (
                <div key={index} className="grid gap-2 sm:grid-cols-[1fr_100px_100px_auto] sm:items-end">
                  <Select
                    label={index === 0 ? "Item" : undefined}
                    value={line.itemId}
                    onChange={(e) =>
                      setMovementLines((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, itemId: e.target.value } : row,
                        ),
                      )
                    }
                    options={[{ value: "", label: "Select item…" }, ...itemOptions]}
                  />
                  <Input
                    label={index === 0 ? "Qty" : undefined}
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) =>
                      setMovementLines((prev) =>
                        prev.map((row, i) =>
                          i === index ? { ...row, quantity: e.target.value } : row,
                        ),
                      )
                    }
                  />
                  {movementType === "inbound" ? (
                    <Input
                      label={index === 0 ? "Unit cost" : undefined}
                      type="number"
                      min="0"
                      value={line.unitCost}
                      onChange={(e) =>
                        setMovementLines((prev) =>
                          prev.map((row, i) =>
                            i === index ? { ...row, unitCost: e.target.value } : row,
                          ),
                        )
                      }
                    />
                  ) : (
                    <div className="hidden sm:block" />
                  )}
                  {movementLines.length > 1 ? (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setMovementLines((prev) => prev.filter((_, i) => i !== index))
                      }
                    >
                      Remove
                    </Button>
                  ) : (
                    <div className="hidden sm:block" />
                  )}
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setMovementLines((prev) => [
                    ...prev,
                    { itemId: "", quantity: "1", unitCost: "" },
                  ])
                }
              >
                Add line
              </Button>
            </div>
          </>
        ) : null}

        {createFlow === "job" ? (
          <>
            <Input
              label="Reference"
              value={form.reference}
              onChange={(e) => setField("reference", e.target.value)}
            />
            <Input
              label="Description"
              value={form.description}
              onChange={(e) => setField("description", e.target.value)}
            />
            <Input
              label="Customer"
              value={form.customerName}
              onChange={(e) => setField("customerName", e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={form.hasQuote}
                onChange={(e) => setField("hasQuote", e.target.checked)}
              />
              Requires quote
            </label>
            {form.hasQuote ? (
              <Input
                label="Quote amount"
                type="number"
                value={form.quoteAmount}
                onChange={(e) => setField("quoteAmount", e.target.value)}
              />
            ) : null}
            <Input
              label="Due date"
              type="date"
              value={form.dueDate}
              onChange={(e) => setField("dueDate", e.target.value)}
            />
          </>
        ) : null}

        {createFlow === "sale" ? (
          <>
            <Input
              label="Reference"
              value={form.reference}
              onChange={(e) => setField("reference", e.target.value)}
            />
            <Input
              label="Customer"
              value={form.customerName}
              onChange={(e) => setField("customerName", e.target.value)}
            />
            <Select
              label="Category"
              value={form.category}
              onChange={(e) => {
                setField("category", e.target.value);
                setField("itemId", "");
              }}
              options={categoryOptions}
            />
            <Select
              label="Catalog item"
              value={form.itemId}
              onChange={(e) => {
                const id = e.target.value;
                setField("itemId", id);
                const picked = items.find((row) => row.id === id);
                if (picked) {
                  setField("sku", picked.sku);
                  setField("name", picked.name);
                  setField("category", picked.category ?? form.category);
                  setField("unitPrice", String(picked.costPrice));
                }
              }}
              options={saleItemOptions}
            />
            <Input
              label="Item name"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Quantity"
                type="number"
                value={form.lineQuantity}
                onChange={(e) => setField("lineQuantity", e.target.value)}
              />
              <Input
                label="Unit price"
                type="number"
                value={form.unitPrice}
                onChange={(e) => setField("unitPrice", e.target.value)}
              />
            </div>
          </>
        ) : null}

        {createFlow === "supplier" ? (
          <>
            <Input label="Name" value={form.name} onChange={(e) => setField("name", e.target.value)} />
            <Input
              label="Contact name"
              value={form.contactName}
              onChange={(e) => setField("contactName", e.target.value)}
            />
            <Input label="Email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
            <Input label="Phone" value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
            <Input
              label="Address"
              value={form.address}
              onChange={(e) => setField("address", e.target.value)}
            />
          </>
        ) : null}

        {createFlow === "appointment" ? (
          <>
            <Input
              label="Customer"
              value={form.customerName}
              onChange={(e) => setField("customerName", e.target.value)}
            />
            <Input
              label="Stylist"
              value={form.stylistName}
              onChange={(e) => setField("stylistName", e.target.value)}
            />
            <Input
              label="Service"
              value={form.serviceName}
              onChange={(e) => setField("serviceName", e.target.value)}
            />
            <Input
              label="Price"
              type="number"
              value={form.servicePrice}
              onChange={(e) => setField("servicePrice", e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Start"
                type="datetime-local"
                value={form.startTime}
                onChange={(e) => setField("startTime", e.target.value)}
              />
              <Input
                label="End"
                type="datetime-local"
                value={form.endTime}
                onChange={(e) => setField("endTime", e.target.value)}
              />
            </div>
          </>
        ) : null}

        {error ? <p className="text-sm text-error">{error}</p> : null}
      </div>
      <ModalFooter>
        <Button variant="secondary" size="sm" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(createFlow)}
        >
          {mutation.isPending ? "Saving…" : createCopy.submitLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
