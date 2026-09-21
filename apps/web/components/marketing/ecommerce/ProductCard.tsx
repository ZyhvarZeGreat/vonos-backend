"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { formatShopLabel, formatShopPrice, type ShopProduct } from "@/lib/marketing/shop-catalog";
import { shopProductPath } from "@/lib/seo/site";
import { useShopCart } from "@/stores/shopCartStore";

const FALLBACK_ICON = "/images/icons/service-01.svg";

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
  const placeholder = imageBroken || product.icon.startsWith("/images/icons/");

  return (
    <article className="vg-pcard" data-node-id="39:1465">
      <div className="vg-pcard__frame" data-placeholder={placeholder}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageBroken ? FALLBACK_ICON : product.icon}
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
      <div>
        <h3 className="vg-pcard__name">
          <Link href={href}>{name}</Link>
        </h3>
        <p className="vg-pcard__prices" data-unpriced={unpriced || undefined}>
          {unpriced ? "Price on request" : formatShopPrice(product.price)}
        </p>
      </div>
    </article>
  );
}
