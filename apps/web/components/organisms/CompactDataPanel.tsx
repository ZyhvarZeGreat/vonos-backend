"use client";

import { StatusPill } from "@/components/atoms/StatusPill";
import type { StatusVocabulary } from "@/lib/registries/statusVocabularies";
import { formatTableCellValue } from "@/lib/utils/formatDisplay";
import { cn } from "@/lib/utils/cn";

export interface CompactDataColumn<T> {
  key: keyof T | string;
  header: string;
  align?: "left" | "right";
  render?: (row: T) => React.ReactNode;
}

export interface CompactDataPanelProps<T extends { id: string }> {
  title: string;
  subtitle?: string;
  columns: CompactDataColumn<T>[];
  rows: T[];
  statusVocabulary?: StatusVocabulary;
  className?: string;
}

export function CompactDataPanel<T extends { id: string }>({
  title,
  subtitle,
  columns,
  rows,
  className,
}: CompactDataPanelProps<T>) {
  return (
    <section
      className={cn(
        "flex h-full flex-col rounded-xl border border-border bg-card p-6 shadow-sm",
        className,
      )}
    >
      <div className="mb-4">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    "pb-2 font-medium",
                    col.align === "right" && "text-right",
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-border last:border-0">
                {columns.map((col) => (
                  <td
                    key={String(col.key)}
                    className={cn(
                      "py-2.5",
                      col.align === "right" && "text-right",
                    )}
                  >
                    {col.render
                      ? col.render(row)
                      : formatTableCellValue(
                          String(col.key),
                          row as Record<string, unknown>,
                        )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function renderStatusCell(status: string, vocabulary: StatusVocabulary) {
  return <StatusPill status={status} vocabulary={vocabulary} />;
}
