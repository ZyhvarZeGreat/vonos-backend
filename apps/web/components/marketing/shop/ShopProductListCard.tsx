"use client";

import Link from "next/link";
import { Plus, Star, Truck } from "lucide-react";
import { useState } from "react";

import ShopBusyButton from "@/components/marketing/shop/ShopBusyButton";
import type { ShopProduct } from "@/lib/marketing/shop-catalog";
import { formatShopLabel, formatShopPrice } from "@/lib/marketing/shop-catalog";
import { shopProductPath } from "@/lib/seo/site";
import { useShopCart } from "@/stores/shopCartStore";

type ShopProductListCardProps = {
  product: ShopProduct;
};

export default function ShopProductListCard({ product }: ShopProductListCardProps) {
  const { addProduct } = useShopCart();
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const outOfStock = product.inStock === false;
  const href = shopProductPath(product.sku ?? product.id);
  const compareAt = Math.round(product.price * 1.1);

  async function handleAdd() {
    if (outOfStock || adding) return;
    setAdding(true);
    try {
      addProduct(product, qty);
      await new Promise((resolve) => window.setTimeout(resolve, 280));
    } finally {
      setAdding(false);
    }
  }

  return (
    <article className="ve-product-list-card ve-shop">
      <Link href={href} className="ve-product-list-card__media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.icon} alt={product.name} />
      </Link>
      <div className="ve-product-list-card__body">
        <h3 className="ve-product-list-card__name">
          <Link href={href}>{formatShopLabel(product.name)}</Link>
        </h3>
        <div className="ve-product-list-card__prices">
          <p className="ve-product-list-card__price">{formatShopPrice(product.price)}</p>
          <p className="ve-product-list-card__compare">{formatShopPrice(compareAt)}</p>
        </div>
        <div className="ve-product-list-card__meta-row" aria-hidden>
          <span>
            <Star className="ve-shop-lucide--star" aria-hidden />
            9.3
          </span>
          <span>OE-spec stock</span>
          <span>
            <Truck className="ve-shop-lucide" aria-hidden />
            Free delivery on select items
          </span>
        </div>
        <p className="ve-product-list-card__desc">
          {product.description || "Genuine auto part from the Vonos SP marketplace."}
        </p>
        <div className="ve-product-list-card__actions">
          <select
            className="ve-shop-select"
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            disabled={outOfStock || adding}
            aria-label="Quantity"
          >
            {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <ShopBusyButton
            className="ve-shop-btn--primary"
            busy={adding}
            busyLabel="Adding…"
            disabled={outOfStock}
            onClick={() => void handleAdd()}
          >
            {outOfStock ? (
              "Out of stock"
            ) : (
              <>
                Add to basket
                <Plus className="ve-shop-lucide" aria-hidden />
              </>
            )}
          </ShopBusyButton>
        </div>
      </div>
    </article>
  );
}
