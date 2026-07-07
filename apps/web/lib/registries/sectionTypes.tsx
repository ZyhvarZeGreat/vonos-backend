import type { BusinessLocation, Item, StockMovement, Supplier } from "@vonos/types";
import {
  businessLocationName,
  formatItemLocationLine,
} from "@/lib/utils/locationLabels";
import type React from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";

export type SectionType =
  | "stockInfo"
  | "pricing"
  | "movementHistory"
  | "supplierInfo"
  | "historyFeed"
  | "genericFields"
  | "variantMatrix";

export interface HistoryFeedEntry {
  id: string;
  title: string;
  subtitle?: string;
  date: string;
  status?: string;
  actorName?: string;
  action?: string;
  href?: string;
}

export interface GenericField {
  label: string;
  value: string;
}

export interface VariantCell {
  size: string;
  color: string;
  quantity: number;
}

export interface SectionInstance {
  type: SectionType;
  title: string;
  data: unknown;
}

interface SectionRendererProps {
  title: string;
  data: unknown;
}

function FieldGrid({ fields }: { fields: { label: string; value: string }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-4">
      {fields.map((field) => (
        <div key={field.label}>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">
            {field.label}
          </dt>
          <dd className="mt-1 text-sm text-foreground">{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function StockInfoSection({ title, data }: SectionRendererProps) {
  const payload = data as Item | { item: Item; businessLocations?: BusinessLocation[] };
  const item = "item" in payload ? payload.item : payload;
  const locations = "item" in payload ? payload.businessLocations : undefined;
  const branch = businessLocationName(item.locationCode, locations);

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-card">
      <h3 className="mb-4 text-base font-semibold">{title}</h3>
      <FieldGrid
        fields={[
          { label: "SKU", value: item.sku },
          { label: "Category", value: item.category ?? "—" },
          { label: "Quantity", value: String(item.quantity) },
          { label: "Branch / site", value: branch ?? "—" },
          { label: "Counter / bin", value: item.binLocation ?? "—" },
          { label: "Full location", value: formatItemLocationLine(item, locations) },
          { label: "Reorder Point", value: String(item.reorderPoint ?? "—") },
          { label: "Status", value: item.status.replace(/_/g, " ") },
        ]}
      />
      {(item.locationStock?.length ?? 0) > 0 ? (
        <div className="mt-5">
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
            Stock by location
          </h4>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted">
                <th className="py-1.5 pr-3 font-medium">Branch</th>
                <th className="py-1.5 pr-3 font-medium">Counter / bin</th>
                <th className="py-1.5 font-medium text-right">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {item.locationStock.map((row, index) => (
                <tr key={`${row.locationCode}-${row.binLocation ?? ""}-${index}`} className="border-b border-border/50">
                  <td className="py-1.5 pr-3 text-foreground">
                    {businessLocationName(row.locationCode, locations) ?? row.locationCode}
                  </td>
                  <td className="py-1.5 pr-3 text-muted">{row.binLocation ?? "—"}</td>
                  <td className="py-1.5 text-right text-foreground">{row.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function PricingSection({ title, data }: SectionRendererProps) {
  const item = data as Item;
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-card">
      <h3 className="mb-4 text-base font-semibold">{title}</h3>
      <FieldGrid
        fields={[
          {
            label: "Cost Price",
            value: formatCurrency(item.costPrice, item.currency),
          },
          { label: "Currency", value: item.currency },
          {
            label: "Stock Value",
            value: formatCurrency(item.costPrice * item.quantity, item.currency),
          },
          {
            label: "Retail Available",
            value: item.availableForRetail ? "Yes" : "No",
          },
        ]}
      />
    </section>
  );
}

function MovementHistorySection({ title, data }: SectionRendererProps) {
  const movements = data as StockMovement[];
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-card">
      <h3 className="mb-4 text-base font-semibold">{title}</h3>
      {movements.length === 0 ? (
        <p className="text-sm text-muted">No movement history yet.</p>
      ) : (
        <ul className="space-y-3">
          {movements.map((movement) => (
            <li
              key={movement.id}
              className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium">{movement.reference}</p>
                <p className="text-xs text-muted capitalize">{movement.type}</p>
              </div>
              <span className="text-xs text-muted">{movement.status}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SupplierInfoSection({ title, data }: SectionRendererProps) {
  const supplier = data as Supplier;
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-card">
      <h3 className="mb-4 text-base font-semibold">{title}</h3>
      <FieldGrid
        fields={[
          { label: "Name", value: supplier.name },
          { label: "Contact", value: supplier.contactName ?? "—" },
          { label: "Email", value: supplier.email ?? "—" },
          { label: "Phone", value: supplier.phone ?? "—" },
        ]}
      />
    </section>
  );
}

function HistoryFeedSection({ title, data }: SectionRendererProps) {
  const entries = data as HistoryFeedEntry[];
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-card">
      <h3 className="mb-4 text-base font-semibold">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-muted">No history yet.</p>
      ) : (
        <ul className="space-y-4">
          {entries.map((entry) => (
            <li key={entry.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  {entry.href ? (
                    <Link
                      href={entry.href}
                      className="text-sm font-medium text-brand hover:underline"
                    >
                      {entry.title}
                    </Link>
                  ) : (
                    <p className="text-sm font-medium text-foreground">{entry.title}</p>
                  )}
                  {entry.subtitle ? (
                    <p className="mt-0.5 text-xs text-muted">{entry.subtitle}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-xs text-muted">{formatDate(entry.date)}</span>
              </div>
              {entry.status ? (
                <p className="mt-2 text-xs font-medium text-muted">{entry.status}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function GenericFieldsSection({ title, data }: SectionRendererProps) {
  const fields = data as GenericField[];
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-card">
      <h3 className="mb-4 text-base font-semibold">{title}</h3>
      <FieldGrid fields={fields} />
    </section>
  );
}

function VariantMatrixSection({ title, data }: SectionRendererProps) {
  const cells = data as VariantCell[];
  const sizes = [...new Set(cells.map((c) => c.size))];
  const colors = [...new Set(cells.map((c) => c.color))];

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-card">
      <h3 className="mb-4 text-base font-semibold">{title}</h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-medium text-muted">Size \\ Color</th>
              {colors.map((color) => (
                <th key={color} className="px-3 py-2 text-center font-medium text-foreground">
                  <span className="inline-flex items-center justify-center gap-1.5">
                    <span
                      className="inline-block h-3 w-3 rounded-full border border-border"
                      style={{
                        backgroundColor:
                          color === "Navy"
                            ? "#1e3a5f"
                            : color === "Pink"
                              ? "#f472b6"
                              : "#f8fafc",
                      }}
                    />
                    {color}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sizes.map((size) => (
              <tr key={size} className="border-b border-border last:border-0">
                <td className="px-3 py-2 font-medium text-muted">{size}</td>
                {colors.map((color) => {
                  const cell = cells.find((c) => c.size === size && c.color === color);
                  return (
                    <td key={color} className="px-3 py-2 text-center">
                      {cell ? (
                        <span
                      className={
                        cell.quantity === 0
                          ? "text-muted line-through"
                          : cell.quantity < 5
                            ? "rounded bg-warning-bg px-1.5 py-0.5 text-warning"
                            : "text-foreground"
                      }
                        >
                          {cell.quantity}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export const sectionRenderers: Record<
  SectionType,
  React.ComponentType<SectionRendererProps>
> = {
  stockInfo: StockInfoSection,
  pricing: PricingSection,
  movementHistory: MovementHistorySection,
  supplierInfo: SupplierInfoSection,
  historyFeed: HistoryFeedSection,
  genericFields: GenericFieldsSection,
  variantMatrix: VariantMatrixSection,
};
