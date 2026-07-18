"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Modal, ModalFooter, ModalHeader } from "@/components/atoms/Modal";
import { Select } from "@/components/atoms/Select";
import { createManualExpense } from "@/lib/api/ledger";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { useUiStore } from "@/stores/uiStore";

const EXPENSE_CATEGORIES = [
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "supplies", label: "Supplies" },
  { value: "payroll", label: "Payroll" },
  { value: "other", label: "Other" },
];

export function AddExpenseModal() {
  const activeModal = useUiStore((state) => state.activeModal);
  const closeModal = useUiStore((state) => state.closeModal);
  const financeActionTenantId = useUiStore((state) => state.financeActionTenantId);
  const routeTenantId = useTenantId();
  const tenantId = financeActionTenantId ?? routeTenantId;
  const queryClient = useQueryClient();
  const open = activeModal === "addExpense";

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  const mutation = useAppMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant selected");
      const parsed = Number(amount);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error("Enter a valid amount");
      }
      if (!description.trim()) throw new Error("Description is required");
      return createManualExpense(tenantId, {
        type: "expense",
        amount: parsed,
        category,
        description: description.trim(),
        date,
      });
    },
    successMessage: "Expense added to ledger",
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["ledgerEntries"] });
      await queryClient.invalidateQueries({ queryKey: ["ledgerTablePage"] });
      await queryClient.invalidateQueries({ queryKey: ["ledgerSummary"] });
      await queryClient.invalidateQueries({ queryKey: ["adminFinanceSummary"] });
      await queryClient.invalidateQueries({ queryKey: ["ledgerChartEntries"] });
      setAmount("");
      setDescription("");
      setError(null);
      closeModal();
    },
    onError: (err: Error) => setError(err.message),
  });

  const handleClose = () => {
    setError(null);
    closeModal();
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <ModalHeader
        title="Add Expense"
        subtitle="Record a manual expense in the ledger"
        onClose={handleClose}
      />
      <div className="space-y-3.5 px-4 pb-2">
        <Input
          label="Amount (NGN)"
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
        />
        <Select
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={EXPENSE_CATEGORIES}
        />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Monthly rent"
        />
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        {error ? <p className="text-sm text-error">{error}</p> : null}
      </div>
      <ModalFooter>
        <Button variant="secondary" size="sm" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          isLoading={mutation.isPending}
          loadingText="Saving…"
          onClick={() => mutation.mutate()}
        >
          Add Expense
        </Button>
      </ModalFooter>
    </Modal>
  );
}
