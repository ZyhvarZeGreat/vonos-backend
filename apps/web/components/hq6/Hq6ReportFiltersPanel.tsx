"use client";

import { UposFiltersPanel } from "@/components/upos/UposFiltersPanel";
import type { ReportFilterOptionSets } from "@/components/organisms/ReportFilterShell";
import type { ReportFilterField } from "@/lib/registries/reportTableUi";
import type { ReportRunOptions } from "@vonos/types";

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

/**
 * HQ6 report Filters card (collapsible) — mirrors Ultimate POS filters.blade.php.
 */
export function Hq6ReportFiltersPanel({
  fields,
  values,
  optionSets,
  onChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  defaultOpen = true,
}: {
  fields: ReportFilterField[];
  values: ReportRunOptions;
  optionSets: ReportFilterOptionSets;
  onChange: (patch: Partial<ReportRunOptions>) => void;
  dateFrom?: string;
  dateTo?: string;
  onDateFromChange?: (value: string) => void;
  onDateToChange?: (value: string) => void;
  defaultOpen?: boolean;
}) {
  const selectFields = fields.filter((field) => field.kind !== "search");
  const showDates = Boolean(onDateFromChange && onDateToChange);

  if (selectFields.length === 0 && !showDates) return null;

  return (
    <div className="row no-print">
      <div className="col-md-12">
        <UposFiltersPanel title="Filters" defaultOpen={defaultOpen}>
          <div className="row">
            {selectFields.map((field) => (
              <div key={field.key} className="col-md-3">
                <div className="form-group">
                  <label htmlFor={`hq6-report-filter-${field.key}`}>
                    {field.label}:
                  </label>
                  <select
                    id={`hq6-report-filter-${field.key}`}
                    className="form-control"
                    value={String(values[field.key] ?? "")}
                    onChange={(e) =>
                      onChange({
                        [field.key]: e.target.value,
                      } as Partial<ReportRunOptions>)
                    }
                  >
                    {optionsFor(field, optionSets).map((opt) => (
                      <option key={`${field.key}-${opt.value}`} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
            {showDates ? (
              <div className="col-md-3">
                <div className="form-group">
                  <label>Date Range:</label>
                  <div className="input-group" style={{ gap: 4, display: "flex" }}>
                    <input
                      type="date"
                      className="form-control"
                      value={dateFrom ?? ""}
                      onChange={(e) => onDateFromChange?.(e.target.value)}
                      title="From"
                    />
                    <input
                      type="date"
                      className="form-control"
                      value={dateTo ?? ""}
                      onChange={(e) => onDateToChange?.(e.target.value)}
                      title="To"
                    />
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </UposFiltersPanel>
      </div>
    </div>
  );
}
