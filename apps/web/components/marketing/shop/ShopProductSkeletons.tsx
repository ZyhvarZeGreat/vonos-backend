import { Skeleton } from "@/components/atoms/Skeleton";

export function ShopProductCardSkeleton() {
  return (
    <article className="ve-product-card ve-shop ve-product-skeleton" aria-hidden>
      <Skeleton className="ve-product-skeleton__media" />
      <div className="ve-product-card__body">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-full" />
      </div>
      <hr className="ve-shop-divider" />
      <div className="ve-product-card__actions">
        <Skeleton className="h-10 w-[70px]" />
        <Skeleton className="h-10 flex-1" />
      </div>
    </article>
  );
}

export function ShopProductListCardSkeleton() {
  return (
    <article className="ve-product-list-card ve-shop ve-product-skeleton" aria-hidden>
      <Skeleton className="ve-product-skeleton__list-media" />
      <div className="ve-product-list-card__body">
        <Skeleton className="h-5 w-2/3 max-w-xs" />
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-16 w-full" />
        <div className="ve-product-list-card__actions">
          <Skeleton className="h-10 w-[70px]" />
          <Skeleton className="h-10 w-36" />
        </div>
      </div>
    </article>
  );
}

export function ShopProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="ve-product-grid ve-shop" role="status" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <ShopProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ShopProductListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="ve-shop" style={{ display: "grid", gap: 16 }} role="status" aria-label="Loading featured products">
      {Array.from({ length: count }, (_, i) => (
        <ShopProductListCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ShopCategoryGridSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ul className="vonos-shop-category-grid" role="status" aria-label="Loading categories">
      {Array.from({ length: count }, (_, i) => (
        <li key={i}>
          <div className="vonos-shop-category-card ve-product-skeleton">
            <div className="vonos-shop-category-copy" style={{ flex: 1 }}>
              <Skeleton className="h-5 w-28 mb-2" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="h-16 w-16 rounded-md" />
          </div>
        </li>
      ))}
    </ul>
  );
}
