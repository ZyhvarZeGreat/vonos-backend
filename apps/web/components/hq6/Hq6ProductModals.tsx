"use client";

import { useEffect, useMemo, useState } from "react";
import { ImageIcon, Printer } from "lucide-react";
import type { Item, ItemLocationStock } from "@vonos/types";
import {
  PRODUCT_STOCK_BUSINESS_LOCATIONS,
  isProductStockTenant,
} from "@vonos/types";
import { Hq6Modal, Hq6Field, Hq6ModalSaveClose } from "@/components/hq6/Hq6Modal";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { formatHq6Currency } from "@/lib/utils/hq6Format";
import { parseForm } from "@/lib/validation/parseForm";
import { openingStockSchema } from "@/lib/validation/schemas";
import { toast } from "@/stores/toastStore";

function productLocationsForTenant(code: string | undefined) {
  if (isProductStockTenant(code)) return PRODUCT_STOCK_BUSINESS_LOCATIONS;
  return null;
}

function dash(value: string | number | null | undefined): string {
  if (value == null || value === "") return "--";
  return String(value);
}

function unitSuffix(unit?: string | null): string {
  if (!unit) return "";
  const lower = unit.toLowerCase();
  if (lower === "single" || lower === "sng") return "sng";
  return unit;
}

function parseBin(bin: string | null | undefined): {
  rack: string;
  row: string;
  position: string;
} {
  if (!bin?.trim()) return { rack: "", row: "", position: "" };
  const rack = bin.match(/Rack\s+([^·]+)/i)?.[1]?.trim() ?? "";
  const row = bin.match(/Row\s+([^·]+)/i)?.[1]?.trim() ?? "";
  const position =
    bin.match(/Pos(?:ition)?\s+([^·]+)/i)?.[1]?.trim() ?? "";
  if (rack || row || position) return { rack, row, position };
  return { rack: bin, row: "", position: "" };
}

function qtyLabel(qty: number, unit?: string | null): string {
  const suffix = unitSuffix(unit);
  return `${qty.toFixed(2)}${suffix}`;
}

