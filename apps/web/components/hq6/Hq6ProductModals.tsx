"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ImageIcon, Plus, Printer, X } from "lucide-react";
import type { Item, ItemLocationStock } from "@vonos/types";
import {
  PRODUCT_STOCK_BUSINESS_LOCATIONS,
  isProductStockTenant,
  productHomeLocationsForTenant,
} from "@vonos/types";
import { Hq6Modal, Hq6Field, Hq6ModalSaveClose } from "@/components/hq6/Hq6Modal";
import { ProductThumbnail } from "@/components/atoms/ProductThumbnail";
import { GroupPeerStockTable } from "@/components/molecules/GroupPeerStockReadout";
import { isPriceCatalogOnlyTenant } from "@vonos/types";
import type { TenantConfig } from "@vonos/types";
import {
  defaultEntityLocationCode,
  locationsForTenantConfig,
} from "@/lib/hooks/useBusinessLocationOptions";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { getItemOpeningStock, getPeerStockBySkus } from "@/lib/api/items";
import { formatHq6Currency } from "@/lib/utils/hq6Format";
import { parseForm } from "@/lib/validation/parseForm";
import { openingStockSchema } from "@/lib/validation/schemas";
import { toast } from "@/stores/toastStore";

function productLocationsForTenant(code: string | undefined) {
  const home = productHomeLocationsForTenant(code);
  if (home.length > 0) return home;
  return null;
}

/** Opening stock / view: own product home, else tenant business locations (VS/VKW). */
function stockLocationsForOpening(
  code: string | undefined,
  config: TenantConfig | null | undefined,
) {
  const home = productLocationsForTenant(code);
  if (home && home.length > 0) return home;
  const fromConfig = locationsForTenantConfig(config);
  if (fromConfig.length > 0) return fromConfig;
  if (code?.trim()) {
    return [{ code: code.trim().toUpperCase(), name: config?.name ?? code }];
  }
  return [];
}

/** Prefer a configured location; ignore legacy sister-entity codes on the item. */
function openingStockLocationForItem(
  item: Item,
  stockLocations: ReturnType<typeof stockLocationsForOpening>,
  tenantCode?: string | null,
): string {
  const matchCode = (raw: string | null | undefined) => {
    const trimmed = raw?.trim();
    if (!trimmed) return null;
    const lower = trimmed.toLowerCase();
    return (
      stockLocations.find((loc) => loc.code.toLowerCase() === lower)?.code ??
      null
    );
  };

  for (const candidate of [
    item.locationCode,
    ...(item.locationStock ?? []).map((row) => row.locationCode),
  ]) {
    const matched = matchCode(candidate);
    if (matched) return matched;
  }

  return defaultEntityLocationCode(stockLocations, tenantCode);
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
  const { config, tenantCode } = useRouteTenant();
  const priceCatalogOnly = isPriceCatalogOnlyTenant(
    tenantCode ?? config?.code,
    config?.archetype,
  );
  const showGroupPeerStock = isProductStockTenant(tenantCode ?? config?.code);

  const peerStockQuery = useQuery({
    queryKey: ["peer-stock", item?.sku],
    enabled: open && showGroupPeerStock && Boolean(item?.sku?.trim()),
    queryFn: () => getPeerStockBySkus([item!.sku]),
    staleTime: 60_000,
  });
  const peerEntities = peerStockQuery.data?.rows[0]?.entities;

  const locations = stockLocationsForOpening(config?.code, config);

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
    const unitPrice = item.sellPrice ?? 0;
    const cost = item.costPrice ?? 0;
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
        value: qty * cost,
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
  const selling = item.sellPrice ?? 0;
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

          <div className="hq6-product-view-thumb">
            {item.imageUrl ? (
              <ProductThumbnail
                src={item.imageUrl}
                alt={item.name}
                size={140}
                className="!max-h-none !max-w-none h-full w-full rounded"
              />
            ) : (
              <ImageIcon className="h-10 w-10" strokeWidth={1.25} aria-hidden />
            )}
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

        {showGroupPeerStock ? (
          <>
            <div className="hq6-product-view-section-title">
              <strong>Group stock (VW / VISP / VSP)</strong>
              <span className="ml-2 text-xs font-normal text-muted">
                Read-only — change stock only on your entity
              </span>
            </div>
            {peerStockQuery.isLoading ? (
              <p className="text-sm text-muted">Loading group stock…</p>
            ) : (
              <GroupPeerStockTable
                entities={peerEntities}
                highlightCode={tenantCode ?? config?.code}
              />
            )}
          </>
        ) : null}
      </div>
    </Hq6Modal>
  );
}

