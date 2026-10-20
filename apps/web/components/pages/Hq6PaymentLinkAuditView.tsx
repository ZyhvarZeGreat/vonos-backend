"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  PaymentLinkAuditResult,
  PaymentLinkAuditRow,
  PaymentLinkAuditStatus,
  PaymentLinkReconcileResult,
} from "@vonos/types";
import {
  getPaymentLinkAudit,
  reconcilePaymentLinks,
} from "@/lib/api/payments";
import { useTenantId } from "@/lib/hooks/useRouteTenant";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/stores/toastStore";
import {
  formatHq6Currency,
  formatHq6Date,
  formatHq6PaymentMethod,
} from "@/lib/utils/hq6Format";

const STATUS_META: Record<
  PaymentLinkAuditStatus,
  { label: string; className: string; hint: string }
> = {
  fully_linked: {
    label: "Fully linked",
    className: "bg-emerald-100 text-emerald-800",
    hint: "Document + account-book entry are both linked.",
  },
  unlinked_ledger: {
    label: "Ledger exists, unlinked",
    className: "bg-amber-100 text-amber-900",
    hint: "A matching ledger row exists but is not linked to this payment.",
  },
  no_ledger: {
    label: "No ledger entry",
    className: "bg-red-100 text-red-800",
    hint: "Nothing in the account book matches this payment.",
  },
  no_document: {
    label: "No document",
    className: "bg-sky-100 text-sky-800",
    hint: "Posted to the account book but no sale/invoice is linked.",
  },
  no_account: {
    label: "No account",
    className: "bg-slate-200 text-slate-700",
    hint: "The payment has no payment account.",
  },
};

const STATUS_ORDER: PaymentLinkAuditStatus[] = [
  "unlinked_ledger",
  "no_ledger",
  "no_document",
  "no_account",
  "fully_linked",
];

