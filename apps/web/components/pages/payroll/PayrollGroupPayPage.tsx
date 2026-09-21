"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Hq6BusyButton } from "@/components/hq6/Hq6BusyButton";
import { Hq6FormShell } from "@/components/hq6/Hq6Chrome";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useRouteTenant, useTenantId } from "@/lib/hooks/useRouteTenant";
import { getPayrollGroup, payPayrolls } from "@/lib/api/hrm";
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
import { PayrollGroupPayHeader } from "./PayrollGroupPayHeader";

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

  const group = groupQuery.data;

  const unpaidRows = useMemo(
    () =>
      (group?.payrolls ?? []).filter((row) => {
        const payment = row.paymentStatus?.toLowerCase();
        return payment !== "paid" && row.netPay > 0;
      }),
    [group?.payrolls],
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

  const letterhead = useMemo(() => {
    const first = unpaidRows[0] ?? group?.payrolls[0];
    if (!first && !group) return null;
    const cfg = getTenantConfigById(first?.tenantId ?? group?.tenantId ?? "");
    const biz = cfg?.businessSettings?.business as
      | Record<string, string | undefined>
      | undefined;
    return {
      groupName: group?.name ?? first?.payrollGroupName ?? "Payroll group",
      entityName: first?.tenantName || cfg?.name || tenantName || "Business",
      entityCode: cfg?.code ?? first?.tenantCode ?? null,
      locationCode: group?.locationCode ?? first?.locationCode ?? null,
      businessLocations: cfg?.businessLocations,
      businessAddress: biz
        ? {
            landmark: biz.landmark,
            city: biz.city,
            state: biz.state,
            zipCode: biz.zipCode,
            country: biz.country,
          }
        : undefined,
      status: group?.status ?? first?.status ?? "draft",
    };
  }, [unpaidRows, group, tenantName]);

  const pageTitle = letterhead?.groupName ?? group?.name ?? "Payroll group";
  const loading = groupQuery.isLoading;
  const error = groupQuery.error;

  if (loading) {
    return (
      <Hq6FormShell title={pageTitle}>
        <p className="text-sm text-[#64748b]">Loading unpaid payrolls…</p>
      </Hq6FormShell>
    );
  }

  if (error) {
    return (
      <Hq6FormShell title={pageTitle}>
        <p className="text-sm text-[var(--color-error-text)]">
          {error instanceof Error ? error.message : "Failed to load payrolls"}
        </p>
        <div className="mt-4">
          <Link href={backHref} className="btn btn-default">
            Back
          </Link>
        </div>
      </Hq6FormShell>
    );
  }

  return (
    <Hq6FormShell title="Add payment">
      <section className="hq6-form-card hq6-payroll-group-pay">
        {letterhead ? <PayrollGroupPayHeader {...letterhead} /> : null}

        <PayrollGroupPayForm
          rows={unpaidRows}
          payRowForms={payRowForms}
          onPatchPayRowForm={patchPayRowForm}
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <Hq6BusyButton
            type="button"
            className="hq6-btn-purple"
            busy={payMutation.isPending}
            busyLabel="Paying…"
            disabled={unpaidRows.length === 0 || !payRowsReady}
            onClick={submitPay}
          >
            {unpaidRows.length > 1
              ? `Pay ${unpaidRows.length} · ${formatCurrency(payTotal, "NGN")}`
              : `Pay ${formatCurrency(payTotal, "NGN")}`}
          </Hq6BusyButton>
          <Link href={backHref} className="btn btn-default">
            Cancel
          </Link>
        </div>
      </section>
    </Hq6FormShell>
  );
}
