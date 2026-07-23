"use client";

import { useQuery } from "@tanstack/react-query";
import { ExpenseViewModal } from "@/components/organisms/ExpenseViewModal";
import { RecordViewModal } from "@/components/organisms/RecordViewModal";
import { getExpense } from "@/lib/api/expenses";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import {
  MODAL_RECORD_STALE_MS,
  modalKeys,
} from "@/lib/query/modalQueryKeys";

export function ExpenseRecordModal({
  expenseId,
  onClose,
}: {
  expenseId: string | null;
  onClose: () => void;
}) {
  const { tenantId } = useRouteTenant();

  const { data: expense, isLoading, error } = useQuery({
    queryKey: modalKeys.expense(tenantId, expenseId),
    queryFn: () => getExpense(tenantId!, expenseId!),
    enabled: Boolean(tenantId && expenseId),
    staleTime: MODAL_RECORD_STALE_MS,
  });

  if (isLoading || error || !expense) {
    return (
      <RecordViewModal
        open={Boolean(expenseId)}
        title="Expense details"
        onClose={onClose}
        isLoading={isLoading}
        error={error ? "Could not load this expense." : null}
      >
        {null}
      </RecordViewModal>
    );
  }

  return <ExpenseViewModal expense={expense} onClose={onClose} />;
}
