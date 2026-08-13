"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { parseForm } from "@/lib/validation/parseForm";
import { expenseFormSchema } from "@/lib/validation/schemas";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Modal, ModalFooter, ModalHeader } from "@/components/atoms/Modal";
import { AsyncMenuSelect } from "@/components/molecules/AsyncMenuSelect";
import {
  createExpense,
  expenseCategoriesPickerHasMore,
  getExpenseCategoriesForPicker,
  loadMoreExpenseCategoriesForPicker,
  prefetchExpenseCategoriesForPicker,
} from "@/lib/api/expenses";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { ENTITY_LIST } from "@/lib/registries/tenants";
import { useUiStore } from "@/stores/uiStore";
import { tenantBasePath } from "@/lib/utils/tenantMount";

function categoryLabel(c: { name: string; code?: string | null }) {
  return c.code ? `${c.name} (${c.code})` : c.name;
}

export function AddExpenseModal() {
  const router = useRouter();
  const pathname = usePathname();
  const activeModal = useUiStore((state) => state.activeModal);
  const closeModal = useUiStore((state) => state.closeModal);
  const financeActionTenantId = useUiStore((state) => state.financeActionTenantId);
  const routeTenantId = useTenantId();
  const tenantId = financeActionTenantId ?? routeTenantId;
  const { tenantCode } = useRouteTenant();
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

  const loadCategoryOptions = useCallback(
    async (query: string) => {
      if (!tenantId) return { options: [], hasMore: false };
      const rows = await getExpenseCategoriesForPicker(
        tenantId,
        query || undefined,
      );
      return {
        options: rows.map((c) => ({
          value: c.id,
          label: categoryLabel(c),
        })),
        hasMore: !query.trim() && expenseCategoriesPickerHasMore(tenantId),
      };
    },
    [tenantId],
  );

  const loadMoreCategoryOptions = useCallback(async () => {
    if (!tenantId) return { options: [], hasMore: false, append: true };
    const page = await loadMoreExpenseCategoriesForPicker(tenantId);
    return {
      options: page.appended.map((c) => ({
        value: c.id,
        label: categoryLabel(c),
      })),
      hasMore: page.hasMore,
      append: true,
    };
  }, [tenantId]);

  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !tenantId) return;
    void prefetchExpenseCategoriesForPicker(tenantId);
  }, [open, tenantId]);

  // HQ6 entity apps: Add Expense is a full page — except VAG admin in-place flow.
  useEffect(() => {
    if (!open || !isHq6 || stayInAdmin || !tenantCode) return;
    closeModal();
    router.push(`${tenantBasePath(tenantCode)}/add-expense`);
  }, [closeModal, isHq6, open, router, stayInAdmin, tenantCode]);

  const handleClose = () => {
    setAmount("");
    setCategoryId("");
    setCategoryName("");
    setDescription("");
    setDate(new Date().toISOString().slice(0, 10));
    setError(null);
    closeModal();
  };

  const mutation = useAppMutation({
    mutationFn: async () => {
      if (!tenantId) throw new Error("No tenant");
      const name =
        categoryName.replace(/\s*\([^)]*\)\s*$/, "").trim() || categoryName;
      const parsed = parseForm(
        expenseFormSchema,
        {
          amount,
          category: name,
          description,
          date,
        },
        { setError },
      );
      if (!parsed) throw new Error("Please check the form and try again.");
      return createExpense(tenantId, {
        totalAmount: Number(parsed.amount),
        categoryId: categoryId || undefined,
        note: parsed.description || undefined,
        expenseDate: parsed.date,
        paymentStatus: "due",
      });
    },
    successMessage: "Expense added",
    onSuccess: () => {
      handleClose();
      if (stayInAdmin) return;
      if (isHq6 && tenantCode) {
        router.push(`${tenantBasePath(tenantCode)}/list-expenses`);
        return;
      }
      router.push("/VW/finance?tab=ledger");
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Failed to add expense");
    },
  });

  if (isHq6 && !stayInAdmin) return null;

  return (
    <Modal open={open} onClose={handleClose}>
      <ModalHeader
        title={
          entityLabel ? `Add Expense — ${entityLabel}` : "Add Expense"
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
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Category
          </label>
          <AsyncMenuSelect
            value={categoryId}
            selectedLabel={categoryName || undefined}
            onChange={(id, option) => {
              setCategoryId(id);
              setCategoryName(option?.label ?? "");
            }}
            loadOptions={loadCategoryOptions}
            loadMoreOptions={loadMoreCategoryOptions}
            placeholder="Select category…"
            emptyMessage="No categories found"
            prefetchKey={tenantId}
          />
        </div>
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
        <Button variant="ghost" onClick={handleClose} disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button
          onClick={() => mutation.mutate()}
          isLoading={mutation.isPending}
          loadingText="Saving…"
          disabled={!tenantId}
        >
          Add expense
        </Button>
      </ModalFooter>
    </Modal>
  );
}
