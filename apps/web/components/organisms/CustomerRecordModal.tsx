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
  getCustomerContact,
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

  const { data: contact, isLoading, error } = useQuery({
    queryKey: ["customer-contact", tenantId, customerId],
    queryFn: () => getCustomerContact(customerId!),
    enabled: Boolean(tenantId && customerId),
    staleTime: 60_000,
  });

  const { data: summary } = useQuery({
    queryKey: ["customer-summary", tenantId, customerId],
    queryFn: () => getCustomerSummary(tenantId!, customerId!),
    enabled: Boolean(tenantId && customerId),
    staleTime: 60_000,
  });

  const { data: ledger } = useQuery({
    queryKey: ["customer-ledger", tenantId, customerId],
    queryFn: () => getCustomerLedger(tenantId!, customerId!),
    enabled: Boolean(tenantId && customerId),
    staleTime: 60_000,
  });

  // Invoice settings only when printing / opening statement.
  const { data: invoiceSettings } = useQuery({
    queryKey: ["invoice-settings", tenantId],
    queryFn: getInvoiceSettings,
    enabled: Boolean(tenantId && statementOpen),
    staleTime: 10 * 60_000,
  });

  const statementRows = useMemo(
    () =>
      (ledger ?? []).map((entry) => ({
        date: entry.date,
        reference: entry.reference ?? entry.description,
        kind: entry.type,
        amount: entry.amount,
      })),
    [ledger],
  );

  const totalActivity = useMemo(
    () => statementRows.reduce((sum, row) => sum + row.amount, 0),
    [statementRows],
  );

  const currency = summary?.currency ?? "NGN";
  const today = new Date().toISOString().slice(0, 10);

  const statementDoc = contact ? (
    <InvoiceDocument
      kind="statement"
      tenantName={tenantName}
      reference={`STMT-${contact.id.slice(0, 8).toUpperCase()}`}
      date={today}
      contact={{
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
      }}
      lineItems={[]}
      statementRows={statementRows}
      subtotal={totalActivity}
      total={summary?.totalAmount ?? totalActivity}
      currency={currency}
      notes={invoiceSettings?.termsText ?? null}
      balanceDue={summary?.totalDue ?? contact.totalSellDue}
      className="invoice-print-root"
    />
  ) : null;

  return (
    <>
      <RecordViewModal
        open={Boolean(customerId)}
        title={contact?.name ?? "Customer"}
        subtitle={
          contact
            ? `${contact.visitCount} visits · added ${formatDate(contact.createdAt)}`
            : undefined
        }
        onClose={onClose}
        fullPageHref={
          customerId && tenantCode ? `/${tenantCode}/customers/${customerId}` : undefined
        }
        isLoading={isLoading}
        error={error ? "Could not load this customer." : null}
        footer={
          contact && tenantCode ? (
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
        {contact ? (
          <div className="space-y-4">
            <dl className="grid gap-3 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted">Email</dt>
                <dd className="text-sm">{contact.email ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Phone</dt>
                <dd className="text-sm">{contact.phone ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Total sales</dt>
                <dd className="text-sm font-semibold">
                  {formatCurrency(summary?.totalAmount ?? 0, currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Amount due</dt>
                <dd className="text-sm font-semibold text-amber-700">
                  {formatCurrency(summary?.totalDue ?? contact.totalSellDue, currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Paid</dt>
                <dd className="text-sm">
                  {formatCurrency(summary?.totalPaid ?? 0, currency)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Ledger entries</dt>
                <dd className="text-sm">{ledger?.length ?? "—"}</dd>
              </div>
            </dl>

            {ledger && ledger.length > 0 ? (
              <div>
                <h4 className="mb-2 text-sm font-medium text-foreground">Recent activity</h4>
                <ul className="max-h-48 space-y-2 overflow-y-auto text-sm">
                  {ledger.slice(0, 12).map((entry) => (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between gap-2 border-b border-[var(--color-border-subtle)] pb-2"
                    >
                      <span>
                        {entry.reference ?? entry.description}
                        <span className="ml-2 text-xs text-muted">{formatDate(entry.date)}</span>
                      </span>
                      <span className="tabular-nums font-medium">
                        {formatCurrency(entry.amount, entry.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted">No ledger activity yet.</p>
            )}
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
