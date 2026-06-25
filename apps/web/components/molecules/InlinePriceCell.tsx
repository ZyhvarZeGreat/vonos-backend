"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { updateItem } from "@/lib/api/items";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import type { Item } from "@vonos/types";

export interface InlinePriceCellProps {
  item: Item;
  label?: string;
}

export function InlinePriceCell({ item, label = "Price" }: InlinePriceCellProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(item.costPrice));

  useEffect(() => {
    setValue(String(item.costPrice));
  }, [item.costPrice]);

  const mutation = useAppMutation({
    mutationFn: async (nextPrice: number) => updateItem(item.id, { costPrice: nextPrice }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["items"] });
      await queryClient.invalidateQueries({ queryKey: ["catalog"] });
      setEditing(false);
    },
  });

  const commit = () => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setValue(String(item.costPrice));
      setEditing(false);
      return;
    }
    if (parsed === item.costPrice) {
      setEditing(false);
      return;
    }
    mutation.mutate(parsed);
  };

  if (editing) {
    return (
      <input
        type="number"
        min="0"
        step="0.01"
        aria-label={`${label} for ${item.name}`}
        value={value}
        autoFocus
        disabled={mutation.isPending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") {
            setValue(String(item.costPrice));
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
      {formatCurrency(item.costPrice, item.currency)}
    </button>
  );
}
