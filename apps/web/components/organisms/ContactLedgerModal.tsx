"use client";

import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/atoms/Button";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import type { ContactDueSummary, ContactLedgerEntry } from "@vonos/types";

interface ContactLedgerModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  summary: ContactDueSummary | null;
  ledger: ContactLedgerEntry[];
  isLoading?: boolean;
}

export function ContactLedgerModal({
  open,
  onClose,
  title,
  summary,
  ledger,
  isLoading = false,
}: ContactLedgerModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[85vh] w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card shadow-lg">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {summary ? (
              <p className="mt-1 text-sm text-muted">
                Due {formatCurrency(summary.totalDue, summary.currency)} · Paid{" "}
                {formatCurrency(summary.totalPaid, summary.currency)}
              </p>
            ) : null}
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="max-h-[60vh] overflow-auto p-4">
          {isLoading ? (
            <p className="text-sm text-muted">Loading ledger…</p>
          ) : ledger.length === 0 ? (
            <p className="text-sm text-muted">No ledger entries for this contact yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted">
                  <th className="pb-2 pr-3 font-medium">Date</th>
                  <th className="pb-2 pr-3 font-medium">Description</th>
                  <th className="pb-2 pr-3 font-medium">Type</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((entry) => (
                  <tr key={entry.id} className="border-b border-[var(--color-border-subtle)]">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {new Date(entry.date).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-3">
                      {entry.reference ? `${entry.reference} — ` : ""}
                      {entry.description}
                    </td>
                    <td className="py-2 pr-3 capitalize">{entry.type}</td>
                    <td className="py-2 text-right tabular-nums">
                      {formatCurrency(entry.amount, entry.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export function useContactLedgerQuery(
  fetchSummary: () => Promise<ContactDueSummary>,
  fetchLedger: () => Promise<ContactLedgerEntry[]>,
  contactId: string | null,
  queryKeyPrefix: string,
) {
  const summaryQuery = useQuery({
    queryKey: [queryKeyPrefix, "summary", contactId],
    enabled: Boolean(contactId),
    queryFn: fetchSummary,
  });
  const ledgerQuery = useQuery({
    queryKey: [queryKeyPrefix, "ledger", contactId],
    enabled: Boolean(contactId),
    queryFn: fetchLedger,
  });
  return {
    summary: summaryQuery.data ?? null,
    ledger: ledgerQuery.data ?? [],
    isLoading: summaryQuery.isLoading || ledgerQuery.isLoading,
  };
}