export function Hq6ViewProductModal({
  open,
  onClose,
  item,
}: {
  open: boolean;
  onClose: () => void;
  item: Item | null;
}) {
  const { config } = useRouteTenant();
  const priceCatalogOnly = config?.archetype === "job";

  const locations =
    productLocationsForTenant(config?.code) ??
    config?.businessLocations;

  const locationName = (code: string | null | undefined) => {
    if (!code) return "--";
    const match = locations?.find((loc) => loc.code === code);
    return match?.name ?? code;
  };

  const rackRows = useMemo(() => {
    if (!item) return [];
    // HQ6 lists business locations here (rack/row/pos may be empty).
    if (locations && locations.length > 0) {
      return locations.map((loc) => {
        const stock = item.locationStock?.find((s) => s.locationCode === loc.code);
        const bin =
          stock?.binLocation ??
          (item.locationCode === loc.code ? item.binLocation : null);
        return {
          location: loc.name,
          ...parseBin(bin),
        };
      });
    }
    const stocks =
      item.locationStock?.length > 0
        ? item.locationStock
        : item.locationCode
          ? [
              {
                locationCode: item.locationCode,
                binLocation: item.binLocation,
                quantity: item.quantity,
              } satisfies ItemLocationStock,
            ]
          : [];
    return stocks.map((row) => ({
      location: locations?.find((l) => l.code === row.locationCode)?.name ?? row.locationCode,
      ...parseBin(row.binLocation),
    }));
  }, [item, locations]);

  const stockRows = useMemo(() => {
    if (!item) return [];
    const stocks =
      item.locationStock?.length > 0
        ? item.locationStock
        : [
            {
              locationCode: item.locationCode ?? "",
              binLocation: item.binLocation,
              quantity: item.quantity,
            } satisfies ItemLocationStock,
          ];
    const unitPrice = item.sellPrice ?? item.costPrice;
    return stocks.map((row) => {
      const qty = row.quantity;
      const locLabel =
        locations?.find((l) => l.code === row.locationCode)?.name ??
        row.locationCode ??
        "--";
      return {
        sku: item.sku,
        product: item.name,
        location: locLabel || "--",
        unitPrice,
        qty,
        value: qty * unitPrice,
        sold: 0,
        transferred: 0,
        adjusted: 0,
      };
    });
  }, [item, locations]);

  if (!item) {
    return (
      <Hq6Modal open={open} onClose={onClose} title="View Product" size="2xl">
        <p className="text-sm text-muted">No product selected.</p>
      </Hq6Modal>
    );
  }

  const currency = item.currency || "NGN";
  const purchase = item.costPrice;
  const selling = item.sellPrice ?? item.costPrice;
  const margin =
    purchase > 0 ? (((selling - purchase) / purchase) * 100).toFixed(2) : "0.00";
  const availableLocations =
    item.locationStock?.length > 0
      ? item.locationStock
          .map((row) => locationName(row.locationCode))
          .filter(Boolean)
          .join(", ")
      : locationName(item.locationCode);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Hq6Modal
      open={open}
      onClose={onClose}
      title={item.name}
      size="2xl"
      bodyClassName="hq6-product-view-body"
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="hq6-modal-btn hq6-modal-btn-print"
            onClick={handlePrint}
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
          <button
            type="button"
            className="hq6-modal-btn hq6-modal-btn-close"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      }
    >
      <div className="hq6-product-view-print">
        <div className="hq6-product-view-meta">
          <div className="hq6-product-view-meta-col">
            <div>
              <b>SKU:</b> {item.sku}
            </div>
            <div>
              <b>Brand: </b>
              {dash(item.brandName)}
            </div>
            <div>
              <b>Unit: </b>
              {unitSuffix(item.unit) || dash(item.unit)}
            </div>
            <div>
              <b>Barcode Type: </b>
              {dash(item.barcodeType ?? "C128")}
            </div>
            <div>
              <strong>Available in locations:</strong>{" "}
              {availableLocations || "--"}
            </div>
          </div>

          <div className="hq6-product-view-meta-col">
            <div>
              <b>Category: </b>
              {dash(item.category)}
            </div>
            <div>
              <b>Sub category: </b>
              {dash(item.subCategory)}
            </div>
            <div>
              <b>Manage Stock?: </b>
              {priceCatalogOnly ? "No" : "Yes"}
            </div>
            {!priceCatalogOnly ? (
              <div>
                <b>Alert quantity: </b>
                {item.reorderPoint != null ? String(item.reorderPoint) : "--"}
              </div>
            ) : null}
          </div>

          <div className="hq6-product-view-meta-col">
            <div>
              <b>Expires in: </b>Not Applicable
            </div>
            <div>
              <b>Applicable Tax: </b>None
            </div>
            <div>
              <b>Selling Price Tax Type: </b>Exclusive
            </div>
            <div>
              <b>Product Type: </b>Single
            </div>
          </div>

          <div className="hq6-product-view-thumb" aria-hidden>
            <ImageIcon className="h-10 w-10" strokeWidth={1.25} />
          </div>
        </div>

        <h4 className="hq6-product-view-section-title">
          Rack/Row/Position Details:
        </h4>
        <div className="hq6-product-view-table-wrap">
          <table className="hq6-product-view-table">
            <thead>
              <tr>
                <th>Location</th>
                <th>Rack</th>
                <th>Row</th>
                <th>Position</th>
              </tr>
            </thead>
            <tbody>
              {rackRows.length === 0 ? (
                <tr>
                  <td colSpan={4}>--</td>
                </tr>
              ) : (
                rackRows.map((row, idx) => (
                  <tr key={`${row.location}-${idx}`}>
                    <td>{row.location}</td>
                    <td>{row.rack}</td>
                    <td>{row.row}</td>
                    <td>{row.position}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="hq6-product-view-table-wrap">
          <table className="hq6-product-view-table">
            <thead>
              <tr>
                <th>Default Purchase Price (Exc. tax)</th>
                <th>Default Purchase Price (Inc. tax)</th>
                <th>x Margin(%)</th>
                <th>Default Selling Price (Exc. tax)</th>
                <th>Default Selling Price (Inc. tax)</th>
                <th>Variation Images</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{formatHq6Currency(purchase, currency)}</td>
                <td>{formatHq6Currency(purchase, currency)}</td>
                <td>{margin}</td>
                <td>{formatHq6Currency(selling, currency)}</td>
                <td>{formatHq6Currency(selling, currency)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        {!priceCatalogOnly ? (
          <>
            <div className="hq6-product-view-section-title">
              <strong>Product Stock Details</strong>
            </div>
            <div className="hq6-product-view-table-wrap">
              <table className="hq6-product-view-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product</th>
                    <th>Location</th>
                    <th>Unit Price</th>
                    <th>Current stock</th>
                    <th>Current Stock Value</th>
                    <th>Total unit sold</th>
                    <th>Total Unit Transfered</th>
                    <th>Total Unit Adjusted</th>
                  </tr>
                </thead>
                <tbody>
                  {stockRows.map((row, idx) => (
                    <tr key={`${row.location}-${idx}`}>
                      <td>{row.sku}</td>
                      <td>{row.product}</td>
                      <td>{row.location}</td>
                      <td>{formatHq6Currency(row.unitPrice, currency)}</td>
                      <td>{qtyLabel(row.qty, item.unit)}</td>
                      <td>{formatHq6Currency(row.value, currency)}</td>
                      <td>{qtyLabel(row.sold, item.unit)}</td>
                      <td>{qtyLabel(row.transferred, item.unit)}</td>
                      <td>{qtyLabel(row.adjusted, item.unit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </div>
    </Hq6Modal>
  );
}

export function Hq6OpeningStockModal({
  open,
  onClose,
  item,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  item: Item | null;
  onSave?: (qty: number, locationCode: string) => Promise<void>;
}) {
  const { config } = useRouteTenant();
  const stockLocations = useMemo(
    () =>
      productLocationsForTenant(config?.code) ??
      config?.businessLocations ??
      [],
    [config?.code, config?.businessLocations],
  );
  const [qty, setQty] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && item) {
      setQty(String(item.quantity ?? 0));
      setUnitCost(String(item.costPrice ?? 0));
      setDate(new Date().toISOString().slice(0, 10));
      setNote("");
      setLocation(item.locationCode ?? stockLocations[0]?.code ?? "");
    }
  }, [open, item, stockLocations]);

  const qtyNum = Number(qty) || 0;
  const costNum = Number(unitCost) || 0;
  const subtotal = qtyNum * costNum;
  const locationLabel =
    stockLocations.find((l) => l.code === location)?.name ?? location;

  return (
    <Hq6Modal
      open={open}
      onClose={onClose}
      title="Add Opening Stock"
      size="xl"
      footer={
        <Hq6ModalSaveClose
          onClose={onClose}
          saving={saving}
          onSave={() => {
            void (async () => {
              const valid = parseForm(openingStockSchema, { quantity: qty });
              if (!valid) return;
              const n = Number(valid.quantity);
              setSaving(true);
              try {
                await onSave?.(n, location);
                toast.success("Opening stock updated");
                onClose();
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "Failed to save stock",
                );
              } finally {
                setSaving(false);
              }
            })();
          }}
        />
      }
    >
      {!item ? (
        <p className="text-sm text-muted">No product selected.</p>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-[#6b7280]">
            Location:{" "}
            <span className="font-semibold text-[#111827]">
              {locationLabel} ({location})
            </span>
          </div>

          {/* Location selector */}
          {stockLocations.length > 1 && (
            <Hq6Field label="Business Location">
              <select
                className="hq6-modal-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                {stockLocations.map((loc) => (
                  <option key={loc.code} value={loc.code}>
                    {loc.name} ({loc.code})
                  </option>
                ))}
              </select>
            </Hq6Field>
          )}

          {/* UPOS-style green header table */}
          <div className="overflow-x-auto rounded border border-[#d1d5db]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#28a745] text-white">
                  <th className="px-3 py-2 text-left font-semibold">Product Name</th>
                  <th className="px-3 py-2 text-center font-semibold">Quantity Remaining</th>
                  <th className="px-3 py-2 text-center font-semibold">Unit Cost (Before Tax)</th>
                  <th className="px-3 py-2 text-center font-semibold">Subtotal (Before Tax)</th>
                  <th className="px-3 py-2 text-center font-semibold">Date</th>
                  <th className="px-3 py-2 text-center font-semibold">Note</th>
                  <th className="px-3 py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[#e5e7eb]">
                  <td className="px-3 py-2 font-medium text-[#111827]">{item.name}</td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="hq6-modal-input w-24 text-center mx-auto block"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="hq6-modal-input w-28 text-right"
                        value={unitCost}
                        onChange={(e) => setUnitCost(e.target.value)}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center tabular-nums">
                    {subtotal.toFixed(2)}
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      className="hq6-modal-input w-36 mx-auto block"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <textarea
                      className="hq6-modal-input w-full"
                      rows={1}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#6c757d] text-white text-xs cursor-default">+</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="text-right text-sm font-semibold text-[#111827]">
            Total Amount (Exc. Tax): {subtotal.toFixed(2)}
          </div>
        </div>
      )}
    </Hq6Modal>
  );
}

export function Hq6AddLocationModal({
  open,
  onClose,
  productCount = 0,
}: {
  open: boolean;
  onClose: () => void;
  productCount?: number;
}) {
  const [location, setLocation] = useState("");
  const [mode, setMode] = useState<"add" | "remove">("add");

  useEffect(() => {
    if (open) {
      setLocation("");
      setMode("add");
    }
  }, [open]);

  return (
    <Hq6Modal
      open={open}
      onClose={onClose}
      title="Add / Remove Location"
      size="md"
      footer={
        <Hq6ModalSaveClose
          onClose={onClose}
          onSave={() => {
            if (!location.trim()) {
              toast.error("Select a location");
              return;
            }
            toast.success(
              mode === "add"
                ? `Location added to ${productCount || "selected"} product(s)`
                : `Location removed from ${productCount || "selected"} product(s)`,
            );
            onClose();
          }}
        />
      }
    >
      <div className="space-y-3">
        <Hq6Field label="Action">
          <select
            className="hq6-modal-input"
            value={mode}
            onChange={(e) => setMode(e.target.value as "add" | "remove")}
          >
            <option value="add">Add location to selected products</option>
            <option value="remove">Remove location from selected products</option>
          </select>
        </Hq6Field>
        <Hq6Field label="Business Location" required>
          <select
            className="hq6-modal-input"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          >
            <option value="">Select location…</option>
            {PRODUCT_STOCK_BUSINESS_LOCATIONS.map((loc) => (
              <option key={loc.code} value={loc.code}>
                {loc.code} — {loc.name}
              </option>
            ))}
          </select>
        </Hq6Field>
      </div>
    </Hq6Modal>
  );
}
