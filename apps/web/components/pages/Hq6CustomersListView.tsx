"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import type { Customer } from "@vonos/types";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { Hq6ActionsMenu } from "@/components/hq6/Hq6ActionsMenu";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import {
  Hq6ContactEditModal,
  Hq6PayContactModal,
} from "@/components/hq6/Hq6ContactModals";
import {
  Hq6FilterCheckbox,
  Hq6FilterCheckboxRow,
  Hq6FilterDateRange,
  Hq6FilterGrid,
  Hq6FilterSelect,
  Hq6FilterStack,
} from "@/components/hq6/Hq6FilterFields";
import { Hq6StackCell } from "@/components/hq6/Hq6StackCell";
import { Hq6StandardListShell, useHq6ListChrome } from "@/components/hq6/Hq6StandardListShell";
import {
  getCustomersPage,
  setCustomerStatus,
} from "@/lib/api/customers";
import { getCustomerGroups } from "@/lib/api/customerGroups";
import { getUsers } from "@/lib/api/users";
import { useServerListPage } from "@/lib/hooks/useServerListPage";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { HQ6_CUSTOMER_FILTERS } from "@/lib/registries/hq6Filters";
import {
  HQ6_CUSTOMER_COLUMNS,
  hq6DefaultColumnKeys,
} from "@/lib/registries/hq6TableRows";
import { useUiStore } from "@/stores/uiStore";
import { toast } from "@/stores/toastStore";
import { Hq6ListAmountFooter } from "@/components/hq6/Hq6ListAmountFooter";
import { formatHq6Currency, formatHq6Date, hq6Cell } from "@/lib/utils/hq6Format";
import { customerListCursor } from "@/lib/utils/pagination";

/**
 * HQ6 Customers list — columns + row actions from ui-table-rows/05_contacts__type=customer.
 * Filters from FILTERS.json `05_contacts__type=customer`.
 */
