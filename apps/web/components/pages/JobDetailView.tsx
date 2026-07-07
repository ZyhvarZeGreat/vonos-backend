"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { useParams } from "next/navigation";
import { Car } from "lucide-react";
import {
  DetailPageShell,
  getStepperHeaderAction,
} from "@/components/pages/DetailPageShell";
import { DetailPanelSection } from "@/components/organisms/DetailPanelSection";
import { EmptyState } from "@/components/atoms/EmptyState";
import { buildAdaptiveJobStages } from "@/components/organisms/StatusStepper";
import type { JobDetail } from "@/lib/api/jobs";
import { advanceJobStatus } from "@/lib/api/jobs";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { formatDate } from "@/lib/utils/formatDate";
import type { SectionInstance } from "@/lib/registries/sectionTypes";
import type { JobLabour, JobMaterial } from "@vonos/types";
import { useAuditHistoryFeed, createdByField } from "@/lib/hooks/useAuditHistoryFeed";
import { JobQuoteInvoicePanel } from "@/components/molecules/JobQuoteInvoicePanel";

const QC_ITEMS = ["Welds inspected", "Finish quality checked", "Road test completed"];

function MaterialsPanel({ materials }: { materials: JobMaterial[] }) {
  const subtotal = materials.reduce((sum, row) => sum + row.totalCost, 0);

  if (materials.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-card p-5 shadow-card">
        <h3 className="mb-4 text-base font-semibold">Materials Used</h3>
        <EmptyState title="No materials" message="No materials logged on this job yet." />
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-card">
      <h3 className="mb-4 text-base font-semibold">Materials Used</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="pb-2 font-medium">Material</th>
            <th className="pb-2 font-medium">Qty</th>
            <th className="pb-2 text-right font-medium">Unit</th>
            <th className="pb-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0">
              <td className="py-2.5">{row.name}</td>
              <td className="py-2.5">{row.quantity}</td>
              <td className="py-2.5 text-right">{formatCurrency(row.unitCost, "NGN")}</td>
              <td className="py-2.5 text-right font-medium">
                {formatCurrency(row.totalCost, "NGN")}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="pt-3 text-right text-sm font-medium text-muted">
              Subtotal
            </td>
            <td className="pt-3 text-right font-semibold">{formatCurrency(subtotal, "NGN")}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}

function LabourPanel({ labourEntries }: { labourEntries: JobLabour[] }) {
  const subtotal = labourEntries.reduce((sum, row) => sum + row.totalCost, 0);

  if (labourEntries.length === 0) {
    return (
      <section className="rounded-lg border border-border bg-card p-5 shadow-card">
        <h3 className="mb-4 text-base font-semibold">Labour Log</h3>
        <EmptyState title="No labour" message="No labour entries logged on this job yet." />
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-card">
      <h3 className="mb-4 text-base font-semibold">Labour Log</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            <th className="pb-2 font-medium">Staff</th>
            <th className="pb-2 font-medium">Hours</th>
            <th className="pb-2 text-right font-medium">Rate</th>
            <th className="pb-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody>
          {labourEntries.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0">
              <td className="py-2.5">{row.staffName ?? row.staffId}</td>
              <td className="py-2.5">{row.hours}</td>
              <td className="py-2.5 text-right">{formatCurrency(row.rate, "NGN")}</td>
              <td className="py-2.5 text-right font-medium">
                {formatCurrency(row.totalCost, "NGN")}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={3} className="pt-3 text-right text-sm font-medium text-muted">
              Subtotal
            </td>
            <td className="pt-3 text-right font-semibold">{formatCurrency(subtotal, "NGN")}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}

function CostSummaryPanel({
  quoted,
  materialsTotal,
  labourTotal,
}: {
  quoted: number | null;
  materialsTotal: number;
  labourTotal: number;
}) {
  const actual = materialsTotal + labourTotal;
  const variance = quoted !== null ? quoted - actual : null;

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-card">
      <h3 className="mb-4 text-base font-semibold">Cost Summary</h3>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-muted">Materials</dt>
          <dd>{formatCurrency(materialsTotal, "NGN")}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-muted">Labour</dt>
          <dd>{formatCurrency(labourTotal, "NGN")}</dd>
        </div>
        <div className="flex justify-between border-t border-border pt-2 font-semibold">
          <dt>Total Cost</dt>
          <dd>{formatCurrency(actual, "NGN")}</dd>
        </div>
        {quoted !== null && variance !== null ? (
          <>
            <div className="flex justify-between pt-1">
              <dt className="text-muted">Quoted</dt>
              <dd>{formatCurrency(quoted, "NGN")}</dd>
            </div>
            <div className="flex justify-between font-medium">
              <dt>Variance</dt>
              <dd className={variance >= 0 ? "text-success" : "text-error"}>
                {variance >= 0 ? "Under budget · " : "Over budget · "}
                {formatCurrency(Math.abs(variance), "NGN")}
              </dd>
            </div>
          </>
        ) : null}
      </dl>
    </section>
  );
}

function QcPanel() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-card">
      <h3 className="mb-4 text-base font-semibold">Quality Control</h3>
      <ul className="space-y-3">
        {QC_ITEMS.map((item) => (
          <li key={item} className="flex items-center gap-3">
            <input
              id={item}
              type="checkbox"
              checked={Boolean(checked[item])}
              onChange={() => setChecked((prev) => ({ ...prev, [item]: !prev[item] }))}
              className="h-4 w-4 rounded border-border accent-[var(--color-brand-accent)]"
            />
            <label htmlFor={item} className="text-sm text-foreground">
              {item}
            </label>
          </li>
        ))}
      </ul>
      <textarea
        className="mt-4 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        placeholder="QC notes..."
        rows={3}
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
          {params.tenant === "VA" && job.vehicleId ? (
            <div className="inline-flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-card">
              <Car className="h-5 w-5 text-[var(--color-brand-accent)]" />
              <div>
                <p className="text-xs text-muted">Linked vehicle</p>
                <p className="font-medium text-foreground">{job.vehicleId}</p>
              </div>
            </div>
          ) : null}

          {isMechanics ? (
            <JobQuoteInvoicePanel job={job} onJobChange={onJobChange} />
          ) : null}

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <DetailPanelSection sections={[descriptionSection]} />
              <MaterialsPanel materials={job.materials} />
            </div>
            <div className="space-y-4">
              <LabourPanel labourEntries={job.labourEntries} />
              <CostSummaryPanel
                quoted={job.quoteAmount}
                materialsTotal={materialsTotal}
                labourTotal={labourTotal}
              />
            </div>
          </div>

          {showQc ? <QcPanel /> : null}

          <DetailPanelSection
            sections={[{ type: "historyFeed", title: "Activity Timeline", data: activityFeed }]}
          />
        </div>
      }
    />
  );
}
