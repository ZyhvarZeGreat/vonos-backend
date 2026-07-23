"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Requisition } from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { StatusPill } from "@/components/atoms/StatusPill";
import { RecordViewModal } from "@/components/organisms/RecordViewModal";
import {
  approveRequisition,
  cancelRequisition,
  fulfillRequisition,
  getRequisition,
  rejectRequisition,
} from "@/lib/api/requisitions";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import {
  MODAL_RECORD_STALE_MS,
  modalKeys,
} from "@/lib/query/modalQueryKeys";
import { formatDate } from "@/lib/utils/formatDate";
import { formatNumber } from "@/lib/utils/formatCurrency";
import { hasPermission } from "@/lib/utils/permissions";
import { useAuthStore } from "@/stores/authStore";

export interface RequisitionRecordModalProps {
  requisitionId: string | null;
  /** When set, show this record without waiting on fetch (list row seed). */
  initialRecord?: Requisition | null;
  /** Outgoing = requesting tenant; incoming = source (warehouse) actor. */
  mode?: "outgoing" | "incoming";
  onClose: () => void;
}

export function RequisitionRecordModal({
  requisitionId,
  initialRecord = null,
  mode = "outgoing",
  onClose,
}: RequisitionRecordModalProps) {
  const { tenantId, tenantCode } = useRouteTenant();
  const role = useAuthStore((state) => state.role);
  const queryClient = useQueryClient();
  const canApprove = role ? hasPermission(role, "approveReject") : false;
  const canCreate = role ? hasPermission(role, "createRecord") : false;

  const { data: fetched, isLoading, error } = useQuery({
    queryKey: modalKeys.requisition(tenantId, requisitionId),
    queryFn: () => getRequisition(tenantId!, requisitionId!),
    enabled: Boolean(tenantId && requisitionId),
    initialData: initialRecord ?? undefined,
    staleTime: MODAL_RECORD_STALE_MS,
  });

  const requisition = fetched ?? initialRecord;

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["requisitions", tenantId] });
    void queryClient.invalidateQueries({
      queryKey: ["incoming-requisitions", tenantId],
    });
    if (requisitionId) {
      void queryClient.invalidateQueries({
        queryKey: ["requisition-modal", tenantId, requisitionId],
      });
    }
  };

  const approveMutation = useAppMutation({
    mutationFn: () => approveRequisition(tenantId!, requisitionId!),
    successMessage: "Requisition approved",
    onSuccess: invalidate,
  });

  const rejectMutation = useAppMutation({
    mutationFn: () => rejectRequisition(tenantId!, requisitionId!),
    successMessage: "Requisition rejected",
    onSuccess: invalidate,
  });

  const fulfillMutation = useAppMutation({
    mutationFn: () => fulfillRequisition(tenantId!, requisitionId!),
    successMessage: "Requisition fulfilled — stock transferred",
    onSuccess: invalidate,
  });

  const cancelMutation = useAppMutation({
    mutationFn: () => cancelRequisition(tenantId!, requisitionId!),
    successMessage: "Requisition cancelled",
    onSuccess: invalidate,
  });

  const isPending =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    fulfillMutation.isPending ||
    cancelMutation.isPending;

  const jobHref = requisition?.jobId
    ? mode === "incoming"
      ? `/VA/jobs/${requisition.jobId}`
      : tenantCode
        ? `/${tenantCode}/jobs/${requisition.jobId}`
        : undefined
    : undefined;

  let footer: ReactNode;
  if (mode === "incoming" && requisition && canApprove) {
    footer = (
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3">
        {requisition.status === "Pending" ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              disabled={isPending}
              onClick={() => rejectMutation.mutate()}
            >
              Reject
            </Button>
            <Button
              size="sm"
              disabled={isPending}
              onClick={() => approveMutation.mutate()}
            >
              Approve
            </Button>
          </>
        ) : null}
        {requisition.status === "Approved" ? (
          <Button
            size="sm"
            disabled={isPending}
            onClick={() => fulfillMutation.mutate()}
          >
            Fulfill & transfer stock
          </Button>
        ) : null}
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  } else if (
    mode === "outgoing" &&
    requisition &&
    canCreate &&
    requisition.status === "Pending"
  ) {
    footer = (
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => cancelMutation.mutate()}
        >
          Cancel request
        </Button>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  } else {
    footer = undefined;
  }

  return (
    <RecordViewModal
      open={Boolean(requisitionId)}
      title={requisition?.reference ?? "Requisition"}
      subtitle={
        requisition
          ? `Created ${formatDate(requisition.createdAt)}`
          : undefined
      }
      onClose={onClose}
      isLoading={isLoading && !requisition}
      error={error && !requisition ? "Failed to load requisition" : null}
      footer={footer}
    >
      {requisition ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill status={requisition.status} vocabulary="movementStatus" />
            {requisition.fulfilledAt ? (
              <span className="text-sm text-muted">
                Fulfilled {formatDate(requisition.fulfilledAt)}
              </span>
            ) : null}
          </div>

          {jobHref ? (
            <div className="rounded-lg border border-border bg-[var(--color-surface-muted)] px-3 py-2 text-sm">
              <span className="text-muted">Linked job: </span>
              <Link
                href={jobHref}
                className="font-medium text-[var(--color-brand-accent)] hover:underline"
              >
                View job
              </Link>
            </div>
          ) : null}

          {requisition.notes ? (
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">
                Notes
              </p>
              <p className="text-sm text-foreground">{requisition.notes}</p>
            </div>
          ) : null}

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
              Requested parts ({requisition.lines.length})
            </p>
            {requisition.lines.length === 0 ? (
              <p className="text-sm text-muted">No line items.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="pb-2 font-medium">SKU</th>
                    <th className="pb-2 font-medium">Name</th>
                    <th className="pb-2 text-right font-medium">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {requisition.lines.map((line, index) => (
                    <tr
                      key={`${line.sku}-${index}`}
                      className="border-b border-border/60"
                    >
                      <td className="py-2 font-mono text-xs">{line.sku}</td>
                      <td className="py-2">{line.name}</td>
                      <td className="py-2 text-right">
                        {formatNumber(line.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {mode === "incoming" ? (
            <p className="text-xs text-muted">
              Approve only when available stock covers each line. Fulfilment
              moves stock from this warehouse to the requesting shop (no money
              ledger).
            </p>
          ) : mode === "outgoing" && requisition.status === "Pending" ? (
            <p className="text-xs text-muted">
              Waiting for the supplying department to approve. You can cancel
              while the request is still Pending.
            </p>
          ) : null}
        </div>
      ) : null}
    </RecordViewModal>
  );
}
