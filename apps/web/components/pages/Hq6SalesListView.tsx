"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { DataTable, type ColumnConfig } from "@/components/organisms/DataTable";
import { SaleRecordModal } from "@/components/organisms/SaleRecordModal";
import { Hq6ActionsMenu } from "@/components/hq6/Hq6ActionsMenu";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import { Hq6EditShippingModal } from "@/components/hq6/Hq6EditShippingModal";
import { Hq6ListAmountFooter } from "@/components/hq6/Hq6ListAmountFooter";
import {
  Hq6FilterDateRange,
  Hq6FilterGrid,
  Hq6FilterSelect,
} from "@/components/hq6/Hq6FilterFields";
import { Hq6SalesSummaryStrip } from "@/components/hq6/Hq6SalesSummaryStrip";
import { Hq6StandardListShell, useHq6ListChrome } from "@/components/hq6/Hq6StandardListShell";
import { Hq6ViewPaymentsModal } from "@/components/hq6/Hq6ViewPaymentsModal";
import { Hq6PaySaleModal } from "@/components/hq6/Hq6PaySaleModal";
import { Hq6InvoiceUrlModal } from "@/components/hq6/Hq6InvoiceUrlModal";
import {
  Hq6PrintInvoiceModal,
  type Hq6PrintDocKind,
} from "@/components/hq6/Hq6PrintInvoiceModal";
import {
  deleteSale,
  finalizeSale,
  getSale,
  getSaleInvoiceUrl,
  getSalesPage,
} from "@/lib/api/sales";
import { getCustomersForPicker, loadMoreCustomersForPicker, customersPickerHasMore } from "@/lib/api/customers";
import { getServiceStaff, loadMoreServiceStaffForPicker, serviceStaffPickerHasMore } from "@/lib/api/hrm";
import { useServerListPage, serverSortProps, withListSort } from "@/lib/hooks/useServerListPage";
import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { useListExport } from "@/lib/hooks/useListExport";
import { useListRecordModal } from "@/lib/hooks/useListRecordModal";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { stableListFilterKey } from "@/lib/utils/stableListFilterKey";
import { useHq6Permissions } from "@/lib/hooks/useHq6Permissions";
import { prefetchSaleListModals, prefetchSalePaymentsModal, prefetchPaymentAccountsRef } from "@/lib/query/prefetchListModals";
import { modalKeys } from "@/lib/query/modalQueryKeys";
import { compositeListCursorFrom } from "@/lib/utils/pagination";
import { toast } from "@/stores/toastStore";
import {
  formatHq6Currency,
  formatHq6DateTime,
  formatHq6PaymentMethod,
  formatHq6PaymentStatus,
} from "@/lib/utils/hq6Format";
import { formatSaleNotesForDisplay, parseSaleInvoiceNotes } from "@/lib/utils/saleInvoiceNotes";
import { saleVehicleFields } from "@/lib/utils/saleVehicleFields";
import { businessLocationName } from "@/lib/utils/locationLabels";
import { isJobCentricTenant } from "@/lib/utils/isHq6Tenant";
import { HQ6_PAYMENT_METHOD_OPTIONS } from "@/lib/utils/hq6PaymentMethods";
import { Hq6UpdateJobStatusModal } from "@/components/hq6/Hq6UpdateJobStatusModal";
import { entitySaleLocations } from "@/lib/hooks/useBusinessLocationOptions";
import { hq6PaymentBadgeClass, canAddPaymentForStatus } from "@/lib/utils/hq6PaymentBadge";
import type { Sale, SaleReturnStatus, SaleStatus } from "@vonos/types";
import { cn } from "@/lib/utils/cn";
import { removeEntityFromQueries } from "@/lib/query/optimistic";
import { dismissFirstWrite } from "@/lib/utils/dismissFirstWrite";
import { announceRedirect } from "@/lib/utils/announceRedirect";
import { tenantBasePath } from "@/lib/utils/tenantMount";

function SaleCustomerCell({
  row,
  showVehicleMeta,
}: {
  row: Sale;
  showVehicleMeta: boolean;
}) {
  const notes = parseSaleInvoiceNotes(row.notes);
  const { customerDisplay, plateNumber, carModelYear } = saleVehicleFields({
    customerName: row.customerName,
    plateNumber: notes.plateNumber,
    carModelYear: notes.carModelYear,
  });
  const meta = showVehicleMeta
    ? [carModelYear, plateNumber].filter(Boolean).join(" · ")
    : "";

  return (
    <div>
      <div className="font-medium">{customerDisplay}</div>
      {meta ? (
        <div className="text-xs text-[#6b7280]">{meta}</div>
      ) : row.jobReference ? (
        <div className="text-xs text-[#6b7280]">{row.jobReference}</div>
      ) : null}
    </div>
  );
}

export interface Hq6SalesListViewProps {
  saleStatus?: SaleStatus;
  shipmentsOnly?: boolean;
  tabLabel?: string;
  hidePrimaryAction?: boolean;
  slug?: string;
}

function paymentBadgeClass(status: string | null | undefined): string {
  return hq6PaymentBadgeClass(status);
}

