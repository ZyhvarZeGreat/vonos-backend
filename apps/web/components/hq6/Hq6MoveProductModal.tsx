"use client";

import { moveStockSchema } from "@/lib/validation/schemas";
import { parseForm } from "@/lib/validation/parseForm";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Hq6Field,
  Hq6Modal,
  Hq6ModalSaveClose,
} from "@/components/hq6/Hq6Modal";
import { updateItem } from "@/lib/api/items";
import { createStockMovement } from "@/lib/api/stockMovements";
import type { Item } from "@vonos/types";
import { toast } from "@/stores/toastStore";

/**
 * Move stock between business locations — records a transfer movement and
 * updates per-location stock so financials / stock history stay in sync.
 */
export function Hq6MoveProductModal({
  open,
  tenantId,
  item,
  locations,
  onClose,
  onSaved,
}: {
  open: boolean;
  tenantId: string | null;
  item: Item | null;
  locations: Array<{ code: string; name: string }>;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const queryClient = useQueryClient();
  const [fromCode, setFromCode] = useState("");
  const [toCode, setToCode] = useState("");
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const stockByLocation = useMemo(() => {
    if (!item) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const row of item.locationStock ?? []) {
      map.set(row.locationCode, row.quantity);
    }
    if (item.locationCode && !map.has(item.locationCode)) {
      map.set(item.locationCode, item.quantity);
    }
    return map;
  }, [item]);

  const fromQty = fromCode ? (stockByLocation.get(fromCode) ?? 0) : 0;

  useEffect(() => {
    if (!open || !item) return;
    const firstWithStock =
      locations.find((loc) => (stockByLocation.get(loc.code) ?? 0) > 0)?.code ??
      item.locationCode ??
      locations[0]?.code ??
      "";
    setFromCode(firstWithStock);
    const dest =
      locations.find((loc) => loc.code !== firstWithStock)?.code ??
      locations[0]?.code ??
      "";
    setToCode(dest);
    setQty("1");
    setNote("");
  }, [open, item, locations, stockByLocation]);

  const handleSave = async () => {
    if (!tenantId || !item) return;
    if (!fromCode || !toCode) {
      toast.error("Select from and to locations");
      return;
    }
    if (fromCode === toCode) {
      toast.error("Choose a different destination location");
      return;
    }
    const valid = parseForm(moveStockSchema, { quantity: qty });
    if (!valid) return;
    const quantity = Number(valid.quantity);
    if (quantity > fromQty) {
      toast.error(`Only ${fromQty} available at source location`);
      return;
    }

    const fromName =
      locations.find((l) => l.code === fromCode)?.name ?? fromCode;
    const toName = locations.find((l) => l.code === toCode)?.name ?? toCode;
    const moveNote =
      note.trim() ||
      `Move ${quantity} from ${fromName} (${fromCode}) to ${toName} (${toCode})`;

    const nextStock = new Map(stockByLocation);
    nextStock.set(fromCode, Math.max(0, (nextStock.get(fromCode) ?? 0) - quantity));
    nextStock.set(toCode, (nextStock.get(toCode) ?? 0) + quantity);
    const locationStock = [...nextStock.entries()]
      .filter(([, q]) => q > 0)
      .map(([locationCode, quantityAtLoc]) => ({
        locationCode,
        quantity: quantityAtLoc,
        binLocation:
          item.locationStock.find((r) => r.locationCode === locationCode)
            ?.binLocation ?? null,
      }));

    setSaving(true);
    try {
      await createStockMovement(tenantId, {
        type: "transfer",
        reference: `MV-${Date.now().toString(36).toUpperCase()}`,
        status: "Delivered",
        locationCode: toCode,
        notes: moveNote,
        lines: [
          {
            itemId: item.id,
            sku: item.sku,
            name: item.name,
            quantity,
            unitCost: item.costPrice,
          },
        ],
      });
      await updateItem(item.id, {
        locationCode: toCode,
        locationStock:
          locationStock.length > 0
            ? locationStock
            : [{ locationCode: toCode, quantity: 0 }],
      });
      void queryClient.invalidateQueries({ queryKey: ["catalog"] });
      void queryClient.invalidateQueries({ queryKey: ["items"] });
      void queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      toast.success("Product moved — stock & movement recorded");
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Move failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Hq6Modal
      open={open && Boolean(item)}
      onClose={onClose}
      title={item ? `Move product — ${item.name}` : "Move product"}
      size="md"
      footer={
        <Hq6ModalSaveClose
          onSave={handleSave}
          onClose={onClose}
          saving={saving}
          saveLabel="Move"
        />
      }
    >
      {item ? (
        <div className="space-y-3">
          <p className="text-sm text-[#6b7280]">
            SKU <span className="font-medium text-[#111827]">{item.sku}</span>
            {" · "}
            Available at source:{" "}
            <span className="font-medium text-[#111827]">{fromQty}</span>
          </p>
          <Hq6Field label="From location" required>
            <select
              className="hq6-modal-input"
              value={fromCode}
              onChange={(e) => setFromCode(e.target.value)}
            >
              {locations.map((loc) => (
                <option key={loc.code} value={loc.code}>
                  {loc.name} —{" "}
                  {stockByLocation.get(loc.code) ?? 0} on hand
                </option>
              ))}
            </select>
          </Hq6Field>
          <Hq6Field label="To location" required>
            <select
              className="hq6-modal-input"
              value={toCode}
              onChange={(e) => setToCode(e.target.value)}
            >
              {locations.map((loc) => (
                <option key={loc.code} value={loc.code}>
                  {loc.name}
                </option>
              ))}
            </select>
          </Hq6Field>
          <Hq6Field label="Quantity" required>
            <input
              className="hq6-modal-input"
              type="number"
              min={1}
              step={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </Hq6Field>
          <Hq6Field label="Note">
            <textarea
              className="hq6-modal-input"
              rows={2}
              placeholder="Optional note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </Hq6Field>
        </div>
      ) : null}
    </Hq6Modal>
  );
}
