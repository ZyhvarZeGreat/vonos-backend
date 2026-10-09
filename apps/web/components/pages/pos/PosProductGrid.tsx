"use client";

import { ProductThumbnail } from "@/components/atoms/ProductThumbnail";
import { EmptyState } from "@/components/atoms/EmptyState";
import type { PosCartItemPick } from "@/stores/posCartStore";

export interface PosGridItem {
  id: string;
  sku: string;
  name: string;
  imageUrl?: string | null;
  sellPrice: number | null;
  costPrice?: number | null;
  unit?: string | null;
  stockQty: number;
}

function stockLabel(item: PosGridItem): string {
  return `${item.stockQty.toFixed(2)} ${item.unit?.trim() || "Pc(s)"} in stock`;
}

export function toCartPick(item: PosGridItem): PosCartItemPick {
  return {
    id: item.id,
    sku: item.sku,
    name: item.name,
    imageUrl: item.imageUrl,
    sellPrice: item.sellPrice,
    costPrice: item.costPrice,
    unit: item.unit,
    stockQty: item.stockQty,
  };
}

export function PosProductGrid({
  items,
  isLoading,
  isError,
  onRetry,
  onAdd,
}: {
  items: PosGridItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  onAdd: (item: PosGridItem) => void;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="animate-pulse rounded-lg border border-border bg-card p-4"
          >
            <div className="mx-auto h-12 w-12 rounded bg-[var(--color-surface-muted)]" />
            <div className="mx-auto mt-2 h-3 w-3/4 rounded bg-[var(--color-surface-muted)]" />
            <div className="mx-auto mt-1 h-3 w-1/2 rounded bg-[var(--color-surface-muted)]" />
          </div>        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <EmptyState
        title="Could not load products"
        message="Check your connection and try again."
        ctaLabel="Retry"
        onCta={onRetry}
      />
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No products found"
        message="Try a different search, category, or brand."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const outOfStock = item.stockQty <= 0;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onAdd(item)}
            title={outOfStock ? `${item.name} — out of stock` : item.name}
            className="cafe-pos-product"
          >
            <ProductThumbnail
              src={item.imageUrl}
              alt={item.name}
              size={48}
              className="mx-auto"
            />
            <p className="mt-2 truncate text-sm font-medium text-foreground">
              {item.name}
            </p>
            <p className="text-xs text-muted">({item.sku})</p>
            <p
              className={`mt-1 text-xs ${outOfStock ? "font-medium text-amber-600" : "text-muted"}`}
            >
              {outOfStock ? "⚠ " : ""}
              {stockLabel(item)}
            </p>
          </button>
        );
      })}
    </div>
  );
}
