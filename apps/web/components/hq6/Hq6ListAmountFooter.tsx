import { formatHq6Currency } from "@/lib/utils/hq6Format";

export type Hq6AmountFooterCell = {
  label?: string;
  amount: number;
  currency?: string;
  widthClass?: string;
};

export function Hq6ListAmountFooter({
  title = "Page total",
  cells,
}: {
  title?: string;
  cells: Hq6AmountFooterCell[];
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-1 border-t border-[var(--hq6-border)] bg-[#f9fafb] px-3 py-2 text-xs font-bold text-[#374151]">
      <span className="mr-auto text-[#6b7280]">{title}</span>
      {cells.map((cell, index) => (
        <div
          key={`${cell.label ?? "amt"}-${index}`}
          className={cell.widthClass ?? "min-w-[7.5rem] text-right tabular-nums"}
        >
          {cell.label ? (
            <span className="mr-2 font-semibold text-[#6b7280]">{cell.label}</span>
          ) : null}
          {formatHq6Currency(Number.isFinite(cell.amount) ? cell.amount : 0, cell.currency)}
        </div>
      ))}
    </div>
  );
}
