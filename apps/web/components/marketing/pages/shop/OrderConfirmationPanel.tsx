"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Copy, Truck } from "lucide-react";
import { useEffect, useState } from "react";

import ShopOrderReceipt, { printShopReceipt } from "@/components/marketing/pages/shop/ShopOrderReceipt";
import {
  loadOrderFromStorage,
  saveOrderToStorage,
  type ShopOrder,
} from "@/lib/marketing/shop-catalog";
import {
  confirmStoreOrder,
  fetchStoreOrder,
  type StoreOrderResponse,
} from "@/lib/marketing/store-api";

function toShopOrder(api: StoreOrderResponse, fallback?: ShopOrder | null): ShopOrder {
  return {
    reference: api.reference,
    createdAt: api.createdAt,
    status: api.status,
    customer: {
      name: api.customerName || fallback?.customer.name || "Customer",
      email: api.customerEmail || fallback?.customer.email || "",
      phone: api.customerPhone || fallback?.customer.phone || "",
      registration: api.registration || fallback?.customer.registration || "",
    },
    fulfillment: api.fulfillment,
    notes: api.notes ?? fallback?.notes ?? "",
    lines: api.lines.map((line) => ({
      productId: line.itemId,
      name: line.name,
      qty: line.qty,
      unitPrice: Number(line.unitPrice),
    })),
    total: Number(api.total),
    paid: api.status === "paid" || Boolean(api.paidAt),
  };
}

export default function OrderConfirmationPanel() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("ref") ?? "";
  const [order, setOrder] = useState<ShopOrder | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [statusNote, setStatusNote] = useState("Confirming payment…");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!reference) {
      setLoaded(true);
      return;
    }

    const cached = loadOrderFromStorage(reference);
    let cancelled = false;

    (async () => {
      try {
        try {
          const confirmed = await confirmStoreOrder(reference);
          if (cancelled) return;
          const mapped = toShopOrder(confirmed, cached);
          setOrder(mapped);
          saveOrderToStorage(mapped);
          setStatusNote(
            mapped.paid
              ? "Payment confirmed — order is with the workshop."
              : "Order saved. Payment still pending.",
          );
        } catch {
          const remote = await fetchStoreOrder(reference);
          if (cancelled) return;
          const mapped = toShopOrder(remote, cached);
          setOrder(mapped);
          saveOrderToStorage(mapped);
          setStatusNote(
            mapped.paid
              ? "Payment confirmed — order is with the workshop."
              : "Waiting for Paystack confirmation. Refresh in a moment if you just paid.",
          );
        }
      } catch {
        if (cancelled) return;
        if (cached) {
          setOrder(cached);
          setStatusNote("Showing local copy — could not reach the API yet.");
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reference]);

  async function copyRef() {
    if (!order?.reference) return;
    try {
      await navigator.clipboard.writeText(order.reference);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  }

  if (!loaded) {
    return (
      <section className="ve-shop ve-shop-page">
        <div className="container-full">
          <p className="ve-thanks__note">{statusNote}</p>
        </div>
      </section>
    );
  }

  if (!order) {
    return (
      <section className="ve-shop ve-shop-page">
        <div className="container-full ve-thanks">
          <h1>Order not found</h1>
          <p className="ve-thanks__lead">
            We could not find that order reference. Start a new order from the shop.
          </p>
          <div className="ve-thanks__actions">
            <Link href="/shop" className="ve-shop-btn ve-shop-btn--primary ve-shop-btn--lg">
              Back to shop
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const trackHref = order.customer.registration
    ? `/track?name=${encodeURIComponent(order.customer.name)}&reg=${encodeURIComponent(order.customer.registration)}`
    : `/track?name=${encodeURIComponent(order.customer.name)}`;

  return (
    <section className="ve-shop ve-shop-page" data-qa-section="shop-confirmation">
      <div className="ve-thanks">
        <div className="ve-thanks__art">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/shop/thanks-illustration.png" alt="" />
        </div>

        <div>
          <h1>Thanks for your order!</h1>
          <p className="ve-thanks__lead">
            Your order will be sent to your address via the selected delivery service after
            confirmation by the workshop. You can track your order by order ID.
          </p>
          <p className="ve-thanks__note" style={{ marginTop: 12 }}>
            {statusNote}
          </p>

          <div className="ve-thanks__ref-row">
            <span className="ve-thanks__ref-label">Your order ID</span>
            <div className="ve-thanks__ref">
              <span>#{order.reference}</span>
              <button type="button" onClick={() => void copyRef()} aria-label="Copy order ID">
                <Copy className="ve-shop-lucide" aria-hidden />
              </button>
            </div>
            {copied ? <span className="ve-thanks__note">Copied</span> : null}
          </div>
        </div>

        <div className="ve-thanks__actions">
          <Link href="/" className="ve-shop-btn ve-shop-btn--secondary">
            <ArrowLeft className="ve-shop-lucide" aria-hidden />
            Back to main page
          </Link>
          <Link href={trackHref} className="ve-shop-btn ve-shop-btn--primary">
            <Truck className="ve-shop-lucide" aria-hidden />
            Track your order
          </Link>
        </div>

        <div className="shop-receipt-block shop-confirmation-print-hide" style={{ width: "100%" }}>
          <div className="shop-receipt-toolbar">
            <h2 className="heading-h5 no-margin-bottom">Receipt</h2>
            <button
              type="button"
              className="ve-shop-btn ve-shop-btn--secondary"
              onClick={() => printShopReceipt()}
            >
              Print / save PDF
            </button>
          </div>
          <ShopOrderReceipt order={order} />
        </div>
      </div>
    </section>
  );
}
