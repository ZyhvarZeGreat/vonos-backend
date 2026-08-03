"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { getCustomers } from "@/lib/api/customers";
import { getServiceStaff } from "@/lib/api/hrm";
import { useServerListPage, serverSortProps, withListSort } from "@/lib/hooks/useServerListPage";
import { HQ6_TABLE_PAGE_SIZE } from "@/lib/api/fetchAllPages";
import { useListExport } from "@/lib/hooks/useListExport";
import { useListRecordModal } from "@/lib/hooks/useListRecordModal";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
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
import { businessLocationName } from "@/lib/utils/locationLabels";
import { entitySaleLocations } from "@/lib/hooks/useBusinessLocationOptions";
import { hq6PaymentBadgeClass, canAddPaymentForStatus } from "@/lib/utils/hq6PaymentBadge";
import type { Sale, SaleReturnStatus, SaleStatus } from "@vonos/types";
import { cn } from "@/lib/utils/cn";

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
  const [locationFilter, setLocationFilter] = useState("");
  const [customerFilter, setCustomerFilter] = useState("");
  const [serviceStaffFilter, setServiceStaffFilter] = useState("");
  const chrome = useHq6ListChrome(slug);
  const [deleteTarget, setDeleteTarget] = useState<Sale | null>(null);
  const [invoiceUrlSale, setInvoiceUrlSale] = useState<Sale | null>(null);
  const [paymentsSale, setPaymentsSale] = useState<Sale | null>(null);
  const [paySale, setPaySale] = useState<Sale | null>(null);
  const [shippingSale, setShippingSale] = useState<Sale | null>(null);
  const [printDoc, setPrintDoc] = useState<{
    sale: Sale;
    kind: Hq6PrintDocKind;
  } | null>(null);
  const [convertTarget, setConvertTarget] = useState<Sale | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [converting, setConverting] = useState(false);

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
      locationCode: locationFilter || undefined,
      customerId: customerFilter || undefined,
      serviceStaffEmployeeId: serviceStaffFilter || undefined,
      from: bounds?.from,
      to: bounds?.to,
    }),
    [
      bounds?.from,
      bounds?.to,
      customerFilter,
      locationFilter,
      paymentStatusFilter,
      saleStatus,
      search,
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
    defaultPageSize: HQ6_TABLE_PAGE_SIZE,
    defaultSort: { sortBy: "date", sortDir: "desc" },
    // Warm the next page so Next feels instant after first paint.
    prefetchPagesAhead: 1,
    staleTime: 5 * 60_000,
    fetchPage: (cursor, limit, listSort, opts) =>
      getSalesPage(
        tenantId!,
        withListSort(
          { ...apiFilters, includeSummary: opts?.includeSummary },
          listSort,
        ),
        cursor,
        limit,
      ),
    getCursor: (row, listSort) => {
      const sortBy = listSort?.sortBy ?? "date";
      const type =
        sortBy === "total" ? "number" : sortBy === "date" || sortBy === "createdAt" ? "date" : "string";
      return compositeListCursorFrom(row, sortBy, type);
    },
  });

  // Load filter dropdowns after rows — don't compete with first paint.
  const customersQuery = useQuery({
    queryKey: ["customers", tenantId, "sale-filter"],
    queryFn: () => getCustomers(tenantId!),
    enabled: Boolean(tenantId) && !isLoading,
    staleTime: 5 * 60_000,
  });

  const serviceStaffQuery = useQuery({
    queryKey: ["service-staff", tenantId, "sale-filter"],
    queryFn: () => getServiceStaff(tenantId!, undefined, { limit: 200 }),
    enabled: Boolean(tenantId) && !isLoading,
    staleTime: 5 * 60_000,
  });

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
        const isQuotation =
          saleStatus === "quotation" || row.recordStatus === "quotation";
        const isDraft =
          saleStatus === "draft" || row.recordStatus === "draft";
        const isProvisional = isQuotation || isDraft;
        const showAddPayment =
          !isProvisional &&
          canAddPaymentForStatus(row.paymentStatus, row.sellDue);
        const editPath = isQuotation
          ? `/${tenantCode}/add-quotation?edit=${row.id}`
          : isDraft
            ? `/${tenantCode}/add-draft?edit=${row.id}`
            : `/${tenantCode}/add-sale?edit=${row.id}`;
        const copyPath = isQuotation
          ? `/${tenantCode}/add-quotation?edit=${row.id}&copy=1`
          : `/${tenantCode}/add-draft?edit=${row.id}&copy=1`;
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
          // Add Payment only for open balances (due / partial) — not paid, not drafts.
          ...(showAddPayment
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
              ]
            : []),
          ...(!isProvisional
            ? [
                {
                  id: "view_payments",
                  label: "View Payments",
                  dividerBefore: !showAddPayment,
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
              router.push(`/${tenantCode}/returns?saleId=${row.id}`),
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
            item.id === "convert"
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
        return <Hq6ActionsMenu items={guarded} />;
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

    // UPOS sells/draft · quotations — Action last
    if (saleStatus === "draft" || saleStatus === "quotation") {
      return [
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
          render: (row) => row.customerName,
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
        actionColumn,
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
          render: (row) => row.customerName,
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
          render: (row) => (
            <button
              type="button"
              className={cn(
                "hq6-pay-badge",
                paymentBadgeClass(row.paymentStatus),
              )}
              title="View Payments"
              onClick={(e) => {
                e.stopPropagation();
                if (tenantId) {
                  prefetchSalePaymentsModal(queryClient, tenantId, row.id);
                }
                setPaymentsSale(row);
              }}
            >
              {formatHq6PaymentStatus(row.paymentStatus)}
            </button>
          ),
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
          <div>
            <div className="font-medium">{row.customerName}</div>
            {row.jobReference ? (
              <div className="text-xs text-[#6b7280]">{row.jobReference}</div>
            ) : null}
          </div>
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
        render: (row) => (
          <button
            type="button"
            className={cn(
              "hq6-pay-badge",
              paymentBadgeClass(row.paymentStatus),
            )}
            title="View Payments"
            onClick={(e) => {
              e.stopPropagation();
              if (tenantId) {
                prefetchSalePaymentsModal(queryClient, tenantId, row.id);
              }
              setPaymentsSale(row);
            }}
          >
            {formatHq6PaymentStatus(row.paymentStatus)}
          </button>
        ),
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
        render: (row) => row.notes ?? "",
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
    for (const key of ["serviceStaff", "customerPhone"] as const) {
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
            router.push(`/${tenantCode}/pos-terminal`);
            return;
          }
          // HQ6 Add Sale / Draft / Quotation are full create pages, not modals.
          const createSlug =
            slug === "drafts"
              ? "add-draft"
              : slug === "quotations"
                ? "add-quotation"
                : "add-sale";
          router.push(`/${tenantCode}/${createSlug}`);
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
              label="Business Location"
              value={locationFilter}
              onChange={setLocationFilter}
              options={entitySaleLocations(config).map((loc) => ({
                value: loc.code,
                label: loc.name,
              }))}
            />
            <Hq6FilterSelect
              label="Customer"
              value={customerFilter}
              onChange={setCustomerFilter}
              emptyLabel="All"
              options={(customersQuery.data ?? []).map((c) => ({
                value: c.id,
                label: c.businessName || c.name,
              }))}
            />
            <Hq6FilterSelect
              label="Service staff"
              value={serviceStaffFilter}
              onChange={setServiceStaffFilter}
              emptyLabel="All"
              options={(serviceStaffQuery.data ?? []).map((e) => ({
                value: e.id,
                label: e.name,
              }))}
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
          isBusy: isPaging || isLoading,
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
            <Hq6ConfirmModal
              open={Boolean(deleteTarget)}
              onClose={() => setDeleteTarget(null)}
              onConfirm={() => {
                if (!tenantId || !deleteTarget || deleting) return;
                const target = deleteTarget;
                setDeleting(true);
                void deleteSale(tenantId, target.id)
                  .then(async () => {
                    toast.success(`Deleted sale ${target.reference}`);
                    setDeleteTarget(null);
                    // Drop the row immediately so the table never paints a
                    // stale cursor page that can error after Soft-delete.
                    queryClient.setQueriesData(
                      { queryKey: ["sales", tenantId] },
                      (prev: unknown) => {
                        if (!prev || typeof prev !== "object") return prev;
                        const page = prev as {
                          items?: Sale[];
                          hasMore?: boolean;
                          totalCount?: number;
                        };
                        if (!Array.isArray(page.items)) return prev;
                        return {
                          ...page,
                          items: page.items.filter((row) => row.id !== target.id),
                          totalCount:
                            typeof page.totalCount === "number"
                              ? Math.max(0, page.totalCount - 1)
                              : page.totalCount,
                        };
                      },
                    );
                    reset();
                    await queryClient.invalidateQueries({ queryKey: ["sales"] });
                    await queryClient.invalidateQueries({ queryKey: ["items"] });
                    await queryClient.invalidateQueries({
                      queryKey: ["catalog"],
                    });
                  })
                  .catch((err) => {
                    toast.error(
                      err instanceof Error ? err.message : "Failed to delete sale",
                    );
                  })
                  .finally(() => setDeleting(false));
              }}
              title="Are you sure ?"
              message={
                deleteTarget
                  ? `Delete sale ${deleteTarget.reference}?`
                  : "Are you sure ?"
              }
              confirmLabel="Delete"
              danger
              confirming={deleting}
            />
            <Hq6ConfirmModal
              open={Boolean(convertTarget)}
              onClose={() => setConvertTarget(null)}
              confirming={converting}
              onConfirm={() => {
                if (!tenantId || !convertTarget || converting) return;
                setConverting(true);
                void finalizeSale(tenantId, convertTarget.id, {
                  payments: [{ amount: 0, method: "cash" }],
                })
                  .then(async () => {
                    toast.success(
                      `Converted ${convertTarget.reference} to invoice`,
                    );
                    setConvertTarget(null);
                    await queryClient.invalidateQueries({ queryKey: ["sales"] });
                  })
                  .catch((err) => {
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : "Failed to convert to invoice",
                    );
                  })
                  .finally(() => setConverting(false));
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
              onPaid={() => {
                void queryClient.invalidateQueries({ queryKey: ["sales"] });
                if (paySale) {
                  void queryClient.invalidateQueries({
                    queryKey: modalKeys.saleView(tenantId, paySale.id),
                  });
                  void queryClient.invalidateQueries({
                    queryKey: modalKeys.salePayments(tenantId, paySale.id),
                  });
                }
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
          isLoading={isLoading}
          isFetching={isFetching && !isLoading}
          error={error ? "Could not load sales." : null}
          onRowClick={(row) => openRecord(row.id, row)}
          emptyState={{ message: "No data available in table" }}
          serverSort={serverSortProps({ sort, setSort })}
        />
      </Hq6StandardListShell>
    </>
  );
}
