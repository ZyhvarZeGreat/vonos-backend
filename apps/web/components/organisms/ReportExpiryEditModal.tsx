"use client";

import { expiryDateFormSchema } from "@/lib/validation/schemas";
import { parseForm } from "@/lib/validation/parseForm";
import { useEffect, useState } from "react";
import { Button } from "@/components/atoms/Button";
import { Modal } from "@/components/atoms/Modal";
import { Hq6Field, Hq6Modal, Hq6ModalSaveClose } from "@/components/hq6/Hq6Modal";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";

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
  const isHq6 = useIsVaHq6();
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

  const submit = async () => {
    const valid = parseForm(
      expiryDateFormSchema,
      { expDate },
      { setError },
    );
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...open, expDate: valid.expDate });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
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
        title="Edit expiry date"
        size="sm"
        footer={
          <Hq6ModalSaveClose
            onSave={() => void submit()}
            onClose={onClose}
            saveLabel="Update"
            saving={saving}
            saveDisabled={!expDate}
          />
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-[#6b7280]">
            {open.name ?? open.lineSku} — inbound line expiry.
          </p>
          <Hq6Field label="Expiry date" required>
            <input
              type="date"
              required
              className="form-control"
              value={expDate}
              onChange={(e) => setExpDate(e.target.value)}
            />
          </Hq6Field>
          {error ? <p className="text-sm text-[#dc2626]">{error}</p> : null}
        </form>
      </Hq6Modal>
    );
  }

  return (
    <Modal open onClose={onClose} panelClassName="max-w-md rounded-xl border border-border p-6">
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
    </Modal>
  );
}
