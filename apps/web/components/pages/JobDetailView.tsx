"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useParams } from "next/navigation";
import {
  DetailPageShell,
  getStepperHeaderAction,
} from "@/components/pages/DetailPageShell";
import { DetailPanelSection } from "@/components/organisms/DetailPanelSection";
import { buildAdaptiveJobStages } from "@/components/organisms/StatusStepper";
import type { JobDetail } from "@/lib/api/jobs";
import { advanceJobStatus, updateJobQc } from "@/lib/api/jobs";
import { formatDate } from "@/lib/utils/formatDate";
import type { SectionInstance } from "@/lib/registries/sectionTypes";
import { useAuditHistoryFeed, createdByField } from "@/lib/hooks/useAuditHistoryFeed";
import { JobQuoteInvoicePanel } from "@/components/molecules/JobQuoteInvoicePanel";
import {
  JobCostSummaryPanel,
  JobLabourPanel,
  JobMaterialsPanel,
} from "@/components/organisms/JobCostPanels";
import { JobWarehouseRequestPanel } from "@/components/organisms/JobWarehouseRequestPanel";
import { JobVehiclePanel } from "@/components/organisms/JobVehiclePanel";
import { useTenantId } from "@/lib/hooks/useRouteTenant";

const QC_ITEMS = ["Welds inspected", "Finish quality checked", "Road test completed"];

function QcPanel({
  job,
  onJobChange,
}: {
  job: JobDetail;
  onJobChange: (job: JobDetail) => void;
}) {
  const queryClient = useQueryClient();
  const [checked, setChecked] = useState<Record<string, boolean>>(
    () => job.qcChecklist ?? {},
  );
  const [notes, setNotes] = useState(job.qcNotes ?? "");

  useEffect(() => {
    setChecked(job.qcChecklist ?? {});
    setNotes(job.qcNotes ?? "");
  }, [job.id, job.qcChecklist, job.qcNotes]);

  const saveMutation = useAppMutation({
    mutationFn: () =>
      updateJobQc(job.id, {
        qcChecklist: checked,
        qcNotes: notes.trim() || null,
      }),
    successMessage: "QC checklist saved",
    onSuccess: (updated) => {
      onJobChange(updated);
      void queryClient.invalidateQueries({ queryKey: ["job", job.id] });
    },
  });

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Quality Control</h3>
        <button
          type="button"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-[var(--color-surface-muted)] disabled:opacity-60"
        >
          {saveMutation.isPending ? "Saving…" : "Save QC"}
        </button>
      </div>
      <ul className="space-y-3">
        {QC_ITEMS.map((item) => (
          <li key={item} className="flex items-center gap-3">
            <input
              id={`${job.id}-${item}`}
              type="checkbox"
              checked={Boolean(checked[item])}
              onChange={() =>
                setChecked((prev) => ({ ...prev, [item]: !prev[item] }))
              }
              className="h-4 w-4 rounded border-border accent-[var(--color-brand-accent)]"
            />
            <label htmlFor={`${job.id}-${item}`} className="text-sm text-foreground">
              {item}
            </label>
          </li>
        ))}
      </ul>
      <textarea
        className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        placeholder="QC notes..."
        rows={3}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
    </section>
  );
}

export interface JobDetailViewProps {
  job: JobDetail;
  listPath: string;
  onJobChange: (job: JobDetail) => void;
}

export function JobDetailView({ job, listPath, onJobChange }: JobDetailViewProps) {
  const params = useParams<{ tenant: string }>();
  const tenantId = useTenantId();
  const queryClient = useQueryClient();
  const isMechanics = params.tenant === "VA";

  const stages = buildAdaptiveJobStages(job.hasQuote);
  const currentIndex = stages.indexOf(job.status);
  const nextStage =
    currentIndex >= 0 && currentIndex < stages.length - 1 ? stages[currentIndex + 1] : null;

  const advanceMutation = useAppMutation({
    mutationFn: () => advanceJobStatus(job.id),
    successMessage: () =>
      nextStage ? `Job marked as ${nextStage}` : "Job status updated",
    onSuccess: (updated) => {
      onJobChange({ ...job, status: updated.status });
      void queryClient.invalidateQueries({ queryKey: ["job", job.id] });
      void queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });

  const advance = () => {
    if (!nextStage || advanceMutation.isPending) return;
    advanceMutation.mutate();
  };

  const { entries: auditEntries } = useAuditHistoryFeed("job", job.id, job.tenantId);
  const createdBy = createdByField(job.createdByName);
  const activityFeed = auditEntries;

  const materialsTotal = job.materials.reduce((sum, row) => sum + row.totalCost, 0);
  const labourTotal = job.labourEntries.reduce((sum, row) => sum + row.totalCost, 0);

  const stepper = { stages, currentStage: job.status };
  const showQc = ["QC", "Delivered"].includes(job.status);

  const descriptionSection: SectionInstance = {
    type: "genericFields",
    title: "Job Description",
    data: [
      { label: "Description", value: job.description },
      ...(createdBy ? [createdBy] : []),
    ],
  };

  return (
    <DetailPageShell
      backHref={listPath}
      backLabel="Back to jobs"
      title={job.reference}
      subtitle={job.customerName ?? undefined}
      meta={job.dueDate ? `Due ${formatDate(job.dueDate)}` : undefined}
      status={{ label: job.status, vocabulary: "jobStatus" }}
      stepper={stepper}
      onAdvance={nextStage ? advance : undefined}
      headerAction={getStepperHeaderAction(stepper, nextStage ? advance : undefined)}
      layout="default"
      sections={[]}
      footer={
        <div className="space-y-6">
          {isMechanics && tenantId ? (
            <JobVehiclePanel
              job={job}
              tenantId={tenantId}
              tenantCode={params.tenant}
              onJobChange={onJobChange}
            />
          ) : null}

          {isMechanics ? (
            <JobQuoteInvoicePanel job={job} onJobChange={onJobChange} />
          ) : null}

          {isMechanics && tenantId ? (
            <JobWarehouseRequestPanel job={job} tenantId={tenantId} />
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <DetailPanelSection sections={[descriptionSection]} />
              {tenantId ? (
                <JobMaterialsPanel
                  job={job}
                  tenantId={tenantId}
                  onJobChange={onJobChange}
                />
              ) : null}
            </div>
            <div className="space-y-4">
              {tenantId ? (
                <JobLabourPanel job={job} tenantId={tenantId} onJobChange={onJobChange} />
              ) : null}
              <JobCostSummaryPanel
                quoted={job.quoteAmount}
                materialsTotal={materialsTotal}
                labourTotal={labourTotal}
              />
            </div>
          </div>

          {showQc ? <QcPanel job={job} onJobChange={onJobChange} /> : null}

          <DetailPanelSection
            sections={[{ type: "historyFeed", title: "Activity Timeline", data: activityFeed }]}
          />
        </div>
      }
    />
  );
}
