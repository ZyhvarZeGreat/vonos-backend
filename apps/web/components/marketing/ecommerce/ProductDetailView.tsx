"use client";

import { Plus, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { formatShopLabel, formatShopPrice, type ShopProduct } from "@/lib/marketing/shop-catalog";
import { useShopCart } from "@/stores/shopCartStore";

type ProductDetailViewProps = {
  product: ShopProduct;
};

export default function ProductDetailView({ product }: ProductDetailViewProps) {
  const { addProduct } = useShopCart();
  const [qty, setQty] = useState(1);
  const [zoomed, setZoomed] = useState(false);

  const outOfStock = product.inStock === false;
  const unpriced = product.price <= 0;
  const name = formatShopLabel(product.name);
  const category = formatShopLabel(product.category);
  const maxQty = product.availableQuantity && product.availableQuantity > 0
    ? product.availableQuantity
    : undefined;

  return (
    <div className="vg-pdp__grid" data-node-id="63:313">
      <div className="vg-pdp__media" data-zoomed={zoomed}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.icon} alt={name} />
        <button
          type="button"
          className="vg-pdp__zoom"
          aria-label={zoomed ? "Reset zoom" : "Zoom image"}
          aria-pressed={zoomed}
          onClick={() => setZoomed((current) => !current)}
        >
          <Plus size={16} strokeWidth={1.8} aria-hidden />
        </button>
      </div>

      <div className="vg-pdp__body">
        <div>
          <h1 className="vg-pdp__title">{name}</h1>
          <p className="vg-pdp__prices">
            {unpriced ? "Price on request" : formatShopPrice(product.price)}
          </p>
          <p className="vg-pdp__desc">{product.description}</p>
        </div>

        <hr className="vg-rule" />

        <div>
          <ul className="vg-pdp__specs">
            <li className="vg-pdp__spec">
              <span className="vg-pdp__spec-key">
                <span className="vg-dot" aria-hidden />
                Part Number:
              </span>
              <span className="vg-pdp__spec-val">{product.sku ?? "—"}</span>
            </li>
            <li className="vg-pdp__spec">
              <span className="vg-pdp__spec-key">
                <span className="vg-dot" aria-hidden />
                Category:
              </span>
              <span className="vg-pdp__spec-val">{category}</span>
            </li>
            <li className="vg-pdp__spec">
              <span className="vg-pdp__spec-key">
                <span className="vg-dot" aria-hidden />
                Availability:
              </span>
              <span className="vg-pdp__spec-val">
                {outOfStock
                  ? "Out of stock — order on request"
                  : maxQty
                    ? `${maxQty} in stock`
                    : "In stock"}
              </span>
            </li>
          </ul>

          <div className="vg-pdp__buy">
            {unpriced ? (
              <Link href="/contact" className="vg-btn">
                Request a price
                <ShoppingCart size={20} strokeWidth={1.6} aria-hidden />
              </Link>
            ) : (
              <>
                <label>
                  <span className="sr-only">Quantity</span>
                  <input
                    type="number"
                    className="vg-qty"
                    min={1}
                    max={maxQty}
                    value={qty}
                    disabled={outOfStock}
                    onChange={(event) => setQty(Math.max(1, Number(event.target.value) || 1))}
                  />
                </label>
                <button
                  type="button"
                  className="vg-btn"
                  disabled={outOfStock}
                  onClick={() => addProduct(product, qty)}
                >
                  {outOfStock ? "Out of stock" : "Add to cart"}
                  <ShoppingCart size={20} strokeWidth={1.6} aria-hidden />
                </button>
              </>
            )}
          </div>
          <p className="vg-pdp__note">
            {unpriced
              ? "This part is not priced online yet — send us the details and we will quote you."
              : "Delivery nationwide, or fitment at the Abuja workshop."}
          </p>
        </div>

        <hr className="vg-rule" />

        <dl className="vg-pdp__meta">
          <div>
            <dt>SKU:</dt>
            <dd>{product.sku ?? product.id}</dd>
          </div>
          <div>
            <dt>Categories:</dt>
            <dd>
              <Link href={`/shop?q=${encodeURIComponent(product.category)}#shop-catalog`}>
                {category}
              </Link>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
