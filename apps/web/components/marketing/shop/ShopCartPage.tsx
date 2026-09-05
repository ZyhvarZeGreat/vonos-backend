"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, Trash2 } from "lucide-react";

import ShopOrderReview from "@/components/marketing/shop/ShopOrderReview";
import { formatShopPrice } from "@/lib/marketing/shop-catalog";
import { useShopCart } from "@/stores/shopCartStore";

export default function ShopCartPage() {
  const { lines, count, hydrated, updateQty, removeLine, resolveLine } = useShopCart();
  const [selectAll, setSelectAll] = useState(true);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!hydrated) return;
    const next: Record<string, boolean> = {};
    for (const line of lines) next[line.productId] = true;
    setSelected(next);
    setSelectAll(lines.length > 0);
  }, [hydrated, lines]);

  if (!hydrated) {
    return (
      <section className="ve-shop ve-shop-page">
        <div className="container-full">
          <p className="ve-thanks__note">Loading basket…</p>
        </div>
      </section>
    );
  }

  function toggleAll() {
    const next = !selectAll;
    setSelectAll(next);
    const map: Record<string, boolean> = {};
    for (const line of lines) map[line.productId] = next;
    setSelected(map);
  }

  return (
    <section className="ve-shop ve-shop-page" data-qa-section="shop-cart">
      <div className="container-full">
        <div className="breadcrumb-item" style={{ marginBottom: 16 }}>
          <Link href="/" className="breadcrumb-link text-black">
            Home
          </Link>
          <div className="breadcrumb-text text-black">/</div>
          <Link href="/shop" className="breadcrumb-link text-black">
            Shop
          </Link>
          <div className="breadcrumb-text text-black">/</div>
          <div className="breadcrumb-text text-gray-3">Cart</div>
        </div>

        <div className="ve-cart-layout">
          <div className="ve-shop-card ve-shop-card--pad-lg">
            <div className="ve-cart-header">
              <h1>Selected products</h1>
              <span>
                {count} {count === 1 ? "product" : "products"}
              </span>
            </div>

            {lines.length === 0 ? (
              <p className="ve-thanks__note">
                No items yet —{" "}
                <Link href="/shop#shop-catalog">browse parts</Link> and add to basket.
              </p>
            ) : (
              <>
                <div className="ve-cart-toolbar">
                  <label className="ve-cart-select-all">
                    <input type="checkbox" checked={selectAll} onChange={toggleAll} />
                    Select all
                  </label>
                  <div className="ve-cart-delivery">
                    <span className="ve-cart-delivery__label">Nearest delivery date:</span>
                    <span className="ve-shop-badge">Tomorrow</span>
                  </div>
                </div>

                <div className="ve-cart-cols-head" aria-hidden>
                  <span>Product</span>
                  <span>Price</span>
                  <span>Type</span>
                </div>

                {lines.map((line) => {
                  const resolved = resolveLine(line);
                  if (!resolved) return null;
                  const compareAt = Math.round(resolved.product.price * 1.2 * line.qty);
                  return (
                    <div key={line.productId} className="ve-cart-simple-row">
                      <div className="ve-cart-simple-row__product">
                        <input
                          type="checkbox"
                          checked={Boolean(selected[line.productId])}
                          onChange={(e) =>
                            setSelected((prev) => ({
                              ...prev,
                              [line.productId]: e.target.checked,
                            }))
                          }
                          aria-label={`Select ${resolved.product.name}`}
                        />
                        <div className="ve-cart-simple-row__thumb">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={resolved.product.icon} alt="" />
                        </div>
                        <div>
                          <p className="ve-cart-simple-row__name">{resolved.product.name}</p>
                          <p className="ve-cart-simple-row__meta">
                            {resolved.product.sku
                              ? `SKU ${resolved.product.sku}`
                              : resolved.product.category}
                          </p>
                        </div>
                      </div>
                      <div className="ve-cart-simple-row__price">
                        {formatShopPrice(resolved.subtotal)}
                        <div>
                          <s>{formatShopPrice(compareAt)}</s>
                        </div>
                      </div>
                      <div className="ve-cart-simple-row__type">
                        <select
                          className="ve-shop-select"
                          value={line.qty}
                          onChange={(e) => updateQty(line.productId, Number(e.target.value))}
                          aria-label={`Quantity for ${resolved.product.name}`}
                        >
                          {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className="ve-shop-btn ve-shop-btn--icon"
                          aria-label="Save for later"
                          tabIndex={-1}
                        >
                          <Heart className="ve-shop-lucide" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="ve-shop-btn ve-shop-btn--icon"
                          aria-label={`Remove ${resolved.product.name}`}
                          onClick={() => removeLine(line.productId)}
                        >
                          <Trash2 className="ve-shop-lucide" aria-hidden />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>

          <ShopOrderReview
            primaryHref="/shop/checkout"
            primaryLabel="Go to Checkout"
            secondaryHref="/shop#shop-catalog"
          />
        </div>
      </div>
    </section>
  );
}
