"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Hq6BusyButton } from "@/components/hq6/Hq6BusyButton";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import {
  getPayrollGroup,
  getUnpaidPayrollsForGroup,
  payPayrolls,
} from "@/lib/api/hrm";
import { getTenantConfigById } from "@/lib/registries/tenantConfigs";
import { toast } from "@/stores/toastStore";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatHq6Currency } from "@/lib/utils/hq6Format";
import { mapQueriesByPrefix } from "@/lib/query/optimistic";
import {
  arePayRowsReady,
  buildPayPayrollBatches,
  emptyPayRowForm,
  PayrollGroupPayForm,
  type PayRowForm,
} from "./PayrollGroupPayForm";

export type PayrollGroupPayPageProps = {
  groupId: string;
  backHref: string;
  viewHref: string;
  tenantId?: string | null;
};

export function PayrollGroupPayPage({
  groupId,
  backHref,
  viewHref,
  tenantId: tenantIdProp,
}: PayrollGroupPayPageProps) {
  const router = useRouter();
  const routeTenantId = useTenantId();
  const { tenantName } = useRouteTenant();
  const tenantId = tenantIdProp ?? routeTenantId;

  const groupQuery = useQuery({
    queryKey: ["payroll-group", tenantId, groupId],
    enabled: Boolean(tenantId && groupId),
    queryFn: () => getPayrollGroup(tenantId!, groupId),
  });

  const unpaidQuery = useQuery({
    queryKey: ["payroll-group-unpaid", tenantId, groupId],
    enabled: Boolean(tenantId && groupId),
    queryFn: () => getUnpaidPayrollsForGroup(tenantId!, groupId),
  });

  const unpaidRows = useMemo(
    () =>
      (unpaidQuery.data ?? []).filter(
        (row) => row.paymentStatus !== "paid" && row.netPay > 0,
      ),
    [unpaidQuery.data],
  );

  const [payRowForms, setPayRowForms] = useState<Record<string, PayRowForm>>(
    {},
  );

  useEffect(() => {
    setPayRowForms((prev) => {
      const next: Record<string, PayRowForm> = {};
      for (const row of unpaidRows) {
        next[row.id] = prev[row.id] ?? emptyPayRowForm();
      }
      return next;
    });
  }, [unpaidRows]);

  const payTotal = useMemo(
    () => unpaidRows.reduce((sum, row) => sum + (row.netPay || 0), 0),
    [unpaidRows],
  );

  const payRowsReady = arePayRowsReady(unpaidRows, payRowForms);

  const payMutation = useAppMutation({
    mutationFn: async (batches: ReturnType<typeof buildPayPayrollBatches>) => {
      if (!batches.length) {
        throw new Error("No payroll selected");
      }
      let paid = 0;
      let skipped = 0;
      let totalDebited = 0;
      const accountNames: string[] = [];
      for (const batch of batches) {
        if (!batch.accountId.trim()) {
          throw new Error("Select a payment account for each payroll");
        }
        if (!batch.method.trim()) {
          throw new Error("Select a payment method for each payroll");
        }
        const result = await payPayrolls(batch.tenantId, {
          payrollIds: batch.payrollIds,
          accountId: batch.accountId,
          method: batch.method,
          paidOn: batch.paidOn,
        });
        paid += result.paid;
        skipped += result.skipped;
        totalDebited += result.totalDebited;
        if (result.accountName) accountNames.push(result.accountName);
      }
      return {
        paid,
        skipped,
        totalDebited,
        accountName: [...new Set(accountNames)].join(", "),
      };
    },
    progressLabel: "Paying payroll",
    successMessage: (result) =>
      `Paid ${result.paid} payroll${result.paid === 1 ? "" : "s"} — ${formatHq6Currency(result.totalDebited)}${result.accountName ? ` from ${result.accountName}` : ""}`,
    invalidateKeys: [
      ["payrolls"],
      ["payroll-group", tenantId, groupId],
      ["payroll-group-unpaid", tenantId, groupId],
      ["payment-accounts"],
    ],
    optimistic: {
      keys: [["payrolls"]],
      update: (qc, batches) => {
        const ids = new Set(batches.flatMap((b) => b.payrollIds));
        if (ids.size === 0) return;
        mapQueriesByPrefix<{ id: string; paymentStatus?: string }>(
          qc,
          ["payrolls"],
          (items) =>
            items.map((row) =>
              ids.has(row.id) ? { ...row, paymentStatus: "paid" } : row,
            ),
        );
      },
    },
    onSuccess: () => {
      router.push(viewHref);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  function patchPayRowForm(payrollId: string, patch: Partial<PayRowForm>) {
    setPayRowForms((prev) => {
      const current = prev[payrollId] ?? emptyPayRowForm();
      return { ...prev, [payrollId]: { ...current, ...patch } };
    });
  }

  function submitPay() {
    if (!payRowsReady) {
      toast.error("Select payment account and method for each employee");
      return;
    }
    if (!unpaidRows.length) {
      toast.error("No unpaid payrolls to pay");
      return;
    }
    const batches = buildPayPayrollBatches(unpaidRows, payRowForms);
    payMutation.mutate(batches);
  }

  const group = groupQuery.data;
  const header = useMemo(() => {
    const first = unpaidRows[0] ?? group?.payrolls[0];
    if (!first) return null;
    const cfg = getTenantConfigById(first.tenantId);
    const biz = cfg?.businessSettings?.business;
    const addressParts = [
      biz?.landmark,
      biz?.city,
      biz?.state,
      biz?.zipCode,
      biz?.country,
    ].filter(Boolean);
    return {
      groupName: group?.name ?? first.payrollGroupName ?? "Payroll group",
      companyName: first.tenantName || cfg?.name || tenantName || "Business",
      address: addressParts.join(", "),
      status: group?.status ?? first.status,
    };
  }, [unpaidRows, group, tenantName]);

  const loading = groupQuery.isLoading || unpaidQuery.isLoading;
  const error = groupQuery.error ?? unpaidQuery.error;

  return (
    <div className="space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-[#111827]">
          Pay payroll group
        </h1>
        {header ? (
          <p className="mt-1 text-sm text-muted">{header.groupName}</p>
        ) : null}
      </div>

      {loading ? (
        <p className="text-sm text-muted">Loading unpaid payrolls…</p>
      ) : error ? (
        <p className="text-sm text-[var(--color-error-text)]">
          {error instanceof Error ? error.message : "Failed to load payrolls"}
        </p>
      ) : (
        <>
          {header ? (
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-3 text-sm">
              <div>
                <p className="font-semibold text-foreground">
                  {header.companyName}
                </p>
                {header.address ? (
                  <p className="mt-0.5 max-w-md text-muted">{header.address}</p>
                ) : null}
              </div>
              <div className="text-right text-sm">
                <p>
                  <span className="text-muted">Payroll group: </span>
                  <span className="font-medium">{header.groupName}</span>
                </p>
                <p className="mt-1">
                  <span className="text-muted">Status: </span>
                  <span className="font-medium capitalize">{header.status}</span>
                </p>
              </div>
            </div>
          ) : null}

          <PayrollGroupPayForm
            rows={unpaidRows}
            payRowForms={payRowForms}
            onPatchPayRowForm={patchPayRowForm}
            groupStatus={group?.status ?? "draft"}
          />

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
            <Link href={backHref} className="hq6-btn hq6-btn-outline">
              Cancel
            </Link>
            <Hq6BusyButton
              type="button"
              className="hq6-btn hq6-btn-blue"
              busy={payMutation.isPending}
              busyLabel="Paying…"
              disabled={
                unpaidRows.length === 0 ||
                !payRowsReady ||
                group?.status !== "final"
              }
              onClick={submitPay}
            >
              {unpaidRows.length > 1
                ? `Pay ${unpaidRows.length} · ${formatCurrency(payTotal, "NGN")}`
                : `Pay ${formatCurrency(payTotal, "NGN")}`}
            </Hq6BusyButton>
          </div>
        </>
      )}
    </div>
  );
}
