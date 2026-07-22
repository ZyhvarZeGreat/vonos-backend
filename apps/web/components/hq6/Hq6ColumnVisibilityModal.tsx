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
}: {
  open: boolean;
  onClose: () => void;
  columns: Hq6ColumnOption[];
  visibleKeys: string[];
  onChange: (keys: string[]) => void;
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
      size="sm"
      footer={
        <Hq6ModalSaveClose
          onClose={onClose}
          onSave={() => {
            onChange(allKeys.filter((k) => draft.has(k)));
            onClose();
          }}
          saveLabel="Apply"
        />
      }
    >
      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm font-medium text-[#374151]">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-[#d1d5db]"
            checked={draft.size === allKeys.length && allKeys.length > 0}
            onChange={(e) => {
              setDraft(e.target.checked ? new Set(allKeys) : new Set());
            }}
          />
          Select all
        </label>
        <div className="max-h-72 space-y-1.5 overflow-y-auto border-t border-[#e5e7eb] pt-2">
          {columns.map((col) => (
            <label
              key={col.key}
              className="flex items-center gap-2 text-sm text-[#111827]"
            >
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[#d1d5db]"
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
              {col.label}
            </label>
          ))}
        </div>
      </div>
    </Hq6Modal>
  );
}
