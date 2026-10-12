"use client";

import { Car, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { carModelSummary } from "@vonos/types";

import {
  formatShopLabel,
  formatShopPrice,
  type ShopProduct,
} from "@/lib/marketing/shop-catalog";
import {
  isShopPlaceholderIcon,
  resolveShopProductImage,
} from "@/lib/marketing/shop-stock-images";
import { shopProductPath } from "@/lib/seo/site";
import { useShopCart } from "@/stores/shopCartStore";

type ProductCardProps = {
  product: ShopProduct;
};

export default function ProductCard({ product }: ProductCardProps) {
  const { addProduct } = useShopCart();
  const [imageBroken, setImageBroken] = useState(false);
  const outOfStock = product.inStock === false;
  const unpriced = product.price <= 0;
  const href = shopProductPath(product.sku ?? product.id);
  const name = formatShopLabel(product.name);
  const stockFallback = resolveShopProductImage({
    imageUrl: null,
    name: product.name,
    category: product.category,
    sku: product.sku,
  });
  const placeholder = imageBroken || isShopPlaceholderIcon(product.icon);
  const imageSrc = placeholder ? stockFallback : product.icon;
  const fits = carModelSummary(product.carModel);

  return (
    <article className="vg-pcard" data-node-id="39:1465">
      <div
        className="vg-pcard__frame"
        data-placeholder={placeholder ? "stock" : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageSrc}
          alt=""
          loading="lazy"
          onError={() => setImageBroken(true)}
        />
        <Link href={href} className="vg-pcard__hit" aria-label={name} />
        {outOfStock ? (
          <span className="vg-pcard__flag">Out of stock</span>
        ) : unpriced ? null : (
          <button
            type="button"
            className="vg-pcard__add"
            aria-label={`Add ${name} to cart`}
            onClick={() => addProduct(product, 1)}
          >
            <Plus size={16} strokeWidth={1.8} aria-hidden />
          </button>
        )}
      </div>
      <div className="vg-pcard__meta">
        <h3 className="vg-pcard__name">
          <Link href={href}>{name}</Link>
        </h3>
        {fits ? (
          <p className="vg-pcard__fits" title={product.carModel ?? undefined}>
            <Car size={12} strokeWidth={1.8} aria-hidden />
            <span>Fits {fits}</span>
          </p>
        ) : null}
        <p className="vg-pcard__prices" data-unpriced={unpriced || undefined}>
          {unpriced ? "Price on request" : formatShopPrice(product.price)}
        </p>
      </div>
    </article>
  );
}
