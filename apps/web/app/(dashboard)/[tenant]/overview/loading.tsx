"use client";

import { Spinner } from "@/components/atoms/Spinner";
import { KpiRow } from "@/components/organisms/KpiRow";

const PLACEHOLDER_CARDS = [
  { label: "Revenue", icon: "wallet" as const, metricKey: "revenue", color: "#059669" },
  { label: "Orders", icon: "package" as const, metricKey: "orders", color: "#2563eb" },
  { label: "Customers", icon: "users" as const, metricKey: "customers", color: "#9333ea" },
  { label: "Net", icon: "calculator" as const, metricKey: "net", color: "#e11d48" },
];

export default function TenantOverviewLoading() {
  return (
    <div
      className="mx-auto space-y-6 p-4 sm:p-6"
      aria-busy
      aria-label="Loading overview"
    >
      <KpiRow
        cards={PLACEHOLDER_CARDS}
        values={{
          revenue: "0",
          orders: "0",
          customers: "0",
          net: "0",
        }}
        isLoading
        loadingDisplay="zero-spinner"
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-6">
          <p className="text-2xl font-semibold tabular-nums">0</p>
          <Spinner size="md" className="text-muted" />
          <p className="text-xs text-muted">Loading…</p>
        </div>
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-6">
          <p className="text-2xl font-semibold tabular-nums">0</p>
          <Spinner size="md" className="text-muted" />
          <p className="text-xs text-muted">Loading…</p>
        </div>
      </div>
    </div>
  );
}