/** HQ6 All Sales list — ui-audit/24_sells/screenshot.png */
export function Hq6SalesListView({
  saleStatus,
  shipmentsOnly,
  tabLabel = "All sales",
  hidePrimaryAction = false,
  slug = "sales",
}: Hq6SalesListViewProps = {}) {
  const router = useRouter();
  const tenantId = useTenantId();
  const { config, tenantCode } = useRouteTenant();
  const queryClient = useQueryClient();
  const { requireCanAny } = useHq6Permissions();
  const requireCreateSale = () =>
    requireCanAny(["direct_sell.access", "sell.create"]);
  const requireUpdateSale = () =>
    requireCanAny(["direct_sell.update", "sell.update", "draft.update"]);
  const requireDeleteSale = () =>
    requireCanAny(["direct_sell.delete", "sell.delete", "draft.delete"]);

  // Warm payment-account dropdown while the sales list loads.
  useEffect(() => {
    if (!tenantId) return;
    prefetchPaymentAccountsRef(queryClient, tenantId);
  }, [tenantId, queryClient]);
  const { recordId, recordSeed, openRecord, closeRecord } = useListRecordModal<Sale>({
    syncUrlParam: "record",
    onPrefetchRecord: (id) => {
      if (!tenantId) return;
      prefetchSaleListModals(queryClient, tenantId, id);
    },
  });
  const exportList = useListExport();
  const {
    dateRange,
    setDateRange,
    customDateRange,
    setCustomDateRange,
    search,
    setSearch,
    bounds,
  } = useListPageFilters({
    defaultDateRange: "all_time",
    isolateDateRange: true,
  });
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [serviceStaffFilter, setServiceStaffFilter] = useState("");
  const showVehicleMeta = isJobCentricTenant(tenantCode);
  const chrome = useHq6ListChrome(slug);
  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null);
  const [jobStatusSale, setJobStatusSale] = useState<Sale | null>(null);
  const [invoiceUrlSale, setInvoiceUrlSale] = useState<Sale | null>(null);
  const [paymentsSale, setPaymentsSale] = useState<Sale | null>(null);
  const [paySale, setPaySale] = useState<Sale | null>(null);
  const [shippingSale, setShippingSale] = useState<Sale | null>(null);
  const [printDoc, setPrintDoc] = useState<{
    sale: Sale;
    kind: Hq6PrintDocKind;
  } | null>(null);
  const [convertTarget, setConvertTarget] = useState<Sale | null>(null);

  const sendSaleNotification = useCallback(
    async (row: Sale, kind: "quotation" | "draft" | "sale") => {
      if (!tenantId) return;
      try {
        const [urlRes, detail] = await Promise.all([
          getSaleInvoiceUrl(tenantId, row.id),
          getSale(row.id, tenantId).catch(() => null),
        ]);
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const link = urlRes.path ? `${origin}${urlRes.path}` : "";
        const email = detail?.customerEmail?.trim() ?? "";
        const label =
          kind === "quotation"
            ? "Quotation"
            : kind === "draft"
              ? "Draft"
              : "Sale";
        const subject = encodeURIComponent(`${label} ${row.reference}`);
        const body = encodeURIComponent(
          [
            `Hello${row.customerName ? ` ${row.customerName}` : ""},`,
            "",
            `Please review your ${label.toLowerCase()} ${row.reference}.`,
            link ? `View online: ${link}` : "",
          ]
            .filter(Boolean)
            .join("\n"),
        );
        window.open(
          `mailto:${encodeURIComponent(email)}?subject=${subject}&body=${body}`,
          "_blank",
        );
        toast.success(
          email
            ? `${label} notification ready in your email client`
            : `${label} notification opened — add the customer email to send`,
        );
      } catch (err) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Failed to prepare notification",
        );
      }
    },
    [tenantId],
  );

  const apiFilters = useMemo(
    () => ({
      saleStatus,
      shipmentsOnly,
      status: (statusFilter || undefined) as SaleReturnStatus | undefined,
      paymentStatus: (paymentStatusFilter || undefined) as
        | NonNullable<Sale["paymentStatus"]>
        | undefined,
      paymentMethod: paymentMethodFilter || undefined,
      locationCode: locationFilter || undefined,
      customerId: customerFilter || undefined,
      serviceStaffEmployeeId: serviceStaffFilter || undefined,
      from: bounds?.from,
      to: bounds?.to,
    }),
    // Remove `search` from deps — local search is not part of apiFilters / query key.
    [
      bounds?.from,
      bounds?.to,
      customerFilter,
      locationFilter,
      paymentMethodFilter,
      paymentStatusFilter,
      saleStatus,
      serviceStaffFilter,
      shipmentsOnly,
      statusFilter,
    ],
  );

  const {
    items: sales,
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
    isPaging,
    isSearching,
    error,
    goToPage,
    canSelectPage,
    sort,
    setSort,
    reset,
  } = useServerListPage({
    queryKey: ["sales", tenantId, saleStatus ?? "all", "hq6"],
    enabled: Boolean(tenantId),
    filters: apiFilters,
    search: search,
    // Full-catalog API search (invoice / customer / plate), not match-sorter
    // over the sliding window of warm pages.
    searchMode: "hybrid",
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    defaultSort: { sortBy: "updatedAt", sortDir: "desc" },
    staleTime: 10 * 60_000,
    fetchPage: (cursor, limit, listSort, opts) =>
      getSalesPage(
        tenantId!,
        withListSort(
          {
            ...apiFilters,
            search: opts?.search,
            includeSummary: opts?.includeSummary,
          },
          listSort,
        ),
        cursor,
        limit,
        { signal: opts?.signal },
      ),
    getCursor: (row, listSort) => {
      const sortBy = listSort?.sortBy ?? "updatedAt";
      const type =
        sortBy === "total" ? "number" : sortBy === "date" || sortBy === "createdAt" || sortBy === "updatedAt" ? "date" : "string";
      return compositeListCursorFrom(row, sortBy, type);
    },
  });

  // Warm sibling sell tabs (Sales / Quotations / Drafts) so sidebar switches hit cache.
  useEffect(() => {
    if (!tenantId || shipmentsOnly) return;
    const siblings: Array<SaleStatus | undefined> = [
      undefined,
      "quotation",
      "draft",
    ];
    const listSort = sort ?? { sortBy: "updatedAt", sortDir: "desc" as const };
    for (const siblingStatus of siblings) {
      if (siblingStatus === saleStatus) continue;
      const siblingFilters = {
        ...apiFilters,
        saleStatus: siblingStatus,
        shipmentsOnly: undefined,
      };
      const filterKey = stableListFilterKey(siblingFilters, listSort);
      void queryClient.prefetchQuery({
        queryKey: [
          "sales",
          tenantId,
          siblingStatus ?? "all",
          "hq6",
          filterKey,
          0,
          null,
          pageSize,
          listSort.sortBy,
          listSort.sortDir,
        ],
        queryFn: () =>
          getSalesPage(
            tenantId,
            withListSort(
              { ...siblingFilters, includeSummary: false },
              listSort,
            ),
            undefined,
            pageSize,
          ),
        staleTime: 10 * 60_000,
      });
    }
  }, [
    apiFilters,
    pageSize,
    queryClient,
    saleStatus,
    shipmentsOnly,
    sort,
    tenantId,
  ]);

  // Load filter dropdowns after rows — don't compete with first paint.
  const customerLabelById = useRef(new Map<string, string>());
  const staffLabelById = useRef(new Map<string, string>());
  const [customerLabel, setCustomerLabel] = useState("");
  const [serviceStaffLabel, setServiceStaffLabel] = useState("");

  const loadCustomerOptions = useCallback(
    async (query: string) => {
      if (!tenantId) return { options: [], hasMore: false };
      const rows = await getCustomersForPicker(tenantId, query || undefined);
      for (const row of rows) {
        customerLabelById.current.set(row.id, row.businessName || row.name);
      }
      return {
        options: rows.map((c) => ({
          value: c.id,
          label: c.businessName || c.name,
        })),
        hasMore: !query.trim() && customersPickerHasMore(tenantId),
      };
    },
    [tenantId],
  );

  const loadMoreCustomerOptions = useCallback(async () => {
    if (!tenantId) return { options: [], hasMore: false, append: true };
    const page = await loadMoreCustomersForPicker(tenantId);
    for (const row of page.appended) {
      customerLabelById.current.set(row.id, row.businessName || row.name);
    }
    return {
      options: page.appended.map((c) => ({
        value: c.id,
        label: c.businessName || c.name,
      })),
      hasMore: page.hasMore,
      append: true,
    };
  }, [tenantId]);

  const loadServiceStaffOptions = useCallback(
    async (query: string) => {
      if (!tenantId) return { options: [], hasMore: false };
      const rows = await getServiceStaff(tenantId, query || undefined);
      for (const row of rows) {
        staffLabelById.current.set(row.id, row.name);
      }
      return {
        options: rows.map((e) => ({ value: e.id, label: e.name })),
        hasMore: !query.trim() && serviceStaffPickerHasMore(tenantId),
      };
    },
    [tenantId],
  );

  const loadMoreServiceStaffOptions = useCallback(async () => {
    if (!tenantId) return { options: [], hasMore: false, append: true };
    const page = await loadMoreServiceStaffForPicker(tenantId);
    for (const row of page.appended) {
      staffLabelById.current.set(row.id, row.name);
    }
    return {
      options: page.appended.map((e) => ({ value: e.id, label: e.name })),
      hasMore: page.hasMore,
      append: true,
    };
  }, [tenantId]);

  const handleExport = () => {
    exportList(
      saleStatus ? `${saleStatus}-sales` : "sales",
      [
        { key: "date", header: "Date" },
        { key: "reference", header: "Invoice No." },
        { key: "customerName", header: "Customer name" },
        { key: "customerPhone", header: "Contact Number" },
        { key: "location", header: "Location" },
        { key: "paymentStatus", header: "Payment Status" },
        { key: "paymentMethod", header: "Payment Method" },
        { key: "paymentNote", header: "Payment note" },
        { key: "serviceStaff", header: "Service staff" },
        { key: "total", header: "Total amount" },
        { key: "totalPaid", header: "Total paid" },
        { key: "sellDue", header: "Sell Due" },
      ],
      sales.map((row) => ({
        date: formatHq6DateTime(row.createdAt),
        reference: row.reference,
        customerName: row.customerName,
        customerPhone: row.customerPhone ?? "",
        location: businessLocationName(row.locationCode, config?.businessLocations) ?? "—",
        paymentStatus: formatHq6PaymentStatus(row.paymentStatus),
        paymentMethod: formatHq6PaymentMethod(row.paymentMethod),
        paymentNote: row.paymentNote ?? "",
        serviceStaff:
          row.serviceStaffEmployeeName?.trim() ||
          row.cleanerName?.trim() ||
          "",
        total: row.total,
        totalPaid: row.totalPaid ?? 0,
        sellDue: row.sellDue ?? 0,
      })),
      `Export ${tabLabel} Spreadsheet`,
    );
  };

  const actionColumn: ColumnConfig<Sale> = useMemo(
    () => ({
      key: "actions",
      header: "Action",
      sortable: false,
      render: (row) => {
        const isQuotation = row.recordStatus === "quotation";
        const isDraft = row.recordStatus === "draft";
        const isProvisional = isQuotation || isDraft;
        const editPath = isQuotation
          ? `${tenantBasePath(tenantCode)}/add-quotation?edit=${row.id}`
          : isDraft
            ? `${tenantBasePath(tenantCode)}/add-draft?edit=${row.id}`
            : `${tenantBasePath(tenantCode)}/add-sale?edit=${row.id}`;
        const copyPath = isQuotation
          ? `${tenantBasePath(tenantCode)}/add-quotation?edit=${row.id}&copy=1`
          : `${tenantBasePath(tenantCode)}/add-draft?edit=${row.id}&copy=1`;
        const notifyKind = isQuotation
          ? "quotation"
          : isDraft
            ? "draft"
            : "sale";
        const notifyLabel = isQuotation
          ? "New quotation notification"
          : isDraft
            ? "New draft notification"
            : "New Sale Notification";

        // Main sales Actions format (packing slip list) for every sales list.
        const items = [
          {
            id: "view",
            label: "View",
            onClick: () => openRecord(row.id, row),
          },
          {
            id: "edit",
            label: "Edit",
            onClick: () => router.push(editPath),
          },
          // Add Payment for open balances (due / partial / overdue).
          ...(!isProvisional &&
          canAddPaymentForStatus(row.paymentStatus, row.sellDue)
            ? [
                {
                  id: "add_payment",
                  label: "Add Payment",
                  dividerBefore: true,
                  onClick: () => {
                    if (tenantId) {
                      prefetchPaymentAccountsRef(queryClient, tenantId);
                    }
                    setPaySale(row);
                  },
                },
                {
                  id: "view_payments",
                  label: "View Payments",
                  onClick: () => {
                    if (tenantId) {
                      prefetchSalePaymentsModal(queryClient, tenantId, row.id);
                    }
                    setPaymentsSale(row);
                  },
                },
              ]
            : [
                {
                  id: "view_payments",
                  label: "View Payments",
                  dividerBefore: true,
                  onClick: () => {
                    if (tenantId) {
                      prefetchSalePaymentsModal(queryClient, tenantId, row.id);
                    }
                    setPaymentsSale(row);
                  },
                },
              ]),
          ...(isProvisional
            ? [
                {
                  id: "convert",
                  label: "Convert to Proforma Invoice",
                  onClick: () => setConvertTarget(row),
                },
              ]
            : []),
          ...(isJobCentricTenant(tenantCode) && row.jobId
            ? [
                {
                  id: "update_job_status",
                  label: "Update job status",
                  dividerBefore: true,
                  onClick: () => setJobStatusSale(row),
                },
              ]
            : []),
          {
            id: "delete",
            label: "Delete",
            danger: true,
            onClick: () => setDeleteTarget(row),
          },
          {
            id: "edit_shipping",
            label: "Edit Shipping",
            onClick: () => setShippingSale(row),
          },
          {
            id: "print",
            label: "Print Invoice",
            onClick: () => setPrintDoc({ sale: row, kind: "invoice" as const }),
          },
          {
            id: "packing_slip",
            label: "Packing Slip",
            onClick: () =>
              setPrintDoc({ sale: row, kind: "packing_slip" as const }),
          },
          {
            id: "delivery_note",
            label: "Delivery Note",
            onClick: () =>
              setPrintDoc({ sale: row, kind: "delivery_note" as const }),
          },
          {
            id: "sell_return",
            label: "Sell Return",
            onClick: () =>
              router.push(`${tenantBasePath(tenantCode)}/returns?saleId=${row.id}`),
          },
          {
            id: "invoice_url",
            label: isQuotation ? "View quote url" : "Invoice URL",
            onClick: () => setInvoiceUrlSale(row),
          },
          {
            id: "notify",
            label: notifyLabel,
            onClick: () => void sendSaleNotification(row, notifyKind),
          },
          {
            id: "terms",
            label: "Terms and Conditions",
            onClick: () => setPrintDoc({ sale: row, kind: "terms" as const }),
          },
          ...(isProvisional
            ? [
                {
                  id: "copy_quotation",
                  label: isQuotation ? "Copy Quotation" : "Copy Draft",
                  onClick: () => router.push(copyPath),
                },
              ]
            : []),
        ];
        const guarded = items.map((item) => {
          if (
            item.id === "edit" ||
            item.id === "edit_shipping" ||
            item.id === "convert" ||
            item.id === "update_job_status"
          ) {
            const run = item.onClick;
            return {
              ...item,
              onClick: () => {
                if (!requireUpdateSale()) return;
                run?.();
              },
            };
          }
          if (item.id === "delete") {
            const run = item.onClick;
            return {
              ...item,
              onClick: () => {
                if (!requireDeleteSale()) return;
                run?.();
              },
            };
          }
          if (item.id === "copy_quotation") {
            const run = item.onClick;
            return {
              ...item,
              onClick: () => {
                if (!requireCreateSale()) return;
                run?.();
              },
            };
          }
          return item;
        });
        return (
          <Hq6ActionsMenu
            items={guarded}
            onOpenChange={(menuOpen) => {
              if (menuOpen && tenantId) {
                prefetchSaleListModals(queryClient, tenantId, row.id);
              }
            }}
          />
        );
      },
    }),
    [
      openRecord,
      queryClient,
      requireCreateSale,
      requireDeleteSale,
      requireUpdateSale,
      router,
      saleStatus,
      sendSaleNotification,
      tenantCode,
      tenantId,
    ],
  );

  const columns: ColumnConfig<Sale>[] = useMemo(() => {
    const loc = (row: Sale) =>
      businessLocationName(row.locationCode, config?.businessLocations) ?? "—";

    // Match All sales: Action first so Sales ↔ Quotations does not jump layout.
    if (saleStatus === "draft" || saleStatus === "quotation") {
      return [
        actionColumn,
        {
          key: "date",
          header: "Date",
          sortValue: (row) => new Date(row.createdAt).getTime(),
          render: (row) => formatHq6DateTime(row.createdAt),
        },
        {
          key: "reference",
          header: "Reference No",
          render: (row) => (
            <span className="font-semibold">{row.reference}</span>
          ),
        },
        {
          key: "customerName",
          header: "Customer name",
          sortable: false,
          render: (row) => (
            <SaleCustomerCell row={row} showVehicleMeta={showVehicleMeta} />
          ),
        },
        {
          key: "customerPhone",
          header: "Contact Number",
          sortable: false,
          render: (row) => row.customerPhone ?? "—",
        },
        {
          key: "locationCode",
          header: "Location",
          sortable: false,
          render: (row) => loc(row),
        },
        {
          key: "itemCount",
          header: "Total Items",
          numeric: true,
          sortValue: (row) => row.itemCount,
          render: (row) => row.itemCount,
        },
        {
          key: "addedBy",
          header: "Added By",
          sortable: false,
          render: (row) => row.createdByName ?? "—",
        },
      ];
    }

    // UPOS sell/shipments
    if (shipmentsOnly) {
      return [
        actionColumn,
        {
          key: "date",
          header: "Date",
          sortValue: (row) => new Date(row.createdAt).getTime(),
          render: (row) => formatHq6DateTime(row.createdAt),
        },
        {
          key: "reference",
          header: "Invoice No.",
          render: (row) => (
            <span className="font-semibold">{row.reference}</span>
          ),
        },
        {
          key: "customerName",
          header: "Customer name",
          sortable: false,
          render: (row) => (
            <SaleCustomerCell row={row} showVehicleMeta={showVehicleMeta} />
          ),
        },
        {
          key: "customerPhone",
          header: "Contact Number",
          sortable: false,
          render: (row) => row.customerPhone ?? "—",
        },
        {
          key: "locationCode",
          header: "Location",
          sortable: false,
          render: (row) => loc(row),
        },
        {
          key: "deliveryPerson",
          header: "Delivery Person",
          sortable: false,
          render: () => "",
        },
        {
          key: "shippingStatus",
          header: "Shipping Status",
          sortable: false,
          render: (row) => row.shippingStatus ?? "",
        },
        {
          key: "paymentStatus",
          header: "Payment Status",
          render: (row) => {
            const canPay = canAddPaymentForStatus(
              row.paymentStatus,
              row.sellDue,
            );
            return (
              <button
                type="button"
                className={cn(
                  "hq6-pay-badge",
                  paymentBadgeClass(row.paymentStatus),
                )}
                title={canPay ? "Add Payment" : "View Payments"}
                onClick={(e) => {
                  e.stopPropagation();
                  if (tenantId) {
                    if (canPay) {
                      prefetchPaymentAccountsRef(queryClient, tenantId);
                      setPaySale(row);
                    } else {
                      prefetchSalePaymentsModal(queryClient, tenantId, row.id);
                      setPaymentsSale(row);
                    }
                  } else if (canPay) {
                    setPaySale(row);
                  } else {
                    setPaymentsSale(row);
                  }
                }}
              >
                {formatHq6PaymentStatus(row.paymentStatus)}
              </button>
            );
          },
        },
        {
          key: "serviceStaff",
          header: "Service staff",
          sortable: false,
          render: (row) =>
            row.serviceStaffEmployeeName?.trim() ||
            row.cleanerName?.trim() ||
            "—",
        },
      ];
    }

    // UPOS sell/index + List POS
    return [
      actionColumn,
      {
        key: "date",
        header: "Date",
        sortValue: (row) => new Date(row.createdAt).getTime(),
        render: (row) => formatHq6DateTime(row.createdAt),
      },
      {
        key: "reference",
        header: "Invoice No.",
        render: (row) => <span className="font-semibold">{row.reference}</span>,
      },
      {
        key: "customerName",
        header: "Customer name",
        sortable: false,
        render: (row) => (
          <SaleCustomerCell row={row} showVehicleMeta={showVehicleMeta} />
        ),
      },
      {
        key: "customerPhone",
        header: "Contact Number",
        sortable: false,
        render: (row) => row.customerPhone ?? "—",
      },
      {
        key: "serviceStaff",
        header: "Service staff",
        sortable: false,
        render: (row) =>
          row.serviceStaffEmployeeName?.trim() ||
          row.cleanerName?.trim() ||
          "—",
      },
      {
        key: "locationCode",
        header: "Location",
        sortable: false,
        render: (row) => loc(row),
      },
      {
        key: "paymentStatus",
        header: "Payment Status",
        render: (row) => {
          const canPay = canAddPaymentForStatus(
            row.paymentStatus,
            row.sellDue,
          );
          return (
            <button
              type="button"
              className={cn(
                "hq6-pay-badge",
                paymentBadgeClass(row.paymentStatus),
              )}
              title={canPay ? "Add Payment" : "View Payments"}
              onClick={(e) => {
                e.stopPropagation();
                if (tenantId) {
                  if (canPay) {
                    prefetchPaymentAccountsRef(queryClient, tenantId);
                    setPaySale(row);
                  } else {
                    prefetchSalePaymentsModal(queryClient, tenantId, row.id);
                    setPaymentsSale(row);
                  }
                } else if (canPay) {
                  setPaySale(row);
                } else {
                  setPaymentsSale(row);
                }
              }}
            >
              {formatHq6PaymentStatus(row.paymentStatus)}
            </button>
          );
        },
      },
      {
        key: "paymentMethod",
        header: "Payment Method",
        sortable: false,
        render: (row) => formatHq6PaymentMethod(row.paymentMethod),
      },
      {
        key: "paymentNote",
        header: "Payment note",
        sortable: false,
        render: (row) => row.paymentNote ?? "",
      },
      {
        key: "total",
        header: "Total amount",
        numeric: true,
        sortValue: (row) => row.total,
        render: (row) => formatHq6Currency(row.total, row.currency),
      },
      {
        key: "totalPaid",
        header: "Total paid",
        numeric: true,
        sortable: false,
        sortValue: (row) => row.totalPaid ?? 0,
        render: (row) => formatHq6Currency(row.totalPaid ?? 0, row.currency),
      },
      {
        key: "sellDue",
        header: "Sell Due",
        numeric: true,
        sortable: false,
        sortValue: (row) => row.sellDue ?? 0,
        render: (row) => formatHq6Currency(row.sellDue ?? 0, row.currency),
      },
      {
        key: "sellReturnDue",
        header: "Sell Return Due",
        numeric: true,
        sortable: false,
        render: () => formatHq6Currency(0),
      },
      {
        key: "shippingStatus",
        header: "Shipping Status",
        sortable: false,
        render: (row) => row.shippingStatus ?? "",
      },
      {
        key: "itemCount",
        header: "Total Items",
        numeric: true,
        sortValue: (row) => row.itemCount,
        render: (row) => row.itemCount,
      },
      {
        key: "addedBy",
        header: "Added By",
        sortable: false,
        render: (row) => row.createdByName ?? "—",
      },
      {
        key: "sellNote",
        header: "Sell note",
        sortable: false,
        render: (row) => formatSaleNotesForDisplay(row.notes),
      },
      {
        key: "staffNote",
        header: "Staff note",
        sortable: false,
        render: () => "",
      },
      {
        key: "shippingDetails",
        header: "Shipping Details",
        sortable: false,
        render: (row) => row.shippingAddress ?? "",
      },
    ];
  }, [actionColumn, config?.businessLocations, saleStatus, shipmentsOnly]);

  const columnOptions = useMemo(
    () =>
      columns
        .filter((c) => c.key !== "actions")
        .map((c) => ({ key: c.key, label: String(c.header || c.key) })),
    [columns],
  );

  // Saved column prefs from before newer columns existed omit them — force on.
  useEffect(() => {
    const keys = chrome.visibleColumnKeys;
    if (!keys) return;
    const missing: string[] = [];
    for (const key of ["serviceStaff", "customerPhone", "paymentMethod"] as const) {
      if (keys.includes(key)) continue;
      if (!columnOptions.some((c) => c.key === key)) continue;
      missing.push(key);
    }
    if (missing.length === 0) return;
    chrome.setVisibleColumnKeys([...keys, ...missing]);
  }, [
    chrome.visibleColumnKeys,
    chrome.setVisibleColumnKeys,
    columnOptions,
  ]);

  const effectiveColumns = useMemo(() => {
    if (!chrome.visibleColumnKeys) return columns;
    const allowed = new Set(["actions", ...chrome.visibleColumnKeys]);
    return columns.filter((c) => allowed.has(c.key));
  }, [chrome.visibleColumnKeys, columns]);

  const totals = useMemo(() => {
    let totalAmount = 0;
    let totalPaid = 0;
    let totalDue = 0;
    let paidCount = 0;
    let dueCount = 0;
    let partialCount = 0;
    const methodCounts: Record<string, number> = {};
    for (const row of sales) {
      totalAmount += row.total;
      totalPaid += row.totalPaid ?? 0;
      totalDue += row.sellDue ?? 0;
      if (row.paymentStatus === "paid") paidCount += 1;
      else if (row.paymentStatus === "partial") partialCount += 1;
      else dueCount += 1;
      if (row.paymentMethod) {
        methodCounts[row.paymentMethod] = (methodCounts[row.paymentMethod] ?? 0) + 1;
      }
    }
    return {
      totalAmount,
      totalPaid,
      totalDue,
      paidCount,
      dueCount,
      partialCount,
      methodCounts,
    };
  }, [sales]);

  return (
    <>
      <Hq6StandardListShell
        slug={slug}
        title={
          slug === "pos"
            ? "POS"
            : slug === "sales"
              ? "Sales"
              : slug === "drafts"
                ? "Drafts"
                : slug === "quotations"
                  ? "List quotations"
                  : slug === "shipments"
                    ? "Shipments"
                    : tabLabel.replace(/^All /i, "")
        }
        tabLabel={tabLabel}
        boxTitle={
          slug === "drafts" ||
          slug === "quotations" ||
          slug === "shipments"
            ? ""
            : undefined
        }
        addLabel={
          slug === "drafts"
            ? "Add Draft"
            : slug === "quotations"
              ? "Add Quotation"
              : "Add"
        }
        hidePrimaryAction={hidePrimaryAction}
        onAdd={() => {
          if (!requireCreateSale()) return;
          if (!tenantCode) return;
          if (slug === "pos") {
            router.push(`${tenantBasePath(tenantCode)}/pos-terminal`);
            return;
          }
          // HQ6 Add Sale / Draft / Quotation are full create pages, not modals.
          const createSlug =
            slug === "drafts"
              ? "add-draft"
              : slug === "quotations"
                ? "add-quotation"
                : "add-sale";
          router.push(`${tenantBasePath(tenantCode)}/${createSlug}`);
        }}
        onExport={handleExport}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search ..."
        columnOptions={columnOptions}
        chrome={chrome}
        filters={
          <Hq6FilterGrid>
            <Hq6FilterDateRange
              value={dateRange}
              onChange={setDateRange}
              customValue={customDateRange}
              onCustomChange={setCustomDateRange}
            />
            {!saleStatus ? (
              <Hq6FilterSelect
                label="Status"
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: "", label: "All" },
                  { value: "Completed", label: "Completed" },
                  { value: "Refunded", label: "Refunded" },
                  { value: "Restocked", label: "Restocked" },
                  { value: "Written Off", label: "Written Off" },
                ]}
              />
            ) : null}
            <Hq6FilterSelect
              label="Payment Status"
              value={paymentStatusFilter}
              onChange={setPaymentStatusFilter}
              options={[
                { value: "", label: "All" },
                { value: "paid", label: "Paid" },
                { value: "due", label: "Due" },
                { value: "partial", label: "Partial" },
                { value: "overdue", label: "Overdue" },
              ]}
            />
            <Hq6FilterSelect
              label="Payment Method"
              value={paymentMethodFilter}
              onChange={setPaymentMethodFilter}
              options={[
                { value: "", label: "All" },
                ...HQ6_PAYMENT_METHOD_OPTIONS.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                })),
              ]}
            />
            <Hq6FilterSelect
              label="Business Location"
              value={locationFilter}
              onChange={setLocationFilter}
              emptyLabel="All locations"
              options={entitySaleLocations(config).map((loc) => ({
                value: loc.code,
                label: loc.name,
              }))}
            />
            <Hq6FilterSelect
              label="Customer"
              value={customerFilter}
              selectedLabel={customerLabel}
              onChange={(id) => {
                setCustomerFilter(id);
                setCustomerLabel(
                  id ? customerLabelById.current.get(id) ?? "" : "",
                );
              }}
              emptyLabel="All"
              loadOptions={loadCustomerOptions}
              loadMoreOptions={loadMoreCustomerOptions}
              prefetchKey={tenantId}
            />
            <Hq6FilterSelect
              label="Service staff"
              value={serviceStaffFilter}
              selectedLabel={serviceStaffLabel}
              onChange={(id) => {
                setServiceStaffFilter(id);
                setServiceStaffLabel(
                  id ? staffLabelById.current.get(id) ?? "" : "",
                );
              }}
              emptyLabel="All"
              loadOptions={loadServiceStaffOptions}
              loadMoreOptions={loadMoreServiceStaffOptions}
              prefetchKey={tenantId}
            />
          </Hq6FilterGrid>
        }
        tableFooter={
          saleStatus === "draft" || saleStatus === "quotation" ? null : (
            <div className="space-y-0">
              {sales.length > 0 && amountSummary ? (
                <Hq6ListAmountFooter
                  title="All matching"
                  cells={[
                    {
                      label: "Total",
                      amount: amountSummary.totalAmount ?? 0,
                      currency: sales[0]?.currency,
                    },
                    ...(amountSummary.totalPaid != null
                      ? [
                          {
                            label: "Paid",
                            amount: amountSummary.totalPaid,
                            currency: sales[0]?.currency,
                          },
                        ]
                      : []),
                    ...(amountSummary.totalDue != null
                      ? [
                          {
                            label: "Due",
                            amount: amountSummary.totalDue,
                            currency: sales[0]?.currency,
                          },
                        ]
                      : []),
                  ]}
                />
              ) : null}
              <Hq6ListAmountFooter
                title="Total:"
                cells={[
                  {
                    label: "Total amount",
                    amount: totals.totalAmount,
                    currency: sales[0]?.currency ?? "NGN",
                  },
                  {
                    label: "Total paid",
                    amount: totals.totalPaid,
                    currency: sales[0]?.currency ?? "NGN",
                  },
                  {
                    label: "Sell Due",
                    amount: totals.totalDue,
                    currency: sales[0]?.currency ?? "NGN",
                  },
                  {
                    label: "Sell Return Due",
                    amount: 0,
                    currency: sales[0]?.currency ?? "NGN",
                  },
                ]}
              />
            </div>
          )
        }
        summaryStrip={
          sales.length > 0 ? (
            <Hq6SalesSummaryStrip
              paidCount={totals.paidCount}
              dueCount={totals.dueCount}
              partialCount={totals.partialCount}
              methodCounts={totals.methodCounts}
            />
          ) : null
        }
        pagination={{
          pageIndex,
          pageSize,
          itemCount: sales.length,
          hasMore,
          canGoPrev,
          onPrev: goPrev,
          onNext: goNext,
          onPageSizeChange: setPageSize,
          onPageSelect: goToPage,
          canSelectPage,
          totalItems: totalCount,
          isBusy: isPaging,
        isSearching,
          // Keep bar visible while changing pages (loading clears rows briefly).
          show:
            sales.length > 0 ||
            canGoPrev ||
            hasMore ||
            pageIndex > 0 ||
            isFetching ||
            isLoading,
        }}
        modals={
          <>
            <SaleRecordModal
              saleId={recordId}
              initialSale={recordSeed}
              listSlug="sales"
              onClose={closeRecord}
            />
            <Hq6UpdateJobStatusModal
              open={Boolean(jobStatusSale)}
              sale={jobStatusSale}
              onClose={() => setJobStatusSale(null)}
              onUpdated={() => {
                void queryClient.invalidateQueries({ queryKey: ["jobs"] });
                void queryClient.invalidateQueries({ queryKey: ["sales"] });
              }}
            />
            <Hq6ConfirmModal
              open={Boolean(deleteTarget)}
              onClose={() => setDeleteTarget(null)}
              onConfirm={() => {
                if (!tenantId || !deleteTarget) return;
                const target = deleteTarget;
                void dismissFirstWrite({
                  dismiss: () => {
                    setDeleteTarget(null);
                    removeEntityFromQueries(queryClient, ["sales"], target.id);
                    reset();
                  },
                  write: () => deleteSale(tenantId, target.id),
                  label: "Deleting",
                  successMessage: `Deleted sale ${target.reference}`,
                  onSuccess: () => {
                    void queryClient.invalidateQueries({ queryKey: ["sales"] });
                    void queryClient.invalidateQueries({ queryKey: ["items"] });
                    void queryClient.invalidateQueries({
                      queryKey: ["catalog"],
                    });
                  },
                });
              }}
              title="Are you sure ?"
              message={
                deleteTarget
                  ? `Delete sale ${deleteTarget.reference}?`
                  : "Are you sure ?"
              }
              confirmLabel="Delete"
              danger
            />
            <Hq6ConfirmModal
              open={Boolean(convertTarget)}
              onClose={() => setConvertTarget(null)}
              onConfirm={() => {
                if (!tenantId || !convertTarget) return;
                const target = convertTarget;
                const leaveToSales =
                  Boolean(tenantCode) &&
                  (saleStatus === "draft" || saleStatus === "quotation");
                void dismissFirstWrite({
                  dismiss: () => {
                    setConvertTarget(null);
                    removeEntityFromQueries(queryClient, ["sales"], target.id);
                    if (leaveToSales && tenantCode) {
                      announceRedirect("Converting & opening sales…");
                      router.push(`${tenantBasePath(tenantCode)}/sales`);
                    }
                  },
                  write: () =>
                    finalizeSale(tenantId, target.id),
                  label: "Converting",
                  successMessage: `Converted ${target.reference} to invoice`,
                  onSuccess: () => {
                    void queryClient.invalidateQueries({ queryKey: ["sales"] });
                    void queryClient.invalidateQueries({ queryKey: ["items"] });
                  },
                });
              }}
              title="Convert to Proforma Invoice?"
              message={
                convertTarget
                  ? `Convert ${convertTarget.reference} into a finalized sale invoice? Stock will be deducted and the record will leave drafts/quotations.`
                  : ""
              }
              confirmLabel="Convert"
            />
            <Hq6EditShippingModal
              open={Boolean(shippingSale)}
              tenantId={tenantId}
              sale={shippingSale}
              onClose={() => setShippingSale(null)}
              onSaved={() => {
                void queryClient.invalidateQueries({ queryKey: ["sales"] });
              }}
            />
            <Hq6ViewPaymentsModal
              open={Boolean(paymentsSale)}
              title={
                paymentsSale
                  ? `View Payments ( Invoice No.: ${paymentsSale.reference} )`
                  : "View Payments"
              }
              tenantId={tenantId}
              kind="sale"
              recordId={paymentsSale?.id ?? null}
              context={
                paymentsSale
                  ? {
                      customerName: paymentsSale.customerName,
                      customerPhone: paymentsSale.customerPhone,
                      businessName: config?.name ?? undefined,
                      businessLocation: businessLocationName(
                        paymentsSale.locationCode,
                        config?.businessLocations,
                      ),
                      businessMobile:
                        typeof config?.businessSettings?.business?.mobile ===
                        "string"
                          ? config.businessSettings.business.mobile
                          : typeof config?.businessSettings?.business?.phone ===
                              "string"
                            ? config.businessSettings.business.phone
                            : null,
                      businessEmail:
                        typeof config?.businessSettings?.business?.email ===
                        "string"
                          ? config.businessSettings.business.email
                          : null,
                      invoiceNo: paymentsSale.reference,
                      date: paymentsSale.date ?? paymentsSale.createdAt,
                      paymentStatus: paymentsSale.paymentStatus,
                      remainingDue: paymentsSale.sellDue,
                    }
                  : null
              }
              onClose={() => setPaymentsSale(null)}
              onAddPayment={
                paymentsSale &&
                canAddPaymentForStatus(
                  paymentsSale.paymentStatus,
                  paymentsSale.sellDue,
                )
                  ? () => {
                      const sale = paymentsSale;
                      if (tenantId) {
                        prefetchPaymentAccountsRef(queryClient, tenantId);
                      }
                      // Close View Payments and open Add Payment together.
                      setPaymentsSale(null);
                      setPaySale(sale);
                    }
                  : undefined
              }
            />
            <Hq6PaySaleModal
              open={Boolean(paySale)}
              sale={paySale}
              tenantId={tenantId}
              onClose={() => setPaySale(null)}
              onPaid={(saleId) => {
                // Do not invalidate ["sales"] here — Pay modal already patched
                // the list row. A refetch can race server list cache and flip
                // Paid back to Due.
                void queryClient.invalidateQueries({
                  queryKey: modalKeys.saleView(tenantId, saleId),
                });
                void queryClient.invalidateQueries({
                  queryKey: modalKeys.salePayments(tenantId, saleId),
                });
              }}
            />
            <Hq6InvoiceUrlModal
              open={Boolean(invoiceUrlSale)}
              tenantId={tenantId}
              saleId={invoiceUrlSale?.id ?? null}
              invoiceNo={invoiceUrlSale?.reference}
              onClose={() => setInvoiceUrlSale(null)}
            />
            <Hq6PrintInvoiceModal
              open={Boolean(printDoc)}
              saleId={printDoc?.sale.id ?? null}
              initialSale={printDoc?.sale ?? null}
              kind={printDoc?.kind ?? "invoice"}
              autoPrint
              onClose={() => setPrintDoc(null)}
            />
          </>
        }
      >
        <DataTable
          data={sales}
          columns={effectiveColumns}
          displayMode="table"
          embedded
          disablePagination
          stickyFirstColumn
          density={chrome.density}
          onDensityChange={chrome.setDensity}
          showDensityControl={false}
          isLoading={isLoading || isSearching}
          isFetching={(isFetching || isSearching) && !isLoading}
          error={error ? "Could not load sales." : null}
          onRowClick={(row) => openRecord(row.id, row)}
          emptyState={{ message: "No data available in table" }}
          serverSort={serverSortProps({ sort, setSort })}
        />
      </Hq6StandardListShell>
    </>
  );
}
