"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { InvoiceKind, InvoiceListRow } from "@vonos/types";
import { StatusPill } from "@/components/atoms/StatusPill";
import { type ColumnConfig } from "@/components/organisms/DataTable";
import { DocumentPreviewModal } from "@/components/organisms/DocumentPreviewModal";
import { InvoiceDocument } from "@/components/organisms/InvoiceDocument";
import { ServerPaginatedTable } from "@/components/organisms/ServerPaginatedTable";
import { ListPageShell } from "@/components/organisms/ListPageShell";
import { RowActionsMenu } from "@/components/molecules/RowActionsMenu";
import { getInvoice, getInvoicesPage } from "@/lib/api/invoices";
import { getInvoiceSettings } from "@/lib/api/invoiceSettings";
import { serverPaginationBarProps, useServerListPage } from "@/lib/hooks/useServerListPage";
import { useListPageFilters } from "@/lib/hooks/useListPageFilters";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";
import {
  invoiceDetailDocumentKind,
  invoiceDetailSubtotal,
  invoiceDetailToContact,
  invoiceDetailToLines,
  invoiceKindLabel,
} from "@/lib/utils/invoiceBuilders";
import { invoiceDocumentLayoutProps } from "@/lib/utils/resolveInvoiceLayout";
import { InvoiceDocumentSkeleton } from "@/components/organisms/skeletons";

const KIND_OPTIONS = [
  { value: "sale", label: "Sales" },
  { value: "purchase", label: "Purchases" },
  { value: "expense", label: "Expenses" },
  { value: "payroll", label: "Payroll slips" },
  { value: "payroll_group", label: "Payroll batches" },
  { value: "job_quote", label: "Job quotes" },
  { value: "job_invoice", label: "Job invoices" },
];

const PAYMENT_OPTIONS = [
  { value: "due", label: "Due" },
  { value: "partial", label: "Partial" },
  { value: "paid", label: "Paid" },
];

export function InvoicesListView() {
  const tenantId = useTenantId();
  const { tenantName } = useRouteTenant();
  const { search, setSearch, dateRange, setDateRange, bounds } =
    useListPageFilters();
  const [kindFilter, setKindFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const listFilters = useMemo(
    () => ({
      kind: (kindFilter || undefined) as InvoiceKind | undefined,
      paymentStatus: paymentFilter || undefined,
      search: search.trim() || undefined,
      from: bounds.from,
      to: bounds.to,
    }),
    [kindFilter, paymentFilter, search, bounds.from, bounds.to],
  );

  const listPage = useServerListPage<InvoiceListRow>({
    queryKey: ["invoices", tenantId, listFilters],
    enabled: Boolean(tenantId),
    fetchPage: (cursor, limit) =>
      getInvoicesPage(tenantId!, listFilters, cursor, limit),
  });

  const { items, isLoading, error } = listPage;
  const { data: previewDetail, isPending: previewLoading } = useQuery({
    queryKey: ["invoice-detail", tenantId, previewId],
    queryFn: () => getInvoice(tenantId!, previewId!),
    enabled: Boolean(tenantId && previewId),
    staleTime: 60_000,
  });

  const { data: invoiceSettings } = useQuery({
    queryKey: ["invoice-settings", tenantId],
    queryFn: getInvoiceSettings,
    enabled: Boolean(tenantId && previewId),
    staleTime: 10 * 60_000,
  });
  const layoutProps = invoiceDocumentLayoutProps(invoiceSettings);

  const columns: ColumnConfig<InvoiceListRow>[] = useMemo(
    () => [
      {
        key: "reference",
        header: "Reference",
        render: (row) => <span className="font-medium">{row.reference}</span>,
      },
      {
        key: "kind",
        header: "Kind",
        render: (row) => invoiceKindLabel(row.kind),
      },
      {
        key: "contactName",
        header: "Contact",
        render: (row) => row.contactName ?? "—",
      },
      {
        key: "documentDate",
        header: "Date",
        sortValue: (row) => new Date(row.documentDate).getTime(),
        render: (row) => formatDate(row.documentDate),
      },
      {
        key: "total",
        header: "Total",
        sortValue: (row) => row.total,
        render: (row) => formatCurrency(row.total, row.currency),
      },
      {
        key: "paymentStatus",
        header: "Payment",
        render: (row) =>
          row.paymentStatus ? (
            <StatusPill status={row.paymentStatus} vocabulary="movementStatus" />
          ) : (
            "—"
          ),
      },
      {
        key: "actions",
        header: "",
        render: (row) => (
          <RowActionsMenu
            actions={[
              {
                id: "preview",
                label: "Preview document",
                onClick: () => setPreviewId(row.id),
              },
            ]}
          />
        ),
      },
    ],
    [],
  );

  const previewDocument = previewDetail ? (
    <InvoiceDocument
      kind={invoiceDetailDocumentKind(
        previewDetail.kind,
        previewDetail.paymentStatus,
        previewDetail.status,
      )}
      tenantName={tenantName}
      reference={previewDetail.reference}
      date={previewDetail.documentDate}
      contact={invoiceDetailToContact(previewDetail)}
      lineItems={invoiceDetailToLines(previewDetail)}
      subtotal={invoiceDetailSubtotal(previewDetail)}
      total={previewDetail.total}
      currency={previewDetail.currency}
      notes={previewDetail.notes}
      validUntil={previewDetail.dueDate}
      {...layoutProps}
    />
  ) : null;

  return (
    <>
      <ListPageShell
        tabs={[{ id: "all", label: "All Invoices" }]}
        activeTab="all"
        onTabChange={() => {}}
        showImport={false}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search reference or contact…"
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        filterDropdowns={[
          {
            id: "kind",
            label: "Kind",
            value: kindFilter,
            onChange: setKindFilter,
            options: KIND_OPTIONS,
          },
          {
            id: "payment",
            label: "Payment",
            value: paymentFilter,
            onChange: setPaymentFilter,
            options: PAYMENT_OPTIONS,
          },
        ]}
      >
        <ServerPaginatedTable
          columns={columns}
          items={items}
          pagination={serverPaginationBarProps(listPage)}
          isLoading={isLoading}
          error={error ? "Failed to load invoices" : null}
          onRowClick={(row) => setPreviewId(row.id)}
          emptyState={{
            message:
              "Documents appear here when sales, purchases, expenses, payroll, or job billing records are created.",
          }}
        />
      </ListPageShell>

      <DocumentPreviewModal
        open={Boolean(previewId)}
        title={
          previewDetail
            ? `${invoiceKindLabel(previewDetail.kind)} — ${previewDetail.reference}`
            : "Invoice preview"
        }
        onClose={() => setPreviewId(null)}
      >
        {previewDocument ?? (
          previewLoading ? (
            <InvoiceDocumentSkeleton />
          ) : (
            <p className="py-12 text-center text-sm text-muted">Invoice not found</p>
          )
        )}
      </DocumentPreviewModal>
    </>
  );
}
