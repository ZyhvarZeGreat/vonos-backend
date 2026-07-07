"use client";

import Link from "next/link";
import type { OverviewPanel } from "@vonos/types";
import { CompactDataPanel } from "@/components/organisms/CompactDataPanel";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import type { TenantCode } from "@/lib/registries/tenants";

interface EntityOverviewPanelsProps {
  panels: OverviewPanel[];
  tenantCode: TenantCode;
}

export function EntityOverviewPanels({ panels, tenantCode }: EntityOverviewPanelsProps) {
  if (panels.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {panels.map((panel) => (
        <div key={panel.id} className="space-y-2">
          <CompactDataPanel
            title={panel.title}
            subtitle="Latest records"
            rows={panel.rows.map((row, index) => ({
              id: String(row.id ?? `row-${index}`),
              ...row,
            }))}
            columns={panel.columns.map((col) => ({
              key: col.key,
              header: col.header,
              render:
                col.key === "amount"
                  ? (row) =>
                      formatCurrency(Number(row[col.key as keyof typeof row] ?? 0), "NGN")
                  : col.key === "status"
                    ? (row) => String(row[col.key as keyof typeof row] ?? "—")
                    : undefined,
            }))}
          />
          {panel.viewAllRoute ? (
            <Link
              href={`/${tenantCode}/${panel.viewAllRoute}`}
              className="text-sm font-medium text-primary hover:underline"
            >
              View all →
            </Link>
          ) : null}
        </div>
      ))}
    </div>
  );
}
