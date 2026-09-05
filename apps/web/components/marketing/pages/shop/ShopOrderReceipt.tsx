"use client";

import { formatShopPrice, type ShopOrder } from "@/lib/marketing/shop-catalog";

type ShopOrderReceiptProps = {
  order: ShopOrder;
  id?: string;
};

function formatReceiptDate(iso?: string): string {
  const date = iso ? new Date(iso) : new Date();
  return date.toLocaleString("en-NG", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function fulfillmentLabel(order: ShopOrder): string {
  if (order.fulfillment === "fitment") return "Book fitment at Vonos";
  if (order.fulfillment === "delivery") return "Delivery";
  return "Workshop collection";
}

export default function ShopOrderReceipt({
  order,
  id = "shop-order-receipt",
}: ShopOrderReceiptProps) {
  return (
    <article id={id} className="shop-receipt" aria-label={`Receipt ${order.reference}`}>
      <header className="shop-receipt-header">
        <img
          src="/brand/vonos-autos-logo.png"
          alt="Vonos Autos"
          className="shop-receipt-logo"
        />
        <div className="shop-receipt-brand-meta">
          <h2 className="shop-receipt-title">Order receipt</h2>
          <p className="shop-receipt-subtitle">
            {order.paid ? "Paid via Paystack" : "Payment pending"}
          </p>
        </div>
      </header>

      <dl className="shop-receipt-meta-grid">
        <div>
          <dt>Reference</dt>
          <dd>{order.reference}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd>{formatReceiptDate(order.createdAt)}</dd>
        </div>
        <div>
          <dt>Customer</dt>
          <dd>{order.customer.name}</dd>
        </div>
        <div>
          <dt>Contact</dt>
          <dd>
            {order.customer.phone}
            <br />
            {order.customer.email}
          </dd>
        </div>
        <div>
          <dt>Vehicle</dt>
          <dd>{order.customer.registration || "—"}</dd>
        </div>
        <div>
          <dt>Fulfilment</dt>
          <dd>{fulfillmentLabel(order)}</dd>
        </div>
      </dl>

      <table className="shop-receipt-table">
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col">Qty</th>
            <th scope="col">Unit</th>
            <th scope="col">Line total</th>
          </tr>
        </thead>
        <tbody>
          {order.lines.map((line) => (
            <tr key={line.productId}>
              <td>{line.name}</td>
              <td>{line.qty}</td>
              <td>{formatShopPrice(line.unitPrice)}</td>
              <td>{formatShopPrice(line.unitPrice * line.qty)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3}>
              <strong>Total (parts)</strong>
            </td>
            <td>
              <strong>{formatShopPrice(order.total)}</strong>
            </td>
          </tr>
        </tfoot>
      </table>

      {order.notes ? <p className="shop-receipt-notes">Notes: {order.notes}</p> : null}

      <footer className="shop-receipt-footer">
        <p>Vonos Autos · VSP parts marketplace · Abuja, Nigeria</p>
        <p>Keep this receipt for delivery, fitment booking, and order records.</p>
      </footer>
    </article>
  );
}

export function printShopReceipt(receiptId = "shop-order-receipt"): void {
  const node = document.getElementById(receiptId);
  if (!node) {
    window.print();
    return;
  }

  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=800,height=900");
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Receipt</title>
  <link rel="stylesheet" href="/styles/vonos-theme.css" />
  <style>
    body { margin: 0; padding: 1.5rem; background: #fff; font-family: system-ui, sans-serif; }
    .shop-receipt { max-width: 720px; margin: 0 auto; }
  </style>
</head>
<body>${node.outerHTML}</body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  printWindow.onload = () => {
    printWindow.print();
    printWindow.close();
  };
}
