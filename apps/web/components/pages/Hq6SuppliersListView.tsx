"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { Hq6ActionsMenu } from "@/components/hq6/Hq6ActionsMenu";
import {
  Hq6Field,
  Hq6Modal,
  Hq6ModalSaveClose,
} from "@/components/hq6/Hq6Modal";
import { Hq6PaySupplierModal } from "@/components/hq6/Hq6PaySupplierModal";
import {
  Hq6FilterCheckbox,
  Hq6FilterCheckboxRow,
  Hq6FilterGrid,
  Hq6FilterSelect,
  Hq6FilterStack,
} from "@/components/hq6/Hq6FilterFields";
import { Hq6StackCell } from "@/components/hq6/Hq6StackCell";
import { Hq6StandardListShell, useHq6ListChrome } from "@/components/hq6/Hq6StandardListShell";
import {
  getSuppliersPage,
  setSupplierStatus,
  updateSupplier,
  type SupplierListRow,
} from "@/lib/api/suppliers";
import { getUsers } from "@/lib/api/users";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { HQ6_SUPPLIER_FILTERS } from "@/lib/registries/hq6Filters";
import {
  HQ6_SUPPLIER_COLUMNS,
  hq6DefaultColumnKeys,
} from "@/lib/registries/hq6TableRows";
import { useUiStore } from "@/stores/uiStore";
import { toast } from "@/stores/toastStore";
import { Hq6ListAmountFooter } from "@/components/hq6/Hq6ListAmountFooter";
import { formatHq6Currency, formatHq6Date, hq6Cell } from "@/lib/utils/hq6Format";
import { nameListCursor } from "@/lib/utils/pagination";

/**
 * HQ6 Suppliers list — columns + row actions from ui-table-rows/04_contacts__type=supplier.
 * Filters from FILTERS.json `04_contacts__type=supplier`.
 */
