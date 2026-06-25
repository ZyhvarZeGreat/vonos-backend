"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { LedgerEntry, LedgerEntryType, LedgerSummary } from "@vonos/types";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";
import {
  buildLedgerReportSections,
  LEDGER_SECTION_LABELS,
  type LedgerCategoryGroup,
  sectionSubtotal,
} from "@/lib/utils/ledgerReportSheet";
import { cn } from "@/lib/utils/cn";

const SECTION_TYPES: LedgerEntryType[] = ["revenue", "cost", "expense"];

export interface FinanceReportSheetProps {
  title: string;
  subtitle: string;
  summary: LedgerSummary;
  entries: LedgerEntry[];
  generatedAt?: Date;
  onLineClick?: (entry: LedgerEntry) => void;
}

function CategoryBlock({
  type,
  group,
  currency,
  expanded,
  onToggle,
  onLineClick,
}: {
  type: LedgerEntryType;
  group: LedgerCategoryGroup;
  currency: string;
  expanded: boolean;
  onToggle: () => void;
  onLineClick?: (entry: LedgerEntry) => void;
}) {
  const isRevenue = type === "revenue";

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 bg-[var(--color-surface-muted)]/50 px-4 py-2.5 text-left text-sm font-medium hover:bg-[var(--color-surface-muted)]"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
        )}
        <span className="flex-1">{group.category}</span>
        <span className={cn("tabular-nums", isRevenue ? "text-emerald-600" : "text-foreground")}>
          {isRevenue ? "+" : "−"}
          {formatCurrency(group.subtotal, currency)}
        </span>
      </button>
      {expanded ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Description</th>
              <th className="px-4 py-2 text-right font-medium">Amount</th>
              <th className="px-4 py-2 font-medium">Source</th>
            </tr>
          </thead>
          <tbody>
            {group.lines.map((line) => (
              <tr
                key={line.id}
                className={cn(
                  "border-b border-border/60 last:border-b-0",
                  onLineClick && line.linkedRecordId && "cursor-pointer hover:bg-[var(--color-surface-muted)]",
                )}
                onClick={() => {
                  if (onLineClick && line.linkedRecordId) onLineClick(line);
                }}
              >
                <td className="px-4 py-2 text-muted">{formatDate(line.date)}</td>
                <td className="px-4 py-2">{line.description}</td>
                <td
                  className={cn(
                    "px-4 py-2 text-right tabular-nums",
                    isRevenue ? "text-emerald-600" : "text-foreground",
                  )}
                >
                  {isRevenue ? "+" : "−"}
                  {formatCurrency(line.amount, line.currency || currency)}
                </td>
                <td className="px-4 py-2 text-muted">
                  {line.linkedRecordType && line.linkedRecordId ? "Linked" : "Manual"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

export function FinanceReportSheet({
  title,
  subtitle,
  summary,
  entries,
  generatedAt = new Date(),
  onLineClick,
}: FinanceReportSheetProps) {
  const sections = useMemo(() => buildLedgerReportSections(entries), [entries]);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const currency = summary.currency;

  return (
    <div
      data-print-root
      className="overflow-hidden rounded-xl border border-border bg-card shadow-card print:border-0 print:shadow-none"
    >
      <div className="border-b border-border px-6 py-5 print:px-0">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
        <p className="mt-1 text-xs text-muted">
          Generated {formatDate(generatedAt)} · {entries.length} line
          {entries.length === 1 ? "" : "s"}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["Revenue", summary.revenue, "text-emerald-600"],
              ["Costs", summary.costs, "text-foreground"],
              ["Outstanding", summary.outstanding, "text-foreground"],
              ["Net", summary.net, summary.net >= 0 ? "text-emerald-600" : "text-error"],
            ] as const
          ).map(([label, value, colorClass]) => (
            <div key={label} className="rounded-lg border border-border bg-[var(--color-surface-muted)]/40 px-3 py-2">
              <p className="text-xs text-muted">{label}</p>
              <p className={cn("mt-0.5 text-sm font-semibold tabular-nums", colorClass)}>
                {formatCurrency(value, currency)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {SECTION_TYPES.map((type) => {
        const groups = sections[type];
        const subtotal = sectionSubtotal(groups);
        return (
          <section key={type} className="border-b border-border last:border-b-0">
            <div className="flex items-center justify-between bg-[var(--color-surface-muted)] px-4 py-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                {LEDGER_SECTION_LABELS[type]}
              </h3>
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  type === "revenue" ? "text-emerald-600" : "text-foreground",
                )}
              >
                {type === "revenue" ? "+" : "−"}
                {formatCurrency(subtotal, currency)}
              </span>
            </div>
            {groups.length === 0 ? (
              <p className="px-4 py-6 text-sm text-muted">No {LEDGER_SECTION_LABELS[type].toLowerCase()} entries.</p>
            ) : (
              groups.map((group) => {
                const key = `${type}:${group.category}`;
                return (
                  <CategoryBlock
                    key={key}
                    type={type}
                    group={group}
                    currency={currency}
                    expanded={expanded.has(key)}
                    onToggle={() => toggle(key)}
                    onLineClick={onLineClick}
                  />
                );
              })
            )}
          </section>
        );
      })}

      <div className="flex items-center justify-between bg-[var(--color-surface-muted)] px-6 py-4 font-semibold">
        <span className="text-sm text-foreground">Net profit</span>
        <span
          className={cn(
            "text-base tabular-nums",
            summary.net >= 0 ? "text-emerald-600" : "text-error",
          )}
        >
          {formatCurrency(summary.net, currency)}
        </span>
      </div>
    </div>
  );
}
