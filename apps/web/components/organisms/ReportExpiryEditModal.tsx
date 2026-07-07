"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/atoms/Button";

export interface ExpiryEditPayload {
  movementId: string;
  lineSku: string;
  expDate: string;
  sku?: string;
  name?: string;
}

export function ReportExpiryEditModal({
  open,
  onClose,
  onSave,
}: {
  open: ExpiryEditPayload | null;
  onClose: () => void;
  onSave: (payload: ExpiryEditPayload & { expDate: string }) => Promise<void>;
}) {
  const [expDate, setExpDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const raw = open.expDate;
    setExpDate(raw && raw !== "—" ? raw.slice(0, 10) : "");
    setError(null);
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...open, expDate });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-foreground">Edit expiry date</h3>
        <p className="mt-1 text-sm text-muted">
          {open.name ?? open.lineSku} — inbound line expiry.
        </p>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <label className="block text-sm">
            <span className="text-muted">Expiry date</span>
            <input
              type="date"
              required
              value={expDate}
              onChange={(e) => setExpDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Update"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