export function Hq6SuppliersListView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { goToDetail, detailPath } = useRecordNavigation("suppliers");
  const tenantId = useTenantId();
  const openCreateModal = useUiStore((state) => state.openCreateModal);
  const { search, setSearch } = useListPageFilters();
  const [localSearch, setLocalSearch] = useState(search);
  const [purchaseDue, setPurchaseDue] = useState(false);
  const [purchaseReturn, setPurchaseReturn] = useState(false);
  const [advanceBalance, setAdvanceBalance] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(false);
  const [assignedToUserId, setAssignedToUserId] = useState("");
  const [status, setStatus] = useState("");
  const chrome = useHq6ListChrome();

  const [editTarget, setEditTarget] = useState<SupplierListRow | null>(null);
  const [payTarget, setPayTarget] = useState<SupplierListRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const usersQuery = useQuery({
    queryKey: ["users", tenantId, "filter"],
    queryFn: () => getUsers(tenantId),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
  });

  const apiFilters = useMemo(
    () => ({
      search: (localSearch || search).trim() || undefined,
      purchaseDue: purchaseDue || undefined,
      purchaseReturn: purchaseReturn || undefined,
      advanceBalance: advanceBalance || undefined,
      openingBalance: openingBalance || undefined,
      assignedToUserId: assignedToUserId || undefined,
      status: (status || undefined) as "active" | "inactive" | undefined,
    }),
    [
      advanceBalance,
      assignedToUserId,
      localSearch,
      openingBalance,
      purchaseDue,
      purchaseReturn,
      search,
      status,
    ],
  );

  const {
    items: suppliers,
    hasMore,
    totalCount,
    amountSummary,
    pageIndex,
    pageSize,
    canGoPrev,
    goNext,
    goPrev,
    setPageSize,
    isLoading,
    isFetching,
    error,
    goToPage,
    canSelectPage,
  } = useServerListPage<SupplierListRow>({
    queryKey: ["suppliers", tenantId, "hq6"],
    enabled: Boolean(tenantId),
    filters: apiFilters,
    search: localSearch || search,
    fetchPage: (cursor, limit) => getSuppliersPage(tenantId!, cursor, limit, apiFilters),
    getCursor: (row) => nameListCursor(row),
  });

  const commitSearch = useCallback(() => setSearch(localSearch), [localSearch, setSearch]);

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["suppliers"] });
  }, [queryClient]);

  const openEdit = useCallback((row: SupplierListRow) => {
    setEditTarget(row);
    setEditName(row.name);
    setEditContact(row.contactName ?? "");
    setEditEmail(row.email ?? "");
    setEditPhone(row.phone ?? "");
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!editTarget || !editName.trim()) {
      toast.error("Supplier name is required");
      return;
    }
    setSaving(true);
    try {
      await updateSupplier(editTarget.id, {
        name: editName.trim(),
        contactName: editContact.trim() || undefined,
        email: editEmail.trim() || undefined,
        phone: editPhone.trim() || undefined,
      });
      toast.success("Supplier updated");
      setEditTarget(null);
      await invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }, [editContact, editEmail, editName, editPhone, editTarget, invalidate]);

  const columns: ColumnConfig<SupplierListRow>[] = useMemo(
    () => [
      {
        key: "actions",
        header: "Action",
        sortable: false,
        render: (row) => (
          <Hq6ActionsMenu
            items={[
              {
                id: "pay",
                label: "Pay",
                onClick: () => setPayTarget(row),
              },
              { id: "view", label: "View", onClick: () => goToDetail(row.id) },
              { id: "edit", label: "Edit", onClick: () => openEdit(row) },
              {
                id: "delete",
                label: "Delete",
                danger: true,
                onClick: () =>
                  router.push(`${detailPath(row.id)}?action=delete`),
              },
              {
                id: "deactivate",
                label: row.status === "inactive" ? "Activate" : "Deactivate",
                onClick: () => {
                  if (!tenantId) return;
                  const next = row.status === "inactive" ? "active" : "inactive";
                  void setSupplierStatus(tenantId, row.id, next)
                    .then(async () => {
                      toast.success(
                        next === "inactive"
                          ? "Supplier deactivated"
                          : "Supplier activated",
                      );
                      await invalidate();
                    })
                    .catch((err) =>
                      toast.error(
                        err instanceof Error
                          ? err.message
                          : "Failed to update status",
                      ),
                    );
                },
              },
              {
                id: "ledger",
                label: "Ledger",
                onClick: () => router.push(`${detailPath(row.id)}?view=ledger`),
              },
              {
                id: "purchases",
                label: "Purchases",
                onClick: () =>
                  router.push(`${detailPath(row.id)}?view=purchase`),
              },
              {
                id: "stock_report",
                label: "Stock Report",
                onClick: () =>
                  router.push(`${detailPath(row.id)}?view=stock_report`),
              },
              {
                id: "documents",
                label: "Documents & Note",
                onClick: () =>
                  router.push(`${detailPath(row.id)}?view=documents_and_notes`),
              },
            ]}
          />
        ),
      },
      {
        key: "contactId",
        header: "Contact ID",
        render: (r) => hq6Cell(r.contactId),
      },
      {
        key: "businessName",
        header: "Business Name",
        render: (r) => hq6Cell(r.businessName ?? r.name),
      },
      {
        key: "contactName",
        header: "Name",
        render: (r) => (
          <Hq6StackCell
            primary={hq6Cell(r.contactName) || r.name}
            secondary={hq6Cell(r.phone) || undefined}
            tertiary={hq6Cell(r.contactId) || undefined}
          />
        ),
      },
      { key: "email", header: "Email", render: (r) => hq6Cell(r.email) },
      {
        key: "taxNumber",
        header: "Tax number",
        render: (r) => hq6Cell(r.taxNumber),
      },
      {
        key: "payTerm",
        header: "Pay term",
        render: (r) => hq6Cell(r.payTerm),
      },
      {
        key: "openingBalance",
        header: "Opening Balance",
        sortValue: (r) => r.openingBalance ?? 0,
        render: (r) => formatHq6Currency(r.openingBalance ?? 0),
      },
      {
        key: "totalPurchase",
        header: "Total Purchase",
        sortValue: (r) => r.totalPurchase ?? 0,
        render: (r) => formatHq6Currency(r.totalPurchase ?? 0),
      },
      {
        key: "totalPurchaseDue",
        header: "Total Purchase Due",
        sortValue: (r) => r.totalPurchaseDue ?? 0,
        render: (r) => formatHq6Currency(r.totalPurchaseDue ?? 0),
      },
      {
        key: "totalPurchasePaid",
        header: "Purchase Paid",
        sortValue: (r) => r.totalPurchasePaid ?? 0,
        render: (r) => formatHq6Currency(r.totalPurchasePaid ?? 0),
      },
      {
        key: "advanceBalance",
        header: "Advance Balance",
        sortValue: (r) => r.totalAdvance ?? 0,
        render: (r) => formatHq6Currency(r.totalAdvance ?? 0),
      },
      {
        key: "createdAt",
        header: "Added On",
        sortValue: (r) => new Date(r.createdAt).getTime(),
        render: (r) => formatHq6Date(r.createdAt),
      },
      { key: "phone", header: "Mobile", render: (r) => hq6Cell(r.phone) },
      {
        key: "address",
        header: "Address",
        render: (r) => hq6Cell(r.address),
      },
      {
        key: "totalPurchaseReturn",
        header: "Total Purchase Return Due",
        sortValue: (r) => r.totalPurchaseReturn ?? 0,
        render: (r) => formatHq6Currency(r.totalPurchaseReturn ?? 0),
      },
    ],
    [detailPath, goToDetail, openEdit, router],
  );

  const defaultKeys = useMemo(() => hq6DefaultColumnKeys(HQ6_SUPPLIER_COLUMNS), []);
  const columnOptions = useMemo(
    () => HQ6_SUPPLIER_COLUMNS.map((c) => ({ key: c.key, label: c.header })),
    [],
  );
  const effectiveColumns = useMemo(() => {
    const visible = chrome.visibleColumnKeys ?? defaultKeys;
    const allowed = new Set(["actions", ...visible]);
    return columns.filter((c) => allowed.has(c.key));
  }, [chrome.visibleColumnKeys, columns, defaultKeys]);

  const filters = (
    <Hq6FilterStack>
      <Hq6FilterCheckboxRow>
        <Hq6FilterCheckbox
          label="Purchase Due"
          checked={purchaseDue}
          onChange={setPurchaseDue}
        />
        <Hq6FilterCheckbox
          label="Purchase Return"
          checked={purchaseReturn}
          onChange={setPurchaseReturn}
        />
        <Hq6FilterCheckbox
          label="Advance Balance"
          checked={advanceBalance}
          onChange={setAdvanceBalance}
        />
        <Hq6FilterCheckbox
          label="Opening Balance"
          checked={openingBalance}
          onChange={setOpeningBalance}
        />
      </Hq6FilterCheckboxRow>
      <Hq6FilterGrid>
        <Hq6FilterSelect
          label="Assigned to"
          value={assignedToUserId}
          onChange={setAssignedToUserId}
          emptyLabel="None"
          options={(usersQuery.data ?? []).map((u) => ({
            value: u.id,
            label: u.name || u.email,
          }))}
        />
        <Hq6FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          options={HQ6_SUPPLIER_FILTERS[5]!.options!}
        />
      </Hq6FilterGrid>
    </Hq6FilterStack>
  );

  const pageTotals = useMemo(() => {
    let totalPurchase = 0;
    let totalDue = 0;
    let totalPaid = 0;
    for (const row of suppliers) {
      totalPurchase += row.totalPurchase ?? 0;
      totalDue += row.totalPurchaseDue ?? 0;
      totalPaid += row.totalPurchasePaid ?? 0;
    }
    return { totalPurchase, totalDue, totalPaid };
  }, [suppliers]);

  return (
    <>
      <Hq6StandardListShell
        slug="suppliers"
        tabLabel="All your Suppliers"
        filters={filters}
        onAdd={() => openCreateModal("supplier")}
        columnOptions={columnOptions}
        defaultVisibleColumnKeys={defaultKeys}
        chrome={chrome}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        searchValue={localSearch}
        onSearchChange={setLocalSearch}
        onSearchCommit={commitSearch}
        tableFooter={
          suppliers.length > 0 ? (
            <div className="space-y-0">
              {amountSummary ? (
                <Hq6ListAmountFooter
                  title="All matching"
                  cells={[
                    {
                      label: "Purchase",
                      amount: amountSummary.totalAmount ?? 0,
                    },
                    { label: "Due", amount: amountSummary.totalDue ?? 0 },
                    { label: "Paid", amount: amountSummary.totalPaid ?? 0 },
                  ]}
                />
              ) : null}
              <Hq6ListAmountFooter
                title="Page total"
                cells={[
                  { label: "Purchase", amount: pageTotals.totalPurchase },
                  { label: "Due", amount: pageTotals.totalDue },
                  { label: "Paid", amount: pageTotals.totalPaid },
                ]}
              />
            </div>
          ) : null
        }
        pagination={{
          pageIndex,
          pageSize,
          itemCount: suppliers.length,
          hasMore,
          canGoPrev,
          onPrev: goPrev,
          onNext: goNext,
          onPageSizeChange: setPageSize,
          onPageSelect: goToPage,
          canSelectPage,
          totalItems: totalCount,
          isBusy: isFetching && !isLoading,
        }}
      >
        <DataTable
          data={suppliers}
          columns={effectiveColumns}
          displayMode="table"
          embedded
          disablePagination
          isLoading={isLoading}
          isFetching={isFetching && !isLoading}
          error={error ? "Failed to load suppliers." : null}
          onRowClick={(row) => goToDetail(row.id)}
          emptyState={{ message: "No suppliers found." }}
        />
      </Hq6StandardListShell>

      <Hq6Modal
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        title="Edit contact"
        size="md"
        footer={
          <Hq6ModalSaveClose
            onSave={handleSaveEdit}
            onClose={() => setEditTarget(null)}
            saving={saving}
          />
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Hq6Field label="Business Name" required>
            <input
              className="hq6-modal-input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </Hq6Field>
          <Hq6Field label="Name">
            <input
              className="hq6-modal-input"
              value={editContact}
              onChange={(e) => setEditContact(e.target.value)}
            />
          </Hq6Field>
          <Hq6Field label="Email">
            <input
              className="hq6-modal-input"
              type="email"
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
            />
          </Hq6Field>
          <Hq6Field label="Mobile">
            <input
              className="hq6-modal-input"
              value={editPhone}
              onChange={(e) => setEditPhone(e.target.value)}
            />
          </Hq6Field>
        </div>
      </Hq6Modal>
      <Hq6PaySupplierModal
        open={Boolean(payTarget)}
        supplier={payTarget}
        tenantId={tenantId}
        onClose={() => setPayTarget(null)}
        onPaid={() => {
          void invalidate();
          void queryClient.invalidateQueries({ queryKey: ["supplier-summary"] });
        }}
      />
    </>
  );
}
