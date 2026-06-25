import type { LedgerEntry, LedgerEntryType, LedgerSummary } from "@vonos/types";

export interface LedgerCategoryGroup {
  category: string;
  subtotal: number;
  lines: LedgerEntry[];
}

export interface LedgerReportSections {
  revenue: LedgerCategoryGroup[];
  cost: LedgerCategoryGroup[];
  expense: LedgerCategoryGroup[];
}

const SECTION_ORDER: LedgerEntryType[] = ["revenue", "cost", "expense"];

export const LEDGER_SECTION_LABELS: Record<LedgerEntryType, string> = {
  revenue: "Revenue",
  cost: "Costs",
  expense: "Expenses",
};

function groupByCategory(entries: LedgerEntry[]): LedgerCategoryGroup[] {
  const map = new Map<string, LedgerEntry[]>();
  for (const entry of entries) {
    const key = entry.category || "Uncategorized";
    const list = map.get(key) ?? [];
    list.push(entry);
    map.set(key, list);
  }

  return Array.from(map.entries())
    .map(([category, lines]) => ({
      category,
      subtotal: lines.reduce((sum, line) => sum + line.amount, 0),
      lines: lines.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      ),
    }))
    .sort((a, b) => b.subtotal - a.subtotal);
}

export function buildLedgerReportSections(entries: LedgerEntry[]): LedgerReportSections {
  const byType = new Map<LedgerEntryType, LedgerEntry[]>();
  for (const type of SECTION_ORDER) {
    byType.set(type, []);
  }

  for (const entry of entries) {
    const bucket = byType.get(entry.type);
    if (bucket) bucket.push(entry);
  }

  return {
    revenue: groupByCategory(byType.get("revenue") ?? []),
    cost: groupByCategory(byType.get("cost") ?? []),
    expense: groupByCategory(byType.get("expense") ?? []),
  };
}

export function sectionSubtotal(groups: LedgerCategoryGroup[]): number {
  return groups.reduce((sum, group) => sum + group.subtotal, 0);
}

export function flattenLedgerSectionsForExport(
  sections: LedgerReportSections,
  currency: string,
): Array<Record<string, string | number>> {
  const rows: Array<Record<string, string | number>> = [];

  for (const type of SECTION_ORDER) {
    const groups = sections[type];
    for (const group of groups) {
      for (const line of group.lines) {
        rows.push({
          section: LEDGER_SECTION_LABELS[type],
          category: group.category,
          date: line.date,
          description: line.description,
          type: line.type,
          amount: line.amount,
          currency: line.currency || currency,
        });
      }
    }
  }

  return rows;
}

export function formatLedgerSummaryLine(summary: LedgerSummary): string {
  return `Revenue ${summary.revenue} · Costs ${summary.costs} · Net ${summary.net}`;
}
