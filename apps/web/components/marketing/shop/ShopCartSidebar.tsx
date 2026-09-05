"use client";

import Link from "next/link";

import { formatShopPrice } from "@/lib/marketing/shop-catalog";

import { useShopCart } from "@/stores/shopCartStore";

type ShopCartSidebarProps = {
  checkoutHref?: string;
  checkoutLabel?: string;
  showContinueLink?: boolean;
};

export default function ShopCartSidebar({
  checkoutHref = "/shop/checkout",
  checkoutLabel = "Proceed to checkout",
  showContinueLink = true,
}: ShopCartSidebarProps) {
  const { lines, count, total, hydrated, updateQty, removeLine, resolveLine } = useShopCart();

  if (!hydrated) {
    return (
      <aside className="shop-cart-summary">
        <h2 className="shop-cart-title">Your basket</h2>
        <p className="shop-cart-empty">Loading basket…</p>
      </aside>
    );
  }

  return (
    <aside className="shop-cart-summary" aria-live="polite">
      <h2 className="shop-cart-title">Your basket ({count})</h2>

      {lines.length === 0 ? (
        <p className="shop-cart-empty">No items yet — browse parts and add to basket.</p>
      ) : (
        lines.map((line) => {
          const resolved = resolveLine(line);
          if (!resolved) return null;
          return (
            <div key={line.productId} className="shop-cart-line shop-cart-line--detailed">
              <div className="shop-cart-line-info">
                <span className="shop-cart-line-name">{resolved.product.name}</span>
                <span className="shop-cart-line-price">{formatShopPrice(resolved.subtotal)}</span>
              </div>
              <div className="shop-cart-qty">
                <button
                  type="button"
                  className="shop-qty-btn"
                  aria-label={`Decrease ${resolved.product.name}`}
                  onClick={() => updateQty(line.productId, line.qty - 1)}
                >
                  −
                </button>
                <span className="shop-qty-value">{line.qty}</span>
                <button
                  type="button"
                  className="shop-qty-btn"
                  aria-label={`Increase ${resolved.product.name}`}
                  onClick={() => updateQty(line.productId, line.qty + 1)}
                >
                  +
                </button>
                <button
                  type="button"
                  className="shop-remove-btn"
                  onClick={() => removeLine(line.productId)}
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })
      )}

      <div className="shop-cart-total">
        <span>Total</span>
        <span>{formatShopPrice(total)}</span>
      </div>

      <p className="shop-cart-note">
        Parts reserved when you checkout. We confirm by phone before any fitment work starts.
      </p>

      {lines.length > 0 ? (
        <Link href={checkoutHref} className="button-primary w-inline-block">
          <div className="button-title">{checkoutLabel}</div>
          <div className="button-hover-bg" />
        </Link>
      ) : null}

      {showContinueLink ? (
        <Link href="/shop#shop-catalog" className="shop-continue-link">
          Continue shopping
        </Link>
      ) : null}
    </aside>
  );
}
