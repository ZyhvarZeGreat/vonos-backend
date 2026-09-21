"use client";

import { useEffect, useMemo, useState } from "react";

import ProductCard from "@/components/marketing/ecommerce/ProductCard";
import SectionHead from "@/components/marketing/ecommerce/SectionHead";
import type { ShopProduct } from "@/lib/marketing/shop-catalog";
import { fetchStoreCatalog } from "@/lib/marketing/store-api";

type SimilarProductsProps = {
  product: ShopProduct;
  limit?: number;
};

export default function SimilarProducts({ product, limit = 5 }: SimilarProductsProps) {
  const [catalog, setCatalog] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchStoreCatalog({ limit: 120 })
      .then((result) => {
        if (!cancelled) setCatalog(result.items);
      })
      .catch(() => {
        if (!cancelled) setCatalog([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const similar = useMemo(() => {
    const category = product.category.trim().toLowerCase();
    const sameCategory = catalog.filter(
      (item) =>
        item.id !== product.id &&
        item.inStock !== false &&
        item.category.trim().toLowerCase() === category,
    );
    const pool =
      sameCategory.length >= limit
        ? sameCategory
        : catalog.filter((item) => item.id !== product.id && item.inStock !== false);
    return pool.slice(0, limit);
  }, [catalog, product, limit]);

  if (!loading && similar.length === 0) return null;

  return (
    <section className="vg-sec" data-node-id="39:1459" data-qa-section="shop-similar">
      <div className="vg-container">
        <SectionHead title="Similar Products" viewAllHref="/shop#shop-catalog" />
        <div className="vg-products">
          {loading
            ? Array.from({ length: limit }, (_, index) => (
                <div key={index}>
                  <div className="vg-skeleton vg-skeleton--card" />
                  <div className="vg-skeleton vg-skeleton--line" />
                </div>
              ))
            : similar.map((item) => <ProductCard key={item.id} product={item} />)}
        </div>
      </div>
    </section>
  );
}
