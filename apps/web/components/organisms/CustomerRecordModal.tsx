"use client";

import { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Button } from "@/components/atoms/Button";
import { RecordViewModal } from "@/components/organisms/RecordViewModal";
import { InvoiceDocument } from "@/components/organisms/InvoiceDocument";
import { DocumentPreviewModal } from "@/components/organisms/DocumentPreviewModal";
import {
  getCustomer,
  getCustomerLedger,
  getCustomerSummary,
} from "@/lib/api/customers";
import { getInvoiceSettings } from "@/lib/api/invoiceSettings";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";

export interface CustomerRecordModalProps {
  customerId: string | null;
  onClose: () => void;
}

export function CustomerRecordModal({ customerId, onClose }: CustomerRecordModalProps) {
  const router = useRouter();
  const { tenantId, tenantName, tenantCode } = useRouteTenant();
  const [statementOpen, setStatementOpen] = useState(false);

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["customer-modal", tenantId, customerId],
    queryFn: () => getCustomer(customerId!),
    enabled: Boolean(tenantId && customerId),
  });

  const { data: summary } = useQuery({
    queryKey: ["customer-summary", tenantId, customerId],
    queryFn: () => getCustomerSummary(tenantId!, customerId!),
    enabled: Boolean(tenantId && customerId),
  });

  const { data: ledger } = useQuery({
    queryKey: ["customer-ledger", tenantId, customerId],
    queryFn: () => getCustomerLedger(tenantId!, customerId!),
    enabled: Boolean(tenantId && customerId),
  });

  const { data: invoiceSettings } = useQuery({
    queryKey: ["invoice-settings", tenantId],
    queryFn: getInvoiceSettings,
    enabled: Boolean(tenantId),
  });

  const statementRows = useMemo(
    () =>
      (profile?.transactionHistory ?? []).map((entry) => ({
        date: entry.date,
        reference: entry.reference,
        kind: entry.kind,
        amount: entry.amount,
        status: entry.status ?? entry.paymentStatus ?? undefined,
      })),
    [profile?.transactionHistory],
  );

  const totalActivity = useMemo(
    () => statementRows.reduce((sum, row) => sum + row.amount, 0),
    [statementRows],
  );

  const currency = summary?.currency ?? "NGN";
  const today = new Date().toISOString().slice(0, 10);

  const statementDoc = profile ? (
    <InvoiceDocument
      kind="statement"
      tenantName={tenantName}
      reference={`STMT-${profile.contactId ?? profile.id.slice(0, 8).toUpperCase()}`}
      date={today}
      contact={{
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        businessName: profile.businessName,
      }}
      lineItems={[]}
      statementRows={statementRows}
      subtotal={totalActivity}
      total={summary?.totalAmount ?? profile.totalSell ?? profile.totalSpend}
      currency={currency}
      notes={invoiceSettings?.termsText ?? null}
      balanceDue={summary?.totalDue ?? profile.totalSellDue ?? null}
      className="invoice-print-root"
    />
  ) : null;

  return (
    <>
      <RecordViewModal
        open={Boolean(customerId)}
        title={profile?.businessName ?? profile?.name ?? "Customer"}
        subtitle={profile ? `${profile.visitCount} visits · added ${formatDate(profile.createdAt)}` : undefined}
        onClose={onClose}
        fullPageHref={
          customerId && tenantCode ? `/${tenantCode}/customers/${customerId}` : undefined
        }
        isLoading={isLoading}
        error={error ? "Could not load this customer." : null}
        footer={
          profile && tenantCode ? (
            <div className="flex flex-wrap items-center justify-end gap-2 px-4 pb-4">
              <Button variant="secondary" size="sm" onClick={() => setStatementOpen(true)}>
                <Eye className="mr-1.5 h-4 w-4" />
                Account statement
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onClose();
                  router.push(`/${tenantCode}/payments?customerId=${customerId}`);
                }}
              >
                Record payment
              </Button>
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          ) : undefined
        }
      >
        {profile ? (
          <div className="space-y-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted">Email</dt>
                <dd className="text-sm">{profile.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Phone</dt>
                <dd className="text-sm">{profile.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Total sales</dt>
                <dd className="text-sm font-semibold">
                  {formatCurrency(profile.totalSell ?? profile.totalSpend, currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Amount due</dt>
                <dd className="text-sm font-semibold text-amber-700">
                  {formatCurrency(profile.totalSellDue ?? summary?.totalDue ?? 0, currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Paid</dt>
                <dd className="text-sm">
                  {formatCurrency(profile.totalSellPaid ?? summary?.totalPaid ?? 0, currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Transactions</dt>
                <dd className="text-sm">{profile.transactionHistory.length}</dd>
              </div>
            </dl>

            <div>
              <h4 className="mb-2 text-sm font-medium text-foreground">Recent activity</h4>
              <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
                {profile.transactionHistory.length === 0 ? (
                  <li className="text-muted">No transactions yet.</li>
                ) : (
                  profile.transactionHistory.slice(0, 12).map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between gap-2 border-b border-[var(--color-border-subtle)] pb-2"
                    >
                      <span>
                        {entry.reference}
                        <span className="ml-2 text-xs text-muted">{formatDate(entry.date)}</span>
                      </span>
                      <span className="tabular-nums font-medium">
                        {formatCurrency(entry.amount, entry.currency)}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {ledger && ledger.length > 0 ? (
              <div>
                <h4 className="mb-2 text-sm font-medium text-foreground">Ledger</h4>
                <ul className="max-h-36 space-y-1 overflow-y-auto text-xs text-muted">
                  {ledger.slice(0, 8).map((entry) => (
                    <li key={entry.id} className="flex justify-between gap-2">
                      <span>{entry.description}</span>
                      <span className="tabular-nums">
                        {formatCurrency(entry.amount, entry.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </RecordViewModal>

      <DocumentPreviewModal
        open={statementOpen}
        title="Account statement"
        onClose={() => setStatementOpen(false)}
      >
        {statementDoc}
      </DocumentPreviewModal>
    </>
  );
}
