"use client";

import { Select } from "@/components/atoms/Select";
import type { ReportFilterField } from "@/lib/registries/reportTableUi";
import type { ReportRunOptions } from "@vonos/types";

export interface ReportFilterOptionSets {
  customers: Array<{ value: string; label: string }>;
  customerGroups: Array<{ value: string; label: string }>;
  locations: Array<{ value: string; label: string }>;
  categories: Array<{ value: string; label: string }>;
  brands: Array<{ value: string; label: string }>;
  paymentMethods: Array<{ value: string; label: string }>;
  suppliers: Array<{ value: string; label: string }>;
}

const ALL = { value: "", label: "All" };

function optionsFor(
  field: ReportFilterField,
  sets: ReportFilterOptionSets,
): Array<{ value: string; label: string }> {
  if (field.kind === "search") return [];
  const source = field.optionsSource;
  switch (source) {
    case "customers":
      return [ALL, ...sets.customers];
    case "customerGroups":
      return [ALL, ...sets.customerGroups];
    case "locations":
      return [{ value: "", label: "Please Select" }, ...sets.locations];
    case "categories":
      return [ALL, ...sets.categories];
    case "brands":
      return [ALL, ...sets.brands];
    case "paymentMethods":
      return [ALL, ...sets.paymentMethods];
    case "suppliers":
      return [ALL, ...sets.suppliers];
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
}

export function ReportFilterShell({
  fields,
  values,
  onChange,
  optionSets,
}: {
  fields: ReportFilterField[];
  values: ReportRunOptions;
  onChange: (patch: Partial<ReportRunOptions>) => void;
  optionSets: ReportFilterOptionSets;
}) {
  // Search lives on the report table itself — keep only select filters here.
  const selectFields = fields.filter((field) => field.kind !== "search");
  if (selectFields.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-card">
      <h3 className="mb-3 text-sm font-semibold text-foreground">Filters</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {selectFields.map((field) => {
          const value = String(values[field.key] ?? "");
          return (
            <Select
              key={field.key}
              label={field.label}
              value={value}
              options={optionsFor(field, optionSets)}
              onChange={(e) =>
                onChange({ [field.key]: e.target.value } as Partial<ReportRunOptions>)
              }
            />
          );
        })}
      </div>
    </section>
  );
}
