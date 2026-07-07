"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/atoms/Button";

export interface FixStockPayload {
  itemId: string;
  locationCode: string;
  binLocation?: string;
  quantity: number;
  sku?: string;
  name?: string;
}

export function ReportFixStockModal({
  open,
  onClose,
  onSave,
}: {
  open: FixStockPayload | null;
  onClose: () => void;
  onSave: (payload: FixStockPayload) => Promise<void>;
}) {
  const [quantity, setQuantity] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuantity(open.quantity);
    setError(null);
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...open, quantity: Math.max(0, Math.trunc(quantity)) });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fix failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-foreground">Fix location stock</h3>
        <p className="mt-1 text-sm text-muted">
          {open.name ?? open.itemId} at {open.locationCode}
          {open.binLocation ? ` / ${open.binLocation}` : ""}
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="text-muted">Quantity at location</span>
            <input
              type="number"
              min={0}
              required
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Fix stock"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
