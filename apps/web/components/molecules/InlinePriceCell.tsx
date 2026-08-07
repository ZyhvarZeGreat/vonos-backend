"use client";

import { useEffect, useState } from "react";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { updateItem } from "@/lib/api/items";
import { patchEntityInQueries } from "@/lib/query/optimistic";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import type { Item } from "@vonos/types";

export interface InlinePriceCellProps {
  item: Item;
  label?: string;
  field?: "costPrice" | "sellPrice";
}

export function InlinePriceCell({
  item,
  label = "Price",
  field = "costPrice",
}: InlinePriceCellProps) {
  const current = field === "sellPrice" ? (item.sellPrice ?? 0) : item.costPrice;
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(current));

  useEffect(() => {
    setValue(String(current));
  }, [current]);

  const mutation = useAppMutation({
    mutationFn: async (nextPrice: number) =>
      updateItem(item.id, { [field]: nextPrice }),
    successMessage: "Price updated",
    optimistic: {
      keys: [["items"], ["catalog"]],
      update: (qc, nextPrice) => {
        patchEntityInQueries(qc, ["items"], item.id, { [field]: nextPrice });
        patchEntityInQueries(qc, ["catalog"], item.id, { [field]: nextPrice });
      },
    },
    onSuccess: () => {
      setEditing(false);
    },
  });

  const commit = () => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setValue(String(current));
      setEditing(false);
      return;
    }
    if (parsed === current) {
      setEditing(false);
      return;
    }
    mutation.mutate(parsed);
  };

  if (editing) {
    return (
      <input
        type="text"
        inputMode="decimal"
        aria-label={`${label} for ${item.name}`}
        value={value}
        autoFocus
        disabled={mutation.isPending}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw !== "" && !/^-?\d*\.?\d*$/.test(raw)) return;
          setValue(raw);
        }}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setValue(String(current));
            setEditing(false);
          }
        }}
        className="w-24 rounded border border-[var(--color-brand-primary)] bg-card px-2 py-1 text-right text-sm"
        onClick={(e) => e.stopPropagation()}
      />
    );
  }

  return (
    <button
      type="button"
      title="Click to edit price"
      className="rounded px-1 text-right text-sm hover:bg-[var(--color-surface-muted)]"
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
    >
      {formatCurrency(current, item.currency)}
    </button>
  );
}
