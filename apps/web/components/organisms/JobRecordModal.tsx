"use client";

import { useQuery } from "@tanstack/react-query";
import { StatusPill } from "@/components/atoms/StatusPill";
import { RecordViewModal } from "@/components/organisms/RecordViewModal";
import { getJobShell } from "@/lib/api/jobs";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";
import {
  MODAL_RECORD_STALE_MS,
  modalKeys,
} from "@/lib/query/modalQueryKeys";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";

export function JobRecordModal({
  jobId,
  onClose,
}: {
  jobId: string | null;
  onClose: () => void;
}) {
  const { tenantId } = useRouteTenant();

  const { data: job, isLoading, error } = useQuery({
    queryKey: modalKeys.job(tenantId, jobId),
    queryFn: () => getJobShell(jobId!),
    enabled: Boolean(tenantId && jobId),
    staleTime: MODAL_RECORD_STALE_MS,
  });

  return (
    <RecordViewModal
      open={Boolean(jobId)}
      title={job ? `Job ${job.reference}` : "Job details"}
      subtitle={
        job
          ? `${formatDate(job.updatedAt ?? job.createdAt)} · ${job.customerName ?? "—"}`
          : undefined
      }
      onClose={onClose}
      isLoading={isLoading}
      error={error ? "Could not load this job." : null}
    >
      {job ? (
        <div className="space-y-4">
          <StatusPill status={job.status} vocabulary="jobStatus" />
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Reference</dt>
              <dd className="font-medium text-foreground">{job.reference}</dd>
            </div>
            <div>
              <dt className="text-muted">Customer</dt>
              <dd className="font-medium text-foreground">
                {job.customerName ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Location</dt>
              <dd className="font-medium text-foreground">
                {job.locationCode ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Quote</dt>
              <dd className="font-medium text-foreground">
                {job.quoteAmount != null
                  ? formatCurrency(job.quoteAmount, "NGN")
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Invoice</dt>
              <dd className="font-medium text-foreground">
                {job.invoiceAmount != null
                  ? formatCurrency(job.invoiceAmount, "NGN")
                  : "—"}
              </dd>
            </div>
            {job.description ? (
              <div className="sm:col-span-2">
                <dt className="text-muted">Description</dt>
                <dd className="font-medium text-foreground">{job.description}</dd>
              </div>
            ) : null}
          </dl>
        </div>
      ) : null}
    </RecordViewModal>
  );
}