export function Hq6PaymentLinkAuditView() {
  const tenantId = useTenantId();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [statusFilter, setStatusFilter] = useState<PaymentLinkAuditStatus | "">(
    "",
  );
  const [search, setSearch] = useState("");

  const audit = useQuery<PaymentLinkAuditResult>({
    queryKey: ["payment-link-audit", tenantId, from, to],
    queryFn: () =>
      getPaymentLinkAudit(tenantId!, {
        from: from || undefined,
        to: to || undefined,
      }),
    enabled: Boolean(tenantId),
    staleTime: 30_000,
  });

  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.role);
  const canApply =
    role === "manager" || role === "admin" || role === "super_admin";
  const [plan, setPlan] = useState<PaymentLinkReconcileResult | null>(null);

  const dryRun = useMutation({
    mutationFn: () => reconcilePaymentLinks(tenantId!, { dryRun: true }),
    onSuccess: (result) => {
      setPlan(result);
      toast.success(
        `Dry run: ${result.linked} to link, ${result.created} to create.`,
      );
    },
    onError: () => toast.error("Dry run failed."),
  });

  const apply = useMutation({
    mutationFn: () => reconcilePaymentLinks(tenantId!, { dryRun: false }),
    onSuccess: (result) => {
      setPlan(null);
      toast.success(
        `Reconciled: linked ${result.linked}, created ${result.created}.`,
      );
      void queryClient.invalidateQueries({
        queryKey: ["payment-link-audit", tenantId],
      });
      void audit.refetch();
    },
    onError: () => toast.error("Reconcile failed. Nothing was changed."),
  });

  const rows = useMemo(() => {
    const all = audit.data?.rows ?? [];
    const term = search.trim().toLowerCase();
    return all.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (!term) return true;
      return [
        row.paymentRefNo,
        row.accountName,
        row.documentRef,
        row.method,
        row.createdByName,
        row.ledgerRefNo,
        row.paymentFor,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [audit.data, search, statusFilter]);

  const currency = audit.data?.currency ?? "NGN";
  const totalAmount = rows.reduce((sum, row) => sum + row.amount, 0);

  const handleExport = () => {
    const header = [
      "Status",
      "Date",
      "Payment Ref",
      "Amount",
      "Method",
      "Account",
      "Document",
      "Ledger Ref",
      "Ledger Type",
      "Entered By",
    ];
    const lines = rows.map((row) =>
      [
        STATUS_META[row.status].label,
        formatHq6Date(row.paidOn ?? row.createdAt),
        row.paymentRefNo ?? "",
        row.amount,
        formatHq6PaymentMethod(row.method),
        row.accountName ?? "",
        row.documentRef ?? row.documentType ?? "",
        row.ledgerRefNo ?? "",
        row.ledgerType ?? "",
        row.createdByName ?? "",
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "payment-link-audit.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            Payment Link Audit
          </h1>
          <p className="mt-1 text-sm text-muted">
            Read-only check that every payment has its source document and
            account-book entry linked. Nothing here is changed.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm"
            aria-label="From date"
          />
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm"
            aria-label="To date"
          />
          <button
            type="button"
            onClick={() => void audit.refetch()}
            className="tw-dw-btn tw-dw-btn-sm"
          >
            Refresh
          </button>
          {canApply ? (
            <button
              type="button"
              onClick={() => dryRun.mutate()}
              disabled={dryRun.isPending || audit.isLoading}
              className="tw-dw-btn tw-dw-btn-sm tw-dw-btn-outline tw-dw-btn-primary"
            >
              {dryRun.isPending ? "Checking…" : "Reconcile (dry run)"}
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleExport}
            disabled={!rows.length}
            className="tw-dw-btn tw-dw-btn-sm"
          >
            Export CSV
          </button>
        </div>
      </div>

      {plan ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <div className="font-semibold">Dry run — nothing changed yet</div>
          <p className="mt-1">
            Link <strong>{plan.linked}</strong> ledger row
            {plan.linked === 1 ? "" : "s"} (
            {formatHq6Currency(plan.linkedAmount, plan.currency)}) and create{" "}
            <strong>{plan.created}</strong> missing leg
            {plan.created === 1 ? "" : "s"} (
            {formatHq6Currency(plan.createdAmount, plan.currency)}).
            {plan.ambiguous > 0
              ? ` ${plan.ambiguous} match(es) had identical duplicates — attribution only, balances unaffected.`
              : ""}
            {plan.skipped.length > 0
              ? ` ${plan.skipped.length} skipped (could not determine direction).`
              : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => apply.mutate()}
              disabled={apply.isPending}
              className="tw-dw-btn tw-dw-btn-sm tw-dw-btn-primary tw-text-white"
            >
              {apply.isPending ? "Applying…" : "Apply changes"}
            </button>
            <button
              type="button"
              onClick={() => setPlan(null)}
              disabled={apply.isPending}
              className="tw-dw-btn tw-dw-btn-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {audit.isError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Could not load the audit.{" "}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() => void audit.refetch()}
          >
            Retry
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {STATUS_ORDER.map((status) => (
          <button
            key={status}
            type="button"
            onClick={() =>
              setStatusFilter((current) =>
                current === status ? "" : status,
              )
            }
            className={`rounded-xl border bg-card p-3 text-left shadow-card transition ${
              statusFilter === status
                ? "border-foreground/40 ring-1 ring-foreground/20"
                : "border-border hover:border-foreground/20"
            }`}
            title={STATUS_META[status].hint}
          >
            <div className="text-xs text-muted">{STATUS_META[status].label}</div>
            <div className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
              {audit.data?.summary[status] ?? 0}
            </div>
          </button>
        ))}
        <div className="rounded-xl border border-border bg-card p-3 shadow-card">
          <div className="text-xs text-muted">Orphan ledger rows</div>
          <div className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
            {audit.data?.orphanLedgerCount ?? 0}
          </div>
          <div className="text-xs text-muted">
            {formatHq6Currency(audit.data?.orphanLedgerTotal ?? 0, currency)}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search ref, account, document…"
          className="w-full max-w-sm rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
        />
        <div className="text-sm text-muted">
          {rows.length} row{rows.length === 1 ? "" : "s"} ·{" "}
          <span className="tabular-nums text-foreground">
            {formatHq6Currency(totalAmount, currency)}
          </span>
          {statusFilter ? (
            <>
              {" "}
              ·{" "}
              <button
                type="button"
                className="font-medium underline"
                onClick={() => setStatusFilter("")}
              >
                Clear status filter
              </button>
            </>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[64rem] text-sm">
            <thead>
              <tr className="border-b border-border bg-[var(--color-surface-muted)]/50 text-left text-xs text-muted">
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Payment Ref</th>
                <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                <th className="px-4 py-2.5 font-medium">Method</th>
                <th className="px-4 py-2.5 font-medium">Account</th>
                <th className="px-4 py-2.5 font-medium">Document</th>
                <th className="px-4 py-2.5 font-medium">Ledger</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {audit.isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted">
                    Loading audit…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted">
                    No rows match.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <AuditRow key={row.paymentId} row={row} currency={currency} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AuditRow({
  row,
  currency,
}: {
  row: PaymentLinkAuditRow;
  currency: string;
}) {
  const meta = STATUS_META[row.status];
  const ledger = row.ledgerId
    ? `${row.ledgerType ?? ""} ${row.ledgerRefNo ?? row.ledgerId.slice(-8)}`
    : row.suggestedLedgerId
      ? `unlinked ${row.suggestedLedgerType ?? ""} ${row.suggestedLedgerDate ? formatHq6Date(row.suggestedLedgerDate) : ""}`
      : "—";
  return (
    <tr className="border-b border-border/60 align-top last:border-b-0 hover:bg-[var(--color-surface-muted)]/40">
      <td className="whitespace-nowrap px-4 py-2.5 text-foreground">
        {formatHq6Date(row.paidOn ?? row.createdAt)}
      </td>
      <td className="px-4 py-2.5 font-medium text-foreground">
        {row.paymentRefNo ?? "—"}
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-foreground">
        {formatHq6Currency(row.amount, currency)}
      </td>
      <td className="px-4 py-2.5 text-foreground">
        {formatHq6PaymentMethod(row.method)}
      </td>
      <td className="px-4 py-2.5 text-foreground">
        {row.accountName ?? (
          <span className="text-red-700">No account</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-foreground">
        {row.documentRef ? (
          <>
            {row.documentRef}
            {row.documentType ? (
              <span className="ml-1 text-xs text-muted">
                ({row.documentType})
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-muted">—</span>
        )}
      </td>
      <td className="px-4 py-2.5 text-foreground">{ledger}</td>
      <td className="px-4 py-2.5">
        <span
          className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${meta.className}`}
          title={meta.hint}
        >
          {meta.label}
        </span>
      </td>
    </tr>
  );
}
