"use client";

import Link from "next/link";
import { Heart, Plus } from "lucide-react";
import { useState } from "react";

import ShopBusyButton from "@/components/marketing/shop/ShopBusyButton";
import type { ShopProduct } from "@/lib/marketing/shop-catalog";
import { formatShopLabel, formatShopPrice } from "@/lib/marketing/shop-catalog";
import { shopProductPath } from "@/lib/seo/site";
import { useShopCart } from "@/stores/shopCartStore";

type ShopProductCardProps = {
  product: ShopProduct;
  onAdd?: (product: ShopProduct, qty: number) => void;
};

export default function ShopProductCard({ product, onAdd }: ShopProductCardProps) {
  const { addProduct } = useShopCart();
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const outOfStock = product.inStock === false;
  const href = shopProductPath(product.sku ?? product.id);

  async function handleAdd() {
    if (outOfStock || adding) return;
    setAdding(true);
    try {
      if (onAdd) onAdd(product, qty);
      else addProduct(product, qty);
      await new Promise((resolve) => window.setTimeout(resolve, 280));
    } finally {
      setAdding(false);
    }
  }

  return (
    <article className="ve-product-card ve-shop">
      <div className="ve-product-card__media">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.icon} alt="" />
        <span className="ve-shop-badge ve-product-card__label">
          {formatShopLabel(product.category || "Part")}
        </span>
        <button
          type="button"
          className="ve-shop-btn ve-shop-btn--icon ve-product-card__wish"
          aria-label="Save for later"
          tabIndex={-1}
        >
          <Heart className="ve-shop-lucide" aria-hidden />
        </button>
      </div>
      <div className="ve-product-card__body">
        <p className="ve-product-card__price">{formatShopPrice(product.price)}</p>
        <h3 className="ve-product-card__name">
          <Link href={href}>{formatShopLabel(product.name)}</Link>
        </h3>
      </div>
      <hr className="ve-shop-divider" />
      <div className="ve-product-card__actions">
        <label className="sr-only" htmlFor={`qty-${product.id}`}>
          Quantity
        </label>
        <select
          id={`qty-${product.id}`}
          className="ve-shop-select"
          value={qty}
          onChange={(e) => setQty(Number(e.target.value))}
          disabled={outOfStock || adding}
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
              Add
              <Plus className="ve-shop-lucide" aria-hidden />
            </>
          )}
        </ShopBusyButton>
      </div>
    </article>
  );
}
