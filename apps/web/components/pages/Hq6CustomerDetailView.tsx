"use client";

import { useEffect, useMemo, useState } from "react";
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
  deleteCustomer,
  getCustomer,
  getCustomerLedger,
  getCustomers,
  getCustomerSummary,
} from "@/lib/api/customers";
import { useRecordNavigation } from "@/lib/hooks/useRecordNavigation";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { formatHq6Currency, formatHq6Date } from "@/lib/utils/hq6Format";
import { DetailPageSkeleton } from "@/components/organisms/skeletons";
import { toast } from "@/stores/toastStore";

/** HQ6 customer contact subpage — View Contact + ?view= tabs. */
export function Hq6CustomerDetailView({ recordId }: { recordId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const tenantId = useTenantId();
  const { config } = useRouteTenant();
  const { listPath, detailPath } = useRecordNavigation("customers");
  const activeTab = parseHq6ContactTab(searchParams.get("view"));
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (searchParams.get("action") === "delete") setDeleteOpen(true);
  }, [searchParams]);

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", tenantId, recordId],
    queryFn: () => getCustomer(recordId),
    enabled: Boolean(tenantId),
  });

  const { data: summary } = useQuery({
    queryKey: ["customer-summary", tenantId, recordId],
    queryFn: () => getCustomerSummary(tenantId!, recordId),
    enabled: Boolean(tenantId && recordId),
  });

  const { data: ledger = [], isLoading: ledgerLoading } = useQuery({
    queryKey: ["customer-ledger", tenantId, recordId],
    queryFn: () => getCustomerLedger(tenantId!, recordId),
    enabled: Boolean(tenantId && recordId && activeTab === "ledger"),
  });

  const { data: switcherRows = [] } = useQuery({
    queryKey: ["customers", tenantId, "contact-switcher"],
    queryFn: () => getCustomers(tenantId!),
    enabled: Boolean(tenantId),
    staleTime: 60_000,
  });

  const currency = summary?.currency ?? "NGN";

  const setTab = (tab: Hq6ContactTab) => {
    const q = hq6ContactTabQuery(tab);
    router.replace(q ? `${detailPath(recordId)}?view=${q}` : detailPath(recordId));
  };

  const sales = useMemo(
    () =>
      (customer?.transactionHistory ?? []).filter(
        (e) => e.kind === "sale" || e.kind === "job",
      ),
    [customer?.transactionHistory],
  );

  if (!tenantId || isLoading) return <DetailPageSkeleton />;

  if (!customer) {
    return (
      <EmptyState
        title="Customer not found"
        message="This profile could not be loaded."
        ctaLabel="Back to customers"
        onCta={() => router.push(listPath)}
      />
    );
  }

  const displayName = customer.businessName ?? customer.name;

  return (
    <>
      <Hq6ContactDetailShell
        contact={{
          id: customer.id,
          displayName,
          contactId: customer.contactId,
          typeLabel: "Customer",
          address: customer.businessName ?? customer.name,
          mobile: customer.phone,
          taxNumber: customer.taxNumber,
          currency,
          totalPurchase: 0,
          totalInvoice: summary?.totalAmount ?? customer.totalSell ?? 0,
          totalPaid: summary?.totalPaid ?? customer.totalSellPaid ?? 0,
          balanceDue: summary?.totalDue ?? customer.totalSellDue ?? 0,
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
        salesPanel={
          sales.length === 0 ? undefined : (
            <div className="hq6-contact-ledger-table-wrap">
              <table className="hq6-contact-ledger-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Reference</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((row) => (
                    <tr key={row.id}>
                      <td>{formatHq6Date(row.date)}</td>
                      <td>{row.reference}</td>
                      <td>{row.kind}</td>
                      <td>{formatHq6Currency(row.amount, row.currency)}</td>
                      <td>{row.paymentStatus ?? row.status ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
        documentsPanel={
          <p className="hq6-contact-empty">
            Document attachments for contacts are not stored in Vonos yet.
          </p>
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
          void deleteCustomer(tenantId, recordId)
            .then(async () => {
              toast.success("Customer deleted");
              await queryClient.invalidateQueries({ queryKey: ["customers"] });
              router.push(listPath);
            })
            .catch((err) => {
              toast.error(err instanceof Error ? err.message : "Delete failed");
              setDeleting(false);
            });
        }}
        title="Delete contact"
        message={`Are you sure you want to delete ${displayName}?`}
        confirmLabel="Delete"
        confirming={deleting}
        danger
      />
    </>
  );
}
