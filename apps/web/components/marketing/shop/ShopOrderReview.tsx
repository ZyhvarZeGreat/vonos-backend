"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useMemo, useState } from "react";

import ShopBusyButton from "@/components/marketing/shop/ShopBusyButton";
import { formatShopPrice } from "@/lib/marketing/shop-catalog";
import { useShopCart } from "@/stores/shopCartStore";

type ShopOrderReviewProps = {
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  showPromo?: boolean;
  showLineItems?: boolean;
  onPrimaryClick?: () => void;
  primaryDisabled?: boolean;
  primaryBusy?: boolean;
  primaryType?: "link" | "submit" | "button";
};

export default function ShopOrderReview({
  primaryHref = "/shop/checkout",
  primaryLabel = "Proceed to Checkout",
  secondaryHref = "/shop",
  secondaryLabel = "Continue shopping",
  showPromo = true,
  showLineItems = false,
  onPrimaryClick,
  primaryDisabled,
  primaryBusy = false,
  primaryType = "link",
}: ShopOrderReviewProps) {
  const { lines, total, hydrated, resolveLine } = useShopCart();
  const [promo, setPromo] = useState("");
  const resolved = useMemo(
    () =>
      lines
        .map((line) => {
          const r = resolveLine(line);
          return r ? { ...r, productId: line.productId } : null;
        })
        .filter((row): row is NonNullable<typeof row> => row !== null),
    [lines, resolveLine],
  );

  const shipping = 0;
  const tax = 0;
  const discount = 0;
  const grandTotal = total + shipping + tax - discount;

  if (!hydrated) {
    return (
      <aside className="ve-order-review ve-shop">
        <h2>Order Review</h2>
        <p className="ve-thanks__note">Loading basket…</p>
      </aside>
    );
  }

  return (
    <aside className="ve-order-review ve-shop" aria-live="polite">
      <h2>Order Review</h2>

      {showPromo ? (
        <div className="ve-order-review__promo">
          <input
            type="text"
            placeholder="Promocode"
            aria-label="Promocode"
            value={promo}
            onChange={(e) => setPromo(e.target.value)}
          />
          <button type="button" className="ve-shop-btn ve-shop-btn--secondary">
            Apply
          </button>
        </div>
      ) : null}

      <div className="ve-order-review__delivery">
        <div className="ve-order-review__delivery-icon">
          <Check className="ve-shop-lucide--lg" aria-hidden />
        </div>
        <div>
          <strong>Free delivery to your door</strong>
          <p>Shipping is free on selected items</p>
        </div>
      </div>

      <hr className="ve-shop-divider" />

      <div className="ve-order-review__row">
        <span>Subtotal:</span>
        <span>{formatShopPrice(total)}</span>
      </div>

      <div className="ve-order-review__row">
        <span>Discount:</span>
        <div className="ve-order-review__discount">
          <span className="ve-shop-badge">0%</span>
          <span>- {formatShopPrice(discount)}</span>
        </div>
      </div>

      <div className="ve-order-review__row">
        <span>Shipping:</span>
        <span>{formatShopPrice(shipping)}</span>
      </div>

      <div className="ve-order-review__row">
        <span>Tax:</span>
        <span>+ {formatShopPrice(tax)}</span>
      </div>

      <hr className="ve-shop-divider" />

      <div className="ve-order-review__total">
        <span>Total:</span>
        <div className="ve-order-review__total-amount">
          <strong>{formatShopPrice(grandTotal)}</strong>
          <p className="ve-order-review__save">You will save {formatShopPrice(0)}</p>
        </div>
      </div>

      {showLineItems && resolved.length > 0 ? (
        <div className="ve-order-review__items">
          {resolved.map((row) => (
            <div key={row.productId} className="ve-order-review__item">
              <div className="ve-order-review__item-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={row.product.icon} alt="" />
              </div>
              <div className="ve-order-review__item-copy">
                <strong>{row.product.name}</strong>
                <span>
                  Qty {row.qty} · {formatShopPrice(row.subtotal)}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="ve-order-review__actions">
        {primaryType === "submit" || primaryType === "button" ? (
          <ShopBusyButton
            type={primaryType === "submit" ? "submit" : "button"}
            className="ve-shop-btn--primary ve-shop-btn--lg"
            busy={primaryBusy}
            busyLabel={primaryLabel}
            disabled={primaryDisabled || lines.length === 0}
            onClick={onPrimaryClick}
          >
            {primaryLabel}
          </ShopBusyButton>
        ) : (
          <Link
            href={lines.length === 0 ? "/shop" : primaryHref}
            className="ve-shop-btn ve-shop-btn--primary ve-shop-btn--lg"
            aria-disabled={lines.length === 0}
          >
            {primaryLabel}
          </Link>
        )}
        <Link href={secondaryHref} className="ve-shop-btn ve-shop-btn--secondary ve-shop-btn--lg">
          {secondaryLabel}
        </Link>
      </div>
    </aside>
  );
}
