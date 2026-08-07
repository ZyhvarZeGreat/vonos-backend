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
  onApply,
  onClear,
  dirty = false,
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
  onApply?: () => void;
  onClear?: () => void;
  dirty?: boolean;
}) {
  const selectFields = fields.filter((field) => field.kind !== "search");
  const showDates = Boolean(onDateFromChange && onDateToChange);

  if (selectFields.length === 0 && !showDates) return null;

  return (
    <div className="row no-print">
      <div className="col-md-12">
        <UposFiltersPanel title="Filters" defaultOpen={defaultOpen}>
          <div className="row upos-report-filters-row">
            {selectFields.map((field) => (
              <div
                key={field.key}
                className="col-xs-12 col-sm-6 col-md-4 col-lg-3"
              >
                <div className="form-group">
                  <label htmlFor={`hq6-report-filter-${field.key}`}>
                    {field.label}:
                  </label>
                  <select
                    id={`hq6-report-filter-${field.key}`}
                    className="form-control select2"
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
              <div className="col-xs-12 col-sm-6 col-md-4 col-lg-3">
                <div className="form-group">
                  <label>Date Range:</label>
                  <div className="upos-report-date-range">
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
          {onApply ? (
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              {onClear ? (
                <button
                  type="button"
                  className="btn btn-default btn-sm"
                  onClick={onClear}
                >
                  Clear all
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onApply}
                disabled={!dirty}
              >
                Apply filters
              </button>
            </div>
          ) : null}
        </UposFiltersPanel>
      </div>
    </div>
  );
}
