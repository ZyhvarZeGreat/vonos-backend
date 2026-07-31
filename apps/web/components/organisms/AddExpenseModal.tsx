"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { parseForm } from "@/lib/validation/parseForm";
import { expenseFormSchema } from "@/lib/validation/schemas";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Modal, ModalFooter, ModalHeader } from "@/components/atoms/Modal";
import { Select } from "@/components/atoms/Select";
import { getExpenseCategories } from "@/lib/api/expenses";
import { createManualExpense } from "@/lib/api/ledger";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { ENTITY_LIST } from "@/lib/registries/tenants";
import { useUiStore } from "@/stores/uiStore";

const FALLBACK_CATEGORIES = [
  { value: "MISCELLANEOUS", label: "MISCELLANEOUS" },
  { value: "other", label: "Other" },
];

export function AddExpenseModal() {
  const router = useRouter();
  const pathname = usePathname();
  const activeModal = useUiStore((state) => state.activeModal);
  const closeModal = useUiStore((state) => state.closeModal);
  const financeActionTenantId = useUiStore((state) => state.financeActionTenantId);
  const routeTenantId = useTenantId();
  const tenantId = financeActionTenantId ?? routeTenantId;
  const { tenantCode } = useRouteTenant();
  const queryClient = useQueryClient();
  const open = activeModal === "addExpense";
  const isHq6 = useIsVaHq6();
  const onAdmin = Boolean(pathname?.startsWith("/admin"));
  /** VAG finance bar: keep modal on Group admin (do not redirect into an entity app). */
  const stayInAdmin = onAdmin && Boolean(financeActionTenantId);

  const entityLabel = useMemo(() => {
    if (!tenantId) return null;
    const hit = ENTITY_LIST.find((e) => e.tenantId === tenantId);
    return hit ? hit.name.replace(/^Vonos\s+/i, "") : null;
  }, [tenantId]);

  const { data: dbCategories = [] } = useQuery({
    queryKey: ["expense-categories", tenantId],
    queryFn: () => getExpenseCategories(tenantId!),
    enabled: Boolean(open && tenantId),
  });

  const categoryOptions = useMemo(() => {
    if (dbCategories.length === 0) return FALLBACK_CATEGORIES;
    return dbCategories.map((c) => ({
      value: c.name,
      label: c.code ? `${c.name} (${c.code})` : c.name,
    }));
  }, [dbCategories]);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const first = categoryOptions[0]?.value;
    if (first && !categoryOptions.some((o) => o.value === category)) {
      setCategory(first);
    }
  }, [open, categoryOptions, category]);

  // HQ6 entity apps: Add Expense is a full page — except VAG admin in-place flow.
  useEffect(() => {
    if (!open || !isHq6 || stayInAdmin || !tenantCode) return;
    closeModal();
    router.push(`/${tenantCode}/add-expense`);
  }, [closeModal, isHq6, open, router, stayInAdmin, tenantCode]);

  const mutation = useAppMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No business selected");
      const valid = parseForm(expenseFormSchema, {
        amount,
        description,
        category,
        date,
      });
      if (!valid) {
        throw new Error("Enter a valid amount and description");
      }
      const parsed = Number(valid.amount);
      return createManualExpense(tenantId, {
        type: "expense",
        amount: parsed,
        category,
        description: String(valid.description).trim(),
        date,
      });
    },
    successMessage: entityLabel
      ? `Expense added for ${entityLabel}`
      : "Expense added to ledger",
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

  if (!open || (isHq6 && !stayInAdmin)) return null;

  return (
    <Modal open={open} onClose={handleClose}>
      <ModalHeader
        title="Add Expense"
        subtitle={
          entityLabel
            ? `Posting to ${entityLabel} ledger`
            : "Record a manual expense in the ledger"
        }
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
        />
        <Select
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          options={categoryOptions}
        />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Input
          label="Date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
      <ModalFooter>
        <Button variant="ghost" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || !tenantId}
        >
          {mutation.isPending ? "Saving…" : "Add expense"}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