type OpeningStockEntry = {
  key: string;
  /** Set for saved history rows — those stay read-only. */
  recordId?: string;
  qty: string;
  unitCost: string;
  date: string;
  note: string;
  createdByName?: string | null;
  createdAt?: string | null;
};

function formatOpeningStockAddedAt(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function localTodayDate(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function nextOpeningStockKey(): string {
  return `os-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function blankOpeningStockEntry(unitCost: string): OpeningStockEntry {
  return {
    key: nextOpeningStockKey(),
    qty: "",
    unitCost,
    date: localTodayDate(),
    note: "",
  };
}

export type OpeningStockSaveRow = {
  id?: string;
  quantity: number;
  unitCost: number;
  date: string;
  note?: string;
};

export function Hq6OpeningStockModal({
  open,
  onClose,
  item,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  item: Item | null;
  onSave?: (
    rows: OpeningStockSaveRow[],
    locationCode: string,
    unitCost: number,
  ) => Promise<void>;
}) {
  const { config, tenantId } = useRouteTenant();
  const stockLocations = useMemo(
    () => stockLocationsForOpening(config?.code, config),
    [config?.code, config?.name, config?.businessLocations],
  );
  const [rows, setRows] = useState<OpeningStockEntry[]>([]);
  const [location, setLocation] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    if (!open || !item) return;

    let cancelled = false;
    const cost = String(item.costPrice ?? 0);
    setLocation(
      openingStockLocationForItem(item, stockLocations, config?.code),
    );
    setLoadingRecords(true);

    void (async () => {
      try {
        const records = await getItemOpeningStock(item.id);
        if (cancelled) return;
        if (records.length > 0) {
          const history: OpeningStockEntry[] = records.map((record) => ({
            key: record.id,
            recordId: record.id,
            qty: String(record.quantity),
            unitCost: String(record.unitCost ?? item.costPrice ?? 0),
            date: record.date || localTodayDate(),
            note: record.note ?? "",
            createdByName: record.createdByName,
            createdAt: record.createdAt ?? null,
          }));
          // History is read-only; always offer one blank row to add more stock.
          setRows([...history, blankOpeningStockEntry(cost)]);
          const firstLoc = records.find((r) => r.locationCode?.trim())
            ?.locationCode;
          if (firstLoc) {
            const matched = stockLocations.find(
              (l) => l.code.toLowerCase() === firstLoc.trim().toLowerCase(),
            );
            if (matched) setLocation(matched.code);
          }
        } else {
          setRows([
            {
              ...blankOpeningStockEntry(cost),
              qty: String(item.quantity ?? 0),
            },
          ]);
        }
      } catch {
        if (cancelled) return;
        setRows([
          {
            ...blankOpeningStockEntry(cost),
            qty: String(item.quantity ?? 0),
          },
        ]);
      } finally {
        if (!cancelled) setLoadingRecords(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, item, stockLocations, config?.code, tenantId]);

  const patchRow = (key: string, patch: Partial<OpeningStockEntry>) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.key !== key || row.recordId) return row;
        return { ...row, ...patch };
      }),
    );
  };

  const addRow = (afterKey: string) => {
    setRows((prev) => {
      const source =
        prev.find((row) => row.key === afterKey) ?? prev[prev.length - 1];
      const next = blankOpeningStockEntry(source?.unitCost ?? "0");
      const index = prev.findIndex((row) => row.key === afterKey);
      if (index < 0) return [...prev, next];
      const copy = [...prev];
      copy.splice(index + 1, 0, next);
      return copy;
    });
  };

  const removeRow = (key: string) => {
    setRows((prev) => {
      const target = prev.find((row) => row.key === key);
      if (!target || target.recordId) return prev;
      const editableCount = prev.filter((row) => !row.recordId).length;
      if (editableCount <= 1) return prev;
      return prev.filter((row) => row.key !== key);
    });
  };

  const rowSubtotal = (row: OpeningStockEntry) =>
    (Number(row.qty) || 0) * (Number(row.unitCost) || 0);
  const totalQty = rows.reduce((sum, row) => sum + (Number(row.qty) || 0), 0);
  const totalAmount = rows.reduce((sum, row) => sum + rowSubtotal(row), 0);
  const lastUnitCost =
    [...rows].reverse().find((row) => row.unitCost.trim() !== "")?.unitCost ??
    "0";
  const locationLabel =
    stockLocations.find((l) => l.code === location)?.name ?? location;
  const editableRows = rows.filter((row) => !row.recordId);
  const hasHistory = rows.some((row) => Boolean(row.recordId));

  return (
    <Hq6Modal
      open={open}
      onClose={onClose}
      title="Add Opening Stock"
      size="2xl"
      footer={
        <Hq6ModalSaveClose
          onClose={onClose}
          saving={saving}
          saveDisabled={loadingRecords}
          onSave={() => {
            void (async () => {
              for (const row of editableRows) {
                const valid = parseForm(openingStockSchema, {
                  quantity: row.qty === "" ? "0" : row.qty,
                });
                if (!valid) return;
              }
              const cost = Number(lastUnitCost);
              if (!Number.isFinite(cost) || cost < 0) {
                toast.error("Enter a valid unit cost");
                return;
              }
              const loc =
                location.trim() ||
                defaultEntityLocationCode(stockLocations, config?.code);
              if (!loc) {
                toast.error("No business location configured for this entity");
                return;
              }
              // Keep prior OS rows + new editable rows (append-only history).
              const payload: OpeningStockSaveRow[] = rows.map((row) => ({
                id: row.recordId,
                quantity: Number(row.qty) || 0,
                unitCost: Number(row.unitCost) || 0,
                date: row.date || localTodayDate(),
                note: row.note.trim() || undefined,
              }));
              setSaving(true);
              try {
                await onSave?.(payload, loc, cost);
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
      ) : loadingRecords ? (
        <p className="text-sm text-muted">Loading opening stock records…</p>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-[#6b7280]">
            Location:{" "}
            <span className="font-semibold text-[#111827]">
              {locationLabel} ({location})
            </span>
            {hasHistory ? (
              <span className="mt-1 block text-xs">
                Past opening-stock rows are locked. Add a new row to increase
                stock.
              </span>
            ) : null}
          </div>

          {stockLocations.length > 1 && (
            <Hq6Field label="Business Location">
              <select
                className="hq6-modal-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              >
                {stockLocations.map((loc) => (
                  <option key={loc.code} value={loc.code}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </Hq6Field>
          )}

          <div className="hq6-os-table-wrap">
            <table className="hq6-os-table">
              <thead>
                <tr className="bg-[#28a745] text-white">
                  <th className="text-left font-semibold">
                    Product Name
                  </th>
                  <th className="text-center font-semibold">
                    Quantity Remaining
                  </th>
                  <th className="text-center font-semibold">
                    Unit Cost (Before Tax)
                  </th>
                  <th className="text-center font-semibold">
                    Subtotal (Before Tax)
                  </th>
                  <th className="text-center font-semibold">Date</th>
                  <th className="text-center font-semibold">Note</th>
                  <th className="text-left font-semibold">
                    First added
                  </th>
                  <th className="hq6-os-actions-col" aria-label="Row actions" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => {
                  const locked = Boolean(row.recordId);
                  return (
                    <tr
                      key={row.key}
                      className={
                        locked
                          ? "border-b border-[#e5e7eb] bg-[#f9fafb]"
                          : "border-b border-[#e5e7eb]"
                      }
                    >
                      <td className="font-medium text-[#111827]">
                        {item.name}
                        {locked ? (
                          <div className="mt-0.5 text-xs font-normal text-[#6b7280]">
                            Saved record
                          </div>
                        ) : null}
                      </td>
                      <td>
                        {locked ? (
                          <span className="block text-center tabular-nums">
                            {row.qty}
                          </span>
                        ) : (
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className="hq6-modal-input hq6-os-qty-input"
                            value={row.qty}
                            onChange={(e) =>
                              patchRow(row.key, { qty: e.target.value })
                            }
                            aria-label={`Opening stock quantity ${index + 1}`}
                          />
                        )}
                      </td>
                      <td>
                        {locked ? (
                          <span className="block text-center tabular-nums">
                            {Number(row.unitCost || 0).toFixed(2)}
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              className="hq6-modal-input w-28 text-right"
                              value={row.unitCost}
                              onChange={(e) =>
                                patchRow(row.key, {
                                  unitCost: e.target.value,
                                })
                              }
                              aria-label={`Unit cost ${index + 1}`}
                            />
                          </div>
                        )}
                      </td>
                      <td className="text-center tabular-nums">
                        {rowSubtotal(row).toFixed(2)}
                      </td>
                      <td>
                        {locked ? (
                          <span className="block text-center tabular-nums text-sm">
                            {row.date}
                          </span>
                        ) : (
                          <input
                            type="date"
                            className="hq6-modal-input mx-auto block w-36"
                            value={row.date}
                            onChange={(e) =>
                              patchRow(row.key, { date: e.target.value })
                            }
                            aria-label={`Date ${index + 1}`}
                          />
                        )}
                      </td>
                      <td>
                        {locked ? (
                          <span className="block text-sm text-[#374151]">
                            {row.note.trim() || "—"}
                          </span>
                        ) : (
                          <textarea
                            className="hq6-modal-input w-full"
                            rows={1}
                            value={row.note}
                            onChange={(e) =>
                              patchRow(row.key, { note: e.target.value })
                            }
                            aria-label={`Note ${index + 1}`}
                          />
                        )}
                      </td>
                      <td className="text-left text-xs text-[#4b5563]">
                        {locked ? (
                          <>
                            <div className="font-medium text-[#111827]">
                              {row.createdByName?.trim() || "—"}
                            </div>
                            <div>
                              {formatOpeningStockAddedAt(row.createdAt)}
                            </div>
                          </>
                        ) : (
                          <span className="text-[#9ca3af]">New</span>
                        )}
                      </td>
                      <td className="hq6-os-actions-col">
                        <div className="hq6-os-row-actions">
                          <button
                            type="button"
                            className="hq6-os-icon-btn hq6-os-icon-btn-add"
                            aria-label="Add opening stock row"
                            title="Add another stock amount"
                            onClick={() => addRow(row.key)}
                          >
                            <Plus strokeWidth={2.5} />
                          </button>
                          {!locked && editableRows.length > 1 ? (
                            <button
                              type="button"
                              className="hq6-os-icon-btn hq6-os-icon-btn-remove"
                              aria-label="Remove opening stock row"
                              title="Remove this stock amount"
                              onClick={() => removeRow(row.key)}
                            >
                              <X strokeWidth={2.5} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-[#6b7280]">
              Total qty:{" "}
              <span className="font-semibold text-[#111827]">{totalQty}</span>
            </span>
            <span className="font-semibold text-[#111827]">
              Total Amount (Exc. Tax): {totalAmount.toFixed(2)}
            </span>
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
  const { config } = useRouteTenant();
  const locationChoices = useMemo(() => {
    const home = productHomeLocationsForTenant(config?.code);
    return home.length > 0 ? home : PRODUCT_STOCK_BUSINESS_LOCATIONS;
  }, [config?.code]);
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
            {locationChoices.map((loc) => (
              <option key={loc.code} value={loc.code}>
                {loc.name}
              </option>
            ))}
          </select>
        </Hq6Field>
      </div>
    </Hq6Modal>
  );
}