export function Hq6CustomersListView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { goToDetail, detailPath } = useRecordNavigation("customers");
  const tenantId = useTenantId();
  const openCreateModal = useUiStore((state) => state.openCreateModal);
  const {
    dateRange,
    setDateRange,
    customDateRange,
    setCustomDateRange,
    search,
    setSearch,
    bounds,
  } = useListPageFilters({ defaultDateRange: "all_time" });
  const [localSearch, setLocalSearch] = useState(search);
  const chrome = useHq6ListChrome();

  const [sellDue, setSellDue] = useState(false);
  const [sellReturn, setSellReturn] = useState(false);
  const [advanceBalance, setAdvanceBalance] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(false);
  const [hasNoSellFrom, setHasNoSellFrom] = useState("");
  const [customerGroupId, setCustomerGroupId] = useState("");
  const [assignedToUserId, setAssignedToUserId] = useState("");
  const [status, setStatus] = useState("");

  const [editTarget, setEditTarget] = useState<Customer | null>(null);
  const [payTarget, setPayTarget] = useState<Customer | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Customer | null>(null);
  const [busy, setBusy] = useState(false);

  const groupsQuery = useQuery({
    queryKey: ["customer-groups", tenantId, "filter"],
    queryFn: () => getCustomerGroups(tenantId!),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
  });
  const usersQuery = useQuery({
    queryKey: ["users", tenantId, "filter"],
    queryFn: () => getUsers(tenantId),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
  });

  const apiFilters = useMemo(() => {
    const months = Number(hasNoSellFrom);
    return {
      search: (localSearch || search).trim() || undefined,
      sellDue: sellDue || undefined,
      sellReturn: sellReturn || undefined,
      advanceBalance: advanceBalance || undefined,
      openingBalance: openingBalance || undefined,
      hasNoSellMonths:
        months === 1 || months === 3 || months === 6 || months === 12
          ? (months as 1 | 3 | 6 | 12)
          : undefined,
      customerGroupId: customerGroupId || undefined,
      assignedToUserId: assignedToUserId || undefined,
      status: (status || undefined) as "active" | "inactive" | undefined,
      from: bounds?.from,
      to: bounds?.to,
    };
  }, [
    advanceBalance,
    assignedToUserId,
    bounds?.from,
    bounds?.to,
    customerGroupId,
    hasNoSellFrom,
    localSearch,
    openingBalance,
    search,
    sellDue,
    sellReturn,
    status,
  ]);

  const {
    items: customers,
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
  } = useServerListPage<Customer>({
    queryKey: ["customers", tenantId, "hq6"],
    enabled: Boolean(tenantId),
    filters: apiFilters,
    search: localSearch || search,
    fetchPage: (cursor, limit) => getCustomersPage(tenantId!, apiFilters, cursor, limit),
    getCursor: (row) => customerListCursor(row),
  });

  const commitSearch = useCallback(() => setSearch(localSearch), [localSearch, setSearch]);

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ["customers"] });
  }, [queryClient]);

  const handleDeactivate = useCallback(async () => {
    if (!tenantId || !deactivateTarget) return;
    setBusy(true);
    try {
      const next =
        deactivateTarget.status === "inactive" ? "active" : "inactive";
      await setCustomerStatus(tenantId, deactivateTarget.id, next);
      toast.success(next === "inactive" ? "Customer deactivated" : "Customer activated");
      setDeactivateTarget(null);
      await invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Status update failed");
    } finally {
      setBusy(false);
    }
  }, [deactivateTarget, invalidate, tenantId]);

  const columns: ColumnConfig<Customer>[] = useMemo(
    () => [
      {
        key: "actions",
        header: "Action",
        sortable: false,
        render: (row) => {
          const inactive = row.status === "inactive";
          return (
            <Hq6ActionsMenu
              items={[
                { id: "pay", label: "Pay", onClick: () => setPayTarget(row) },
                { id: "view", label: "View", onClick: () => goToDetail(row.id) },
                { id: "edit", label: "Edit", onClick: () => setEditTarget(row) },
                {
                  id: "delete",
                  label: "Delete",
                  danger: true,
                  onClick: () =>
                    router.push(`${detailPath(row.id)}?action=delete`),
                },
                {
                  id: "deactivate",
                  label: inactive ? "Activate" : "Deactivate",
                  onClick: () => setDeactivateTarget(row),
                },
                {
                  id: "ledger",
                  label: "Ledger",
                  onClick: () => router.push(`${detailPath(row.id)}?view=ledger`),
                },
                {
                  id: "sales",
                  label: "Sales",
                  onClick: () => router.push(`${detailPath(row.id)}?view=sales`),
                },
                {
                  id: "documents",
                  label: "Documents & Note",
                  onClick: () =>
                    router.push(`${detailPath(row.id)}?view=documents_and_notes`),
                },
              ]}
            />
          );
        },
      },
      {
        key: "contactId",
        header: "Contact ID",
        render: (r) => hq6Cell(r.contactId),
      },
      {
        key: "businessName",
        header: "Business Name",
        render: (r) =>
          hq6Cell(
            r.businessName && r.businessName !== r.name ? r.businessName : "",
          ),
      },
      {
        key: "name",
        header: "Name",
        render: (r) => (
          <Hq6StackCell
            primary={r.name}
            secondary={hq6Cell(r.phone) || undefined}
            tertiary={hq6Cell(r.contactId) || undefined}
          />
        ),
      },
      {
        key: "email",
        header: "Email",
        render: (r) => hq6Cell(r.email),
      },
      {
        key: "taxNumber",
        header: "Tax number",
        render: (r) => hq6Cell(r.taxNumber),
      },
      {
        key: "creditLimit",
        header: "Credit Limit",
        sortable: false,
        render: () => "No Limit",
      },
      {
        key: "payTerm",
        header: "Pay term",
        sortable: false,
        render: () => "",
      },
      {
        key: "openingBalance",
        header: "Opening Balance",
        sortValue: (r) => r.openingBalance ?? 0,
        render: (r) => formatHq6Currency(r.openingBalance ?? 0),
      },
      {
        key: "totalSell",
        header: "Total Sale",
        sortValue: (r) => r.totalSell ?? r.totalSpend ?? 0,
        render: (r) => formatHq6Currency(r.totalSell ?? r.totalSpend ?? 0),
      },
      {
        key: "totalSellDue",
        header: "Total Sale Due",
        sortValue: (r) => r.totalSellDue ?? 0,
        render: (r) => formatHq6Currency(r.totalSellDue ?? 0),
      },
      {
        key: "totalSellPaid",
        header: "Sale Paid",
        sortValue: (r) => r.totalSellPaid ?? 0,
        render: (r) => formatHq6Currency(r.totalSellPaid ?? 0),
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
      {
        key: "customerGroup",
        header: "Customer Group",
        render: (r) => hq6Cell(r.customerGroupName),
      },
      {
        key: "phone",
        header: "Mobile",
        render: (r) => hq6Cell(r.phone),
      },
      {
        key: "totalSellReturn",
        header: "Total Sell Return Due",
        sortValue: (r) => r.totalSellReturn ?? 0,
        render: (r) => formatHq6Currency(r.totalSellReturn ?? 0),
      },
    ],
    [detailPath, goToDetail, router],
  );

  const defaultKeys = useMemo(() => hq6DefaultColumnKeys(HQ6_CUSTOMER_COLUMNS), []);

  const columnOptions = useMemo(
    () => HQ6_CUSTOMER_COLUMNS.map((c) => ({ key: c.key, label: c.header })),
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
        <Hq6FilterCheckbox label="Sell Due" checked={sellDue} onChange={setSellDue} />
        <Hq6FilterCheckbox
          label="Sell Return"
          checked={sellReturn}
          onChange={setSellReturn}
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
          label={HQ6_CUSTOMER_FILTERS[4]!.label}
          value={hasNoSellFrom}
          onChange={setHasNoSellFrom}
          options={HQ6_CUSTOMER_FILTERS[4]!.options!}
        />
        <Hq6FilterSelect
          label="Customer Group"
          value={customerGroupId}
          onChange={setCustomerGroupId}
          emptyLabel="None"
          options={(groupsQuery.data ?? []).map((g) => ({
            value: g.id,
            label: g.name,
          }))}
        />
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
          options={HQ6_CUSTOMER_FILTERS[7]!.options!}
        />
        <Hq6FilterDateRange
          value={dateRange}
          onChange={setDateRange}
          customValue={customDateRange}
          onCustomChange={setCustomDateRange}
        />
      </Hq6FilterGrid>
    </Hq6FilterStack>
  );

  const pageTotals = useMemo(() => {
    let totalSell = 0;
    let totalDue = 0;
    let totalPaid = 0;
    for (const row of customers) {
      totalSell += row.totalSell ?? row.totalSpend ?? 0;
      totalDue += row.totalSellDue ?? 0;
      totalPaid += row.totalSellPaid ?? 0;
    }
    return { totalSell, totalDue, totalPaid };
  }, [customers]);

  return (
    <>
      <Hq6StandardListShell
        slug="customers"
        tabLabel="All customers"
        filters={filters}
        onAdd={() => openCreateModal("customer")}
        columnOptions={columnOptions}
        defaultVisibleColumnKeys={defaultKeys}
        chrome={chrome}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        searchValue={localSearch}
        onSearchChange={setLocalSearch}
        onSearchCommit={commitSearch}
        tableFooter={
          customers.length > 0 ? (
            <div className="space-y-0">
              {amountSummary ? (
                <Hq6ListAmountFooter
                  title="All matching"
                  cells={[
                    { label: "Sale", amount: amountSummary.totalAmount ?? 0 },
                    { label: "Due", amount: amountSummary.totalDue ?? 0 },
                    { label: "Paid", amount: amountSummary.totalPaid ?? 0 },
                  ]}
                />
              ) : null}
              <Hq6ListAmountFooter
                title="Page total"
                cells={[
                  { label: "Sale", amount: pageTotals.totalSell },
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
          itemCount: customers.length,
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
          data={customers}
          columns={effectiveColumns}
          displayMode="table"
          embedded
          disablePagination
          isLoading={isLoading}
          isFetching={isFetching && !isLoading}
          error={error ? "Failed to load customers." : null}
          onRowClick={(row) => goToDetail(row.id)}
          emptyState={{ message: "No customers found." }}
        />
      </Hq6StandardListShell>

      <Hq6ContactEditModal
        open={Boolean(editTarget)}
        customer={editTarget}
        tenantId={tenantId}
        onClose={() => setEditTarget(null)}
        onSaved={invalidate}
      />
      <Hq6PayContactModal
        open={Boolean(payTarget)}
        customer={payTarget}
        tenantId={tenantId}
        onClose={() => setPayTarget(null)}
        onPaid={invalidate}
      />
      <Hq6ConfirmModal
        open={Boolean(deactivateTarget)}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        title={
          deactivateTarget?.status === "inactive" ? "Activate contact" : "Deactivate contact"
        }
        message={
          deactivateTarget
            ? deactivateTarget.status === "inactive"
              ? `Activate ${deactivateTarget.businessName ?? deactivateTarget.name}?`
              : `Deactivate ${deactivateTarget.businessName ?? deactivateTarget.name}? They will be hidden from active lists.`
            : ""
        }
        confirmLabel={deactivateTarget?.status === "inactive" ? "Activate" : "Deactivate"}
        confirming={busy}
      />
    </>
  );
}
