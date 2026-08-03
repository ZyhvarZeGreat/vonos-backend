"use client";

import { useEffect, useState } from "react";
import { Hq6Modal, Hq6ModalSaveClose } from "@/components/hq6/Hq6Modal";

export interface Hq6ColumnOption {
  key: string;
  label: string;
}

export function Hq6ColumnVisibilityModal({
  open,
  onClose,
  columns,
  visibleKeys,
  onChange,
  onReset,
}: {
  open: boolean;
  onClose: () => void;
  columns: Hq6ColumnOption[];
  visibleKeys: string[];
  onChange: (keys: string[]) => void;
  onReset?: () => void;
}) {
  const [draft, setDraft] = useState<Set<string>>(() => new Set(visibleKeys));

  useEffect(() => {
    if (open) setDraft(new Set(visibleKeys));
  }, [open, visibleKeys]);

  const allKeys = columns.map((c) => c.key);

  return (
    <Hq6Modal
      open={open}
      onClose={onClose}
      title="Column visibility"
      size="md"
      footer={
        <div className="hq6-colvis-footer">
          {onReset ? (
            <button
              type="button"
              className="hq6-colvis-reset"
              onClick={onReset}
            >
              Reset to default
            </button>
          ) : (
            <span />
          )}
          <Hq6ModalSaveClose
            onClose={onClose}
            onSave={() => {
              onChange(allKeys.filter((k) => draft.has(k)));
              onClose();
            }}
            saveLabel="Apply"
          />
        </div>
      }
    >
      <div className="hq6-colvis">
        <label className="hq6-colvis-select-all">
          <input
            type="checkbox"
            checked={draft.size === allKeys.length && allKeys.length > 0}
            onChange={(e) => {
              setDraft(e.target.checked ? new Set(allKeys) : new Set());
            }}
          />
          <span>Select all</span>
        </label>
        <div className="hq6-colvis-grid">
          {columns.map((col) => (
            <label key={col.key} className="hq6-colvis-item">
              <input
                type="checkbox"
                checked={draft.has(col.key)}
                onChange={(e) => {
                  setDraft((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) next.add(col.key);
                    else next.delete(col.key);
                    return next;
                  });
                }}
              />
              <span>{col.label}</span>
            </label>
          ))}
        </div>
      </div>
    </Hq6Modal>
  );
}
