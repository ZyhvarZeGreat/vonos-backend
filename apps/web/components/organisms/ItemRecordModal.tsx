"use client";

import { useQuery } from "@tanstack/react-query";
import { Hq6Modal } from "@/components/hq6/Hq6Modal";
import { Hq6ViewProductModal } from "@/components/hq6/Hq6ProductModals";
import { RecordViewModal } from "@/components/organisms/RecordViewModal";
import { getCatalogItem } from "@/lib/api/catalog";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import {
  MODAL_RECORD_STALE_MS,
  modalKeys,
} from "@/lib/query/modalQueryKeys";
import { formatCurrency, formatNumber } from "@/lib/utils/formatCurrency";

export interface ItemRecordModalProps {
  itemId: string | null;
  onClose: () => void;
  showBack?: boolean;
}

/** Product / item detail modal for reports (and other list contexts). */
export function ItemRecordModal({
  itemId,
  onClose,
  showBack = false,
}: ItemRecordModalProps) {
  const isHq6 = useIsVaHq6();
  const { tenantId } = useRouteTenant();

  const { data: item, isLoading, error } = useQuery({
    queryKey: modalKeys.item(tenantId, itemId),
    // Catalog scope works for every entity (own-tenant product catalogs).
    queryFn: () => getCatalogItem(itemId!),
    enabled: Boolean(tenantId && itemId),
    staleTime: MODAL_RECORD_STALE_MS,
    placeholderData: (prev) => prev,
  });

  if (isHq6) {
    if (itemId && isLoading) {
      return (
        <Hq6Modal open onClose={onClose} title="View Product" size="2xl" showBack={showBack}>
          <div className="space-y-3 py-2" aria-busy>
            <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
            <div className="h-3 w-full animate-pulse rounded bg-gray-200" />
            <div className="mt-4 h-40 w-full animate-pulse rounded-lg bg-gray-100" />
            <p className="pt-2 text-center text-sm text-muted">Loading…</p>
          </div>
        </Hq6Modal>
      );
    }
    if (itemId && error) {
      return (
        <Hq6Modal open onClose={onClose} title="View Product" size="2xl" showBack={showBack}>
          <p className="py-8 text-center text-sm text-error">
            Could not load this product.
          </p>
        </Hq6Modal>
      );
    }
    return (
      <Hq6ViewProductModal
        open={Boolean(itemId)}
        onClose={onClose}
        item={item ?? null}
      />
    );
  }

  return (
    <RecordViewModal
      open={Boolean(itemId)}
      title={item ? item.name : "Product details"}
      subtitle={item?.sku ? `SKU ${item.sku}` : undefined}
      onClose={onClose}
      showBack={showBack}
      isLoading={isLoading}
      error={error ? "Could not load this product." : null}
    >
      {item ? (
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">SKU</dt>
            <dd className="font-medium text-foreground">{item.sku || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Category</dt>
            <dd className="font-medium text-foreground">{item.category || "—"}</dd>
          </div>
          <div>
            <dt className="text-muted">Quantity</dt>
            <dd className="font-medium text-foreground">
              {formatNumber(item.quantity)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Unit cost</dt>
            <dd className="font-medium text-foreground">
              {formatCurrency(item.costPrice ?? 0, item.currency ?? "NGN")}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Sell price</dt>
            <dd className="font-medium text-foreground">
              {formatCurrency(
                item.sellPrice ?? 0,
                item.currency ?? "NGN",
              )}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Status</dt>
            <dd className="font-medium text-foreground">{item.status || "—"}</dd>
          </div>
          {item.description ? (
            <div className="sm:col-span-2">
              <dt className="text-muted">Description</dt>
              <dd className="font-medium text-foreground">{item.description}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </RecordViewModal>
  );
}
