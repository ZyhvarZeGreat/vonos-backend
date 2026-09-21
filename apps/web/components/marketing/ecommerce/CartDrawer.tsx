"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef } from "react";

import { formatShopLabel, formatShopPrice } from "@/lib/marketing/shop-catalog";
import { useShopCart } from "@/stores/shopCartStore";

export default function CartDrawer() {
  const { lines, total, cartDrawerOpen, closeCartDrawer, updateQty, removeLine } = useShopCart();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!cartDrawerOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeCartDrawer();
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [cartDrawerOpen, closeCartDrawer]);

  if (!cartDrawerOpen) return null;

  return (
    <div className="vg-page" data-node-id="85:110">
      <button
        type="button"
        className="vg-cart-overlay"
        aria-label="Close cart"
        onClick={closeCartDrawer}
      />
      <aside
        className="vg-cart"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <header className="vg-cart__head">
          <p id={titleId} className="vg-cart__title">
            Your Cart
          </p>
          <button
            ref={closeRef}
            type="button"
            className="vg-cart__close"
            aria-label="Close"
            onClick={closeCartDrawer}
          >
            <X size={16} strokeWidth={2} aria-hidden />
          </button>
        </header>

        <div className="vg-cart__list">
          {lines.length === 0 ? (
            <div className="vg-cart__empty">
              <p>Your cart is empty.</p>
              <Link href="/shop#shop-catalog" className="vg-btn" onClick={closeCartDrawer}>
                Browse parts
              </Link>
            </div>
          ) : (
            lines.map((line) => (
              <div key={line.productId} className="vg-cart__row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img className="vg-cart__thumb" src={line.product.icon} alt="" />
                <div className="vg-cart__info">
                  <div>
                    <p className="vg-cart__name">{formatShopLabel(line.product.name)}</p>
                    <p className="vg-cart__price">{formatShopPrice(line.product.price)}</p>
                    <button
                      type="button"
                      className="vg-cart__remove"
                      onClick={() => removeLine(line.productId)}
                    >
                      Remove
                    </button>
                  </div>
                  <label>
                    <span className="sr-only">Quantity for {line.product.name}</span>
                    <input
                      type="number"
                      min={1}
                      className="vg-qty"
                      value={line.qty}
                      onChange={(event) =>
                        updateQty(line.productId, Math.max(1, Number(event.target.value) || 1))
                      }
                    />
                  </label>
                </div>
              </div>
            ))
          )}
        </div>

        {lines.length > 0 ? (
          <footer className="vg-cart__foot">
            <div className="vg-cart__subtotal">
              <span>Subtotal</span>
              <span>{formatShopPrice(total)}</span>
            </div>
            <Link href="/shop/checkout" className="vg-btn vg-btn--block" onClick={closeCartDrawer}>
              Continue to Checkout
            </Link>
          </footer>
        ) : null}
      </aside>
    </div>
  );
}
