"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { EmptyState } from "@/components/atoms/EmptyState";
import { Hq6ConfirmModal } from "@/components/hq6/Hq6ConfirmModal";
import {
  Hq6ContactDetailShell,
  hq6ContactTabQuery,
  parseHq6ContactTab,
  type Hq6ContactTab,
} from "@/components/hq6/Hq6ContactDetailShell";
import {
  deleteSupplier,
  getSupplier,
  getSupplierLedger,
  getSupplierStockReport,
  getSuppliers,
  getSupplierSummary,
} from "@/lib/api/suppliers";
import { getStockMovements } from "@/lib/api/stockMovements";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { formatHq6Currency, formatHq6Date } from "@/lib/utils/hq6Format";
import { DetailPageSkeleton } from "@/components/organisms/skeletons";
import { toast } from "@/stores/toastStore";

/** HQ6 supplier contact subpage — View Contact + ?view= tabs. */
export function Hq6SupplierDetailView({ recordId }: { recordId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  const { config } = useRouteTenant();
  const { listPath, detailPath } = useRecordNavigation("suppliers");
  const activeTab = parseHq6ContactTab(searchParams.get("view"));
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (searchParams.get("action") === "delete") setDeleteOpen(true);
  }, [searchParams]);

  const { data: supplier, isLoading } = useQuery({
    queryKey: ["supplier", tenantId, recordId],
    queryFn: () => getSupplier(recordId),
    enabled: Boolean(tenantId),
  });

  const { data: summary } = useQuery({
    queryKey: ["supplier-summary", tenantId, recordId],
    queryFn: () => getSupplierSummary(tenantId!, recordId),
    enabled: Boolean(tenantId && recordId),
  });

  const { data: ledger = [], isLoading: ledgerLoading } = useQuery({
    queryKey: ["supplier-ledger", tenantId, recordId],
    queryFn: () => getSupplierLedger(tenantId!, recordId),
    enabled: Boolean(tenantId && recordId && activeTab === "ledger"),
  });

  const { data: purchases = [], isLoading: purchasesLoading } = useQuery({
    queryKey: ["supplier-purchases", tenantId, recordId],
    queryFn: () =>
      getStockMovements(tenantId!, {
        type: "inbound",
        supplierId: recordId,
        limit: 50,
      }),
    enabled: Boolean(tenantId && recordId && activeTab === "purchases"),
  });

  const { data: stockRows = [], isLoading: stockLoading } = useQuery({
    queryKey: ["supplier-stock-report", tenantId, recordId],
    queryFn: () => getSupplierStockReport(tenantId!, recordId),
    enabled: Boolean(tenantId && recordId && activeTab === "stock_report"),
  });

  const { data: switcherRows = [] } = useQuery({
    queryKey: ["suppliers", tenantId, "contact-switcher"],
    queryFn: () => getSuppliers(tenantId!),
    enabled: Boolean(tenantId),
    staleTime: 60_000,
  });

  const currency = summary?.currency ?? "NGN";

  const setTab = (tab: Hq6ContactTab) => {
    const q = hq6ContactTabQuery(tab);
    router.replace(q ? `${detailPath(recordId)}?view=${q}` : detailPath(recordId));
  };

  if (!tenantId || isLoading) return <DetailPageSkeleton />;

  if (!supplier) {
    return (
      <EmptyState
        title="Supplier not found"
        message="This profile could not be loaded."
        ctaLabel="Back to suppliers"
        onCta={() => router.push(listPath)}
      />
    );
  }

  const displayName = supplier.businessName ?? supplier.name;

  return (
    <>
      <Hq6ContactDetailShell
        contact={{
          id: supplier.id,
          displayName,
          contactId: supplier.contactId,
          typeLabel: "Supplier",
          address: supplier.address ?? displayName,
          mobile: supplier.phone,
          taxNumber: supplier.taxNumber,
          currency,
          totalPurchase: supplier.totalPurchase ?? summary?.totalAmount ?? 0,
          totalInvoice: supplier.totalPurchase ?? summary?.totalAmount ?? 0,
          totalPaid: summary?.totalPaid ?? supplier.totalPurchasePaid ?? 0,
          balanceDue: summary?.totalDue ?? supplier.totalPurchaseDue ?? 0,
        }}
        activeTab={activeTab}
        onTabChange={setTab}
        switcherOptions={switcherRows.map((row) => ({
          id: row.id,
          label: `${row.businessName ?? row.name}${
            row.contactId ? ` - (${row.contactId})` : ""
          }`,
        }))}
        onSwitchContact={(id) => {
          const q = searchParams.toString();
          router.push(q ? `${detailPath(id)}?${q}` : detailPath(id));
        }}
        businessName={config?.name ?? "Vonos Autos HQ"}
        businessAddress={
          config?.businessLocations?.[0]
            ? [config.businessLocations[0].name]
            : ["ARK GARDEN, KUBWA, FCT", "Nigeria, 901101"]
        }
        ledger={ledger}
        ledgerLoading={ledgerLoading}
        purchasesPanel={
          purchasesLoading ? (
            <p className="hq6-contact-empty">Loading purchases…</p>
          ) : purchases.length === 0 ? undefined : (
            <div className="hq6-contact-ledger-table-wrap">
              <table className="hq6-contact-ledger-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reference</th>
                    <th>Status</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((row) => (
                    <tr key={row.id}>
                      <td>{formatHq6Date(row.date)}</td>
                      <td>{row.reference ?? row.id}</td>
                      <td>{row.status}</td>
                      <td>
                        {formatHq6Currency(row.grandTotal ?? 0, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        stockReportPanel={
          stockLoading ? (
            <p className="hq6-contact-empty">Loading stock report…</p>
          ) : stockRows.length === 0 ? undefined : (
            <div className="hq6-contact-ledger-table-wrap">
              <table className="hq6-contact-ledger-table">
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Total cost</th>
                  </tr>
                </thead>
                <tbody>
                  {stockRows.map((row) => (
                    <tr key={row.itemId || row.sku}>
                      <td>{row.sku}</td>
                      <td>{row.name}</td>
                      <td className="tabular-nums">{row.quantity}</td>
                      <td>
                        {formatHq6Currency(row.totalCost, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        documentsPanel={
          supplier.notes ? (
            <p className="whitespace-pre-wrap text-sm text-[#111827]">
              {supplier.notes}
            </p>
          ) : (
            <p className="hq6-contact-empty">
              Document attachments for contacts are not stored in Vonos yet.
            </p>
          )
        }
      />

      <Hq6ConfirmModal
        open={deleteOpen}
        onClose={() => {
          setDeleteOpen(false);
          if (searchParams.get("action") === "delete") {
            router.replace(detailPath(recordId));
          }
        }}
        onConfirm={() => {
          if (!tenantId || deleting) return;
          setDeleting(true);
          void deleteSupplier(tenantId, recordId)
            .then(async () => {
              toast.success(`Deleted ${displayName}`);
              await queryClient.invalidateQueries({ queryKey: ["suppliers"] });
              router.push(listPath);
            })
            .catch((err) => {
              toast.error(err instanceof Error ? err.message : "Delete failed");
              setDeleting(false);
            });
        }}
        title="Are you sure ?"
        message={`Are you sure you want to delete ${displayName}?`}
        confirmLabel="Delete"
        confirming={deleting}
        danger
      />
    </>
  );
}
