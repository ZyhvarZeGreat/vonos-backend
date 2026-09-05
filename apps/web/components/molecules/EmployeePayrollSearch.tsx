"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { matchSorter, rankings } from "match-sorter";
import { cn } from "@/lib/utils/cn";

export interface PayrollEmployeePick {
  id: string;
  employeeName: string;
  employeeId: string | null;
  locationCode: string | null;
  designationId: string | null;
  designationName: string | null;
  /** HR department from employee record (categories / essentials_department). */
  department: string | null;
  payrollGroupId: string | null;
  payrollGroupName: string | null;
}

export interface EmployeePayrollSearchProps {
  employees: PayrollEmployeePick[];
  selectedIds: string[];
  onToggle: (employee: PayrollEmployeePick) => void;
  isLoading?: boolean;
  placeholder?: string;
  className?: string;
  designationFilterId?: string;
}

const BROWSE_PREVIEW_LIMIT = 14;

/**
 * ProductItemSearch-style typeahead for Add Payroll.
 * Shows department (payroll group) + designation on each hit.
 */
export function EmployeePayrollSearch({
  employees,
  selectedIds,
  onToggle,
  isLoading = false,
  placeholder = "Search employees by name, ID, department, designation…",
  className,
  designationFilterId = "",
}: EmployeePayrollSearchProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const scoped = useMemo(() => {
    if (!designationFilterId) return employees;
    return employees.filter((e) => e.designationId === designationFilterId);
  }, [designationFilterId, employees]);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return scoped.slice(0, BROWSE_PREVIEW_LIMIT);
    return matchSorter(scoped, q, {
      keys: [
        "employeeName",
        "employeeId",
        "department",
        "designationName",
        "locationCode",
      ],
      threshold: rankings.CONTAINS,
      keepDiacritics: true,
    }).slice(0, 40);
  }, [query, scoped]);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div
      ref={rootRef}
      className={cn("hq6-product-search relative w-full min-w-0", className)}
    >
      <div className="hq6-product-search-field flex w-full min-w-0 items-stretch">
        <div
          className={cn(
            "hq6-product-search-control flex min-w-0 flex-1 items-center gap-2 border border-border bg-card px-3 py-0",
            open ? "rounded-t-lg border-b-transparent" : "rounded-lg",
          )}
        >
          <Search className="size-4 shrink-0 text-muted" aria-hidden />
          <input
            type="search"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-autocomplete="list"
            className="hq6-product-search-input min-w-0 flex-1 border-0 bg-transparent py-2.5 text-sm text-foreground outline-none placeholder:text-muted"
            placeholder={placeholder}
            value={query}
            disabled={isLoading}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
        </div>
        <button
          type="button"
          className="hq6-product-search-btn inline-flex shrink-0 items-center justify-center rounded-r-lg border border-[#2563eb] bg-[#2563eb] px-3 text-sm font-semibold text-white hover:border-[#1d4ed8] hover:bg-[#1d4ed8]"
          onClick={() => setOpen(true)}
        >
          Search
        </button>
      </div>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="hq6-product-search-dropdown absolute z-20 mt-0 max-h-96 w-full overflow-y-auto overscroll-contain rounded-b-lg border border-border bg-card py-1 shadow-lg"
        >
          {isLoading ? (
            <li className="px-3 py-3 text-sm text-muted">Loading employees…</li>
          ) : results.length === 0 ? (
            <li className="px-3 py-3 text-sm text-muted">
              {query.trim()
                ? `No employees match “${query.trim()}”.`
                : "No employees to show."}
            </li>
          ) : (
            results.map((employee) => {
              const checked = selected.has(employee.id);
              const department =
                employee.department?.trim() || "No department";
              return (
                <li key={employee.id} role="option" aria-selected={checked}>
                  <button
                    type="button"
                    className={cn(
                      "hq6-product-search-option flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm hover:bg-[var(--color-surface-muted)]",
                      checked && "bg-[var(--color-surface-muted)]",
                    )}
                    onClick={() => onToggle(employee)}
                  >
                    <span className="hq6-product-search-option-row flex items-start justify-between gap-2">
                      <span className="hq6-product-search-option-name font-medium text-foreground">
                        {employee.employeeName}
                        {checked ? (
                          <span className="ml-2 text-xs font-semibold text-emerald-700">
                            Selected
                          </span>
                        ) : null}
                      </span>
                      <span className="hq6-product-search-option-meta shrink-0 text-xs font-semibold text-[#2563eb]">
                        {department}
                      </span>
                    </span>
                    <span className="hq6-product-search-option-source text-xs text-muted">
                      {[
                        employee.employeeId,
                        employee.designationName
                          ? `Designation: ${employee.designationName}`
                          : null,
                        employee.locationCode,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </span>
                  </button>
                </li>
              );
            })
          )}
          {!query.trim() && scoped.length > BROWSE_PREVIEW_LIMIT ? (
            <li className="border-t border-border px-3 py-2 text-[11px] text-muted">
              Showing {BROWSE_PREVIEW_LIMIT} of {scoped.length} — type to search
              all
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
