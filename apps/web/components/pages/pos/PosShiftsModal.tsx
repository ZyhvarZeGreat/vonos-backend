"use client";

import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { getRegisterHistory, type CashRegisterView } from "@/lib/api/cashRegister";
import { PosModal } from "./PosModal";

function difference(reg: CashRegisterView): number {
  if (reg.closingAmount == null) return 0;
  return reg.closingAmount - (reg.openingBalance + reg.summary.cash);
}

export function PosShiftsModal({
  open,
  tenantId,
  onClose,
}: {
  open: boolean;
  tenantId: string;
  onClose: () => void;
}) {
  const history = useQuery({
    queryKey: ["pos-register-history", tenantId],
    enabled: open && Boolean(tenantId),
    queryFn: () => getRegisterHistory(tenantId),
  });

  const shifts = history.data ?? [];

  return (
    <PosModal
      open={open}
      title="Past Shifts"
      onClose={onClose}
      footer={
        <button type="button" className="cafe-pos-btn cafe-pos-btn--dark" onClick={onClose}>
          Close
        </button>
      }
    >
      {history.isLoading ? (
        <p className="cafe-pos-muted text-sm">Loading…</p>
      ) : shifts.length === 0 ? (
        <p className="cafe-pos-muted text-sm">No shifts yet.</p>
      ) : (
        <div>
          {shifts.map((shift) => {
            const diff = difference(shift);
            return (
              <div key={shift.id} className="cafe-pos-txn-row">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {new Date(shift.openedAt).toLocaleString()}
                  </p>
                  <p className="cafe-pos-muted text-xs">
                    {shift.status === "closed"
                      ? `Closed ${new Date(shift.closedAt ?? "").toLocaleString()}`
                      : "Open"}
                    {" · "}
                    Cash {formatCurrency(shift.summary.cash, "NGN")} ·{" "}
                    {shift.summary.salesCount} sales
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold tabular-nums text-foreground">
                    {formatCurrency(shift.openingBalance, "NGN")}
                  </p>
                  {shift.status === "closed" ? (
                    <p
                      className={`text-xs tabular-nums ${diff === 0 ? "text-muted" : diff > 0 ? "text-[#059669]" : "text-[var(--color-error-text)]"}`}
                    >
                      {diff >= 0 ? "+" : ""}
                      {formatCurrency(diff, "NGN")}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PosModal>
  );
}
