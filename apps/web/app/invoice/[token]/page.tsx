"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicInvoice } from "@/lib/api/publicInvoice";
import {
  formatHq6Currency,
  formatHq6Date,
  formatHq6DateTime,
  formatHq6PaymentMethod,
  formatHq6PaymentStatus,
} from "@/lib/utils/hq6Format";

export default function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["public-invoice", token],
    queryFn: () => getPublicInvoice(token),
    enabled: Boolean(token),
    retry: false,
  });

  return (
    <main className="min-h-screen bg-[#f3f4f6] px-4 py-8 text-[#111827]">
      <div className="mx-auto w-full max-w-3xl rounded-lg border border-[#e5e7eb] bg-white p-6 shadow-sm">
        {isLoading ? (
          <p className="text-sm text-[#6b7280]">Loading invoice…</p>
        ) : isError || !data ? (
          <p className="text-sm text-[#b91c1c]">Invoice not found.</p>
        ) : (
          <div className="space-y-6">
            <header className="space-y-1 border-b border-[#e5e7eb] pb-4">
              <h1 className="text-xl font-semibold">
                Invoice #{data.reference}
              </h1>
              <p className="text-sm text-[#6b7280]">
                {formatHq6Date(data.date)} ·{" "}
                {formatHq6PaymentStatus(data.paymentStatus)}
              </p>
            </header>

            <div className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="font-semibold">Customer</p>
                <p>{data.customerName}</p>
                {data.customerPhone ? <p>{data.customerPhone}</p> : null}
              </div>
              <div className="sm:text-right">
                <p className="font-semibold">{data.businessName}</p>
                {data.businessLocation ? <p>{data.businessLocation}</p> : null}
                {data.businessMobile ? <p>{data.businessMobile}</p> : null}
                {data.businessEmail ? <p>{data.businessEmail}</p> : null}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e5e7eb] text-left text-[#6b7280]">
                    <th className="pb-2 pr-3 font-medium">Product</th>
                    <th className="pb-2 pr-3 font-medium text-right">Qty</th>
                    <th className="pb-2 pr-3 font-medium text-right">Price</th>
                    <th className="pb-2 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.lines.map((line, index) => (
                    <tr key={`${line.sku}-${index}`} className="border-b border-[#f3f4f6]">
                      <td className="py-2 pr-3">
                        <div className="font-medium">{line.name}</div>
                        <div className="text-xs text-[#6b7280]">{line.sku}</div>
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {line.quantity}
                      </td>
                      <td className="py-2 pr-3 text-right tabular-nums">
                        {formatHq6Currency(line.unitPrice, data.currency)}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {formatHq6Currency(line.lineTotal, data.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-right text-base font-semibold">
              Total: {formatHq6Currency(data.total, data.currency)}
            </p>

            {data.payments.length > 0 ? (
              <div>
                <h2 className="mb-2 text-sm font-semibold">Payments</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#e5e7eb] text-left text-[#6b7280]">
                        <th className="pb-2 pr-3 font-medium">Date</th>
                        <th className="pb-2 pr-3 font-medium">Reference</th>
                        <th className="pb-2 pr-3 font-medium">Method</th>
                        <th className="pb-2 font-medium text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.payments.map((row) => (
                        <tr key={row.id} className="border-b border-[#f3f4f6]">
                          <td className="py-2 pr-3">
                            {row.paidOn ? formatHq6DateTime(row.paidOn) : "—"}
                          </td>
                          <td className="py-2 pr-3">{row.paymentRefNo ?? "—"}</td>
                          <td className="py-2 pr-3">
                            {formatHq6PaymentMethod(row.method)}
                          </td>
                          <td className="py-2 text-right tabular-nums">
                            {formatHq6Currency(row.amount, row.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
