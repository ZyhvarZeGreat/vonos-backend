"use client";

import Link from "next/link";
import { Heart, ShoppingBag, Star } from "lucide-react";
import { useState } from "react";

import ShopBusyButton from "@/components/marketing/shop/ShopBusyButton";
import type { ShopProduct } from "@/lib/marketing/shop-catalog";
import { formatShopPrice } from "@/lib/marketing/shop-catalog";
import { useShopCart } from "@/stores/shopCartStore";

type ShopProductDetailProps = {
  product: ShopProduct;
};

export default function ShopProductDetail({ product }: ShopProductDetailProps) {
  const { addProduct } = useShopCart();
  const [qty, setQty] = useState(1);
  const [color, setColor] = useState("Standard");
  const [added, setAdded] = useState(false);
  const [adding, setAdding] = useState(false);
  const outOfStock = product.inStock === false;
  const compareAt = Math.round(product.price * 1.1);
  const bullets = [
    product.category ? `Category: ${product.category}` : "OE-spec quality",
    product.sku ? `SKU ${product.sku}` : "VSP marketplace stock",
    outOfStock ? "Currently unavailable" : "Ready for delivery",
    "Pay securely with Paystack",
  ];

  async function handleAdd() {
    if (outOfStock || adding) return;
    setAdding(true);
    try {
      addProduct(product, qty);
      setAdded(true);
      await new Promise((resolve) => window.setTimeout(resolve, 280));
      window.setTimeout(() => setAdded(false), 1600);
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="ve-pdp ve-shop">
      <div className="ve-pdp__gallery">
        <div className="ve-pdp__main-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={product.icon} alt={product.name} />
          <button
            type="button"
            className="ve-shop-btn ve-shop-btn--icon ve-pdp__wish"
            aria-label="Save for later"
            tabIndex={-1}
          >
            <Heart className="ve-shop-lucide--lg" aria-hidden />
          </button>
        </div>
        <div className="ve-pdp__thumbs" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <button key={i} type="button" className={`ve-pdp__thumb${i === 0 ? " is-active" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.icon} alt="" />
            </button>
          ))}
        </div>
      </div>

      <div className="ve-pdp__info">
        <div>
          <span className="ve-shop-badge">{product.category || "Part"}</span>
          <h1 className="ve-pdp__title">{product.name}</h1>
          <p className="ve-pdp__subtitle">{product.sku ? `SKU ${product.sku}` : "Vonos SP"}</p>
          <div className="ve-pdp__rating-row" aria-hidden>
            <span className="ve-pdp__stars">
              <Star className="ve-shop-lucide--star" aria-hidden />
              <Star className="ve-shop-lucide--star-empty" aria-hidden />
              <Star className="ve-shop-lucide--star-empty" aria-hidden />
              <Star className="ve-shop-lucide--star-empty" aria-hidden />
              <Star className="ve-shop-lucide--star-empty" aria-hidden />
              9.3
            </span>
            <span>Brand: Vonos</span>
          </div>
        </div>

        <div>
          <div className="ve-pdp__price-row">
            <p className="ve-pdp__price">{formatShopPrice(product.price)}</p>
            <p className="ve-pdp__compare">{formatShopPrice(compareAt)}</p>
          </div>
          <p className="ve-pdp__desc">
            {product.description ||
              "These parts match the OE-spec stock our workshop technicians use every day."}
          </p>
        </div>

        <ul className="ve-pdp__bullets">
          {bullets.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>

        <div className="ve-pdp__fields">
          <div className="ve-pdp__field">
            <label htmlFor="pdp-color">Type</label>
            <select
              id="pdp-color"
              className="ve-shop-select ve-shop-select--md"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            >
              <option>Standard</option>
              <option>Premium</option>
            </select>
          </div>
          <div className="ve-pdp__field">
            <label htmlFor="pdp-qty">Quantity</label>
            <select
              id="pdp-qty"
              className="ve-shop-select ve-shop-select--md"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              disabled={outOfStock}
            >
              {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="ve-pdp__ctas">
          <ShopBusyButton
            className="ve-shop-btn--primary"
            busy={adding}
            busyLabel="Adding…"
            disabled={outOfStock}
            onClick={() => void handleAdd()}
          >
            {outOfStock ? "Out of stock" : added ? "Added" : "Add to basket"}
          </ShopBusyButton>
          <Link href="/shop/cart" className="ve-shop-btn ve-shop-btn--secondary">
            <ShoppingBag className="ve-shop-lucide" aria-hidden />
            View cart
          </Link>
        </div>
      </div>
    </div>
  );
}
