"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { Modal } from "@/components/atoms/Modal";
import { Hq6Field, Hq6Modal, Hq6ModalSaveClose } from "@/components/hq6/Hq6Modal";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { parseForm } from "@/lib/validation/parseForm";
import { openingStockSchema } from "@/lib/validation/schemas";

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
  const isHq6 = useIsVaHq6();
  const [quantity, setQuantity] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuantity(open.quantity);
    setError(null);
  }, [open]);

  if (!open) return null;

  const submit = async () => {
    const valid = parseForm(
      openingStockSchema,
      { quantity },
      { setError },
    );
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        ...open,
        quantity: Math.max(0, Math.trunc(Number(valid.quantity))),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fix failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submit();
  };

  if (isHq6) {
    return (
      <Hq6Modal
        open
        onClose={onClose}
        title="Fix stock mismatch"
        size="sm"
        footer={
          <Hq6ModalSaveClose
            onSave={() => void submit()}
            onClose={onClose}
            saveLabel="Fix stock"
            saving={saving}
          />
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-[#6b7280]">
            {open.name ?? open.sku ?? open.itemId} at {open.locationCode}
            {open.binLocation ? ` (${open.binLocation})` : ""}.
          </p>
          <Hq6Field label="Correct quantity on hand" required>
            <input
              type="number"
              min={0}
              step={1}
              required
              className="form-control"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
            />
          </Hq6Field>
          {error ? <p className="text-sm text-[#dc2626]">{error}</p> : null}
        </form>
      </Hq6Modal>
    );
  }

  return (
    <Modal open onClose={onClose} panelClassName="max-w-md rounded-xl border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground">Fix stock mismatch</h3>
      <p className="mt-1 text-sm text-muted">
        {open.name ?? open.sku ?? open.itemId} at {open.locationCode}
        {open.binLocation ? ` (${open.binLocation})` : ""}.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <label className="block text-sm">
          <span className="text-muted">Correct quantity on hand</span>
          <input
            type="number"
            min={0}
            step={1}
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
    </Modal>
  );
}
