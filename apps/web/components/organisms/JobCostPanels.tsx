"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import type { JobLabour, JobMaterial } from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import { Select } from "@/components/atoms/Select";
import { EmptyState } from "@/components/atoms/EmptyState";
import {
  ProductItemSearch,
  type CatalogPartPick,
} from "@/components/molecules/ProductItemSearch";
import type { JobDetail } from "@/lib/api/jobs";
import {
  addJobLabour,
  addJobMaterial,
  removeJobLabour,
  removeJobMaterial,
  updateJobLabour,
  updateJobMaterial,
} from "@/lib/api/jobs";
import { getUsers } from "@/lib/api/users";
import { getSuppliers } from "@/lib/api/suppliers";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { formatCurrency } from "@/lib/utils/formatCurrency";
import { cn } from "@/lib/utils/cn";

type PartSourceMode = "shop" | "internal" | "external";

/** Internal departments a VA job can pull parts from. */
const INTERNAL_DEPARTMENTS: { code: string; label: string }[] = [
  { code: "VW", label: "Warehouse" },
  { code: "VISP", label: "Spare Parts — Institute" },
  { code: "VSP", label: "Spare Parts — Marketplace" },
];

const SOURCE_MODES: { id: PartSourceMode; label: string }[] = [
  { id: "shop", label: "Own stock (VA → VW → purchase)" },
  { id: "internal", label: "Internal dept" },
  { id: "external", label: "External purchase" },
];

interface JobCostPanelProps {
  job: JobDetail;
  tenantId: string;
  onJobChange: (job: JobDetail) => void;
}

function invalidateJobQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  jobId: string,
) {
  void queryClient.invalidateQueries({ queryKey: ["job", jobId] });
  void queryClient.invalidateQueries({ queryKey: ["jobs"] });
  void queryClient.invalidateQueries({ queryKey: ["audit", "job", jobId] });
}

export function JobMaterialsPanel({ job, tenantId, onJobChange }: JobCostPanelProps) {
  const queryClient = useQueryClient();
  const [manualName, setManualName] = useState("");
  const [manualQty, setManualQty] = useState("1");
  const [manualUnitCost, setManualUnitCost] = useState("");
  const [sourceMode, setSourceMode] = useState<PartSourceMode>("shop");
  const [department, setDepartment] = useState(INTERNAL_DEPARTMENTS[0].code);
  const [supplierId, setSupplierId] = useState("");

  const suppliersQuery = useQuery({
    queryKey: ["suppliers", tenantId, "job-materials"],
    queryFn: () => getSuppliers(tenantId),
    enabled: Boolean(tenantId) && sourceMode === "external",
  });

  const supplierOptions = useMemo(
    () =>
      (suppliersQuery.data ?? []).map((supplier) => ({
        value: supplier.id,
        label: supplier.name,
      })),
    [suppliersQuery.data],
  );

  const subtotal = job.materials.reduce((sum, row) => sum + row.totalCost, 0);

  const addMutation = useAppMutation({
    mutationFn: (body: {
      itemId?: string;
      name: string;
      quantity: number;
      unitCost: number;
      source?: string;
      sourceType?: PartSourceMode;
      sourceDepartment?: string;
      supplierId?: string;
    }) => addJobMaterial(job.id, body),
    onSuccess: (updated) => {
      onJobChange(updated);
      invalidateJobQueries(queryClient, job.id);
      setManualName("");
      setManualQty("1");
      setManualUnitCost("");
    },
  });

  const sourcingFields = () => {
    if (sourceMode === "internal") {
      return {
        sourceType: "internal" as const,
        sourceDepartment: department,
        source:
          INTERNAL_DEPARTMENTS.find((d) => d.code === department)?.label ??
          department,
      };
    }
    if (sourceMode === "external") {
      return {
        sourceType: "external" as const,
        supplierId,
        source: "Purchase",
      };
    }
    return { sourceType: "shop" as const, source: "Own stock" };
  };

  const updateMutation = useAppMutation({
    mutationFn: ({
      materialId,
      patch,
    }: {
      materialId: string;
      patch: { quantity?: number; unitCost?: number };
    }) => updateJobMaterial(job.id, materialId, patch),
    onSuccess: (updated) => {
      onJobChange(updated);
      invalidateJobQueries(queryClient, job.id);
    },
  });

  const removeMutation = useAppMutation({
    mutationFn: (materialId: string) => removeJobMaterial(job.id, materialId),
    onSuccess: (updated) => {
      onJobChange(updated);
      invalidateJobQueries(queryClient, job.id);
    },
  });

  const addFromItem = (pick: CatalogPartPick) => {
    if (pick.isCustom) {
      setManualName(pick.name);
      return;
    }
    addMutation.mutate({
      itemId: pick.itemId,
      name: pick.name,
      quantity: 1,
      unitCost: pick.costPrice || pick.sellPrice || 0,
      ...sourcingFields(),
    });
  };

  const externalNeedsSupplier = sourceMode === "external" && !supplierId;

  const addManual = () => {
    const quantity = Number(manualQty);
    const unitCost = Number(manualUnitCost);
    if (!manualName.trim() || externalNeedsSupplier) return;
    addMutation.mutate({
      name: manualName.trim(),
      quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      unitCost: Number.isFinite(unitCost) && unitCost >= 0 ? unitCost : 0,
      ...sourcingFields(),
    });
  };

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Materials Used</h3>
        <span className="text-sm text-muted">{formatCurrency(subtotal, "NGN")}</span>
      </div>

      <div className="mb-4 space-y-3 rounded-lg border border-dashed border-border bg-[var(--color-surface-muted)] p-3">
        <div>
          <span className="mb-1.5 block text-xs font-medium text-muted">Part source</span>
          <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
            {SOURCE_MODES.map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setSourceMode(mode.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  sourceMode === mode.id
                    ? "bg-[var(--color-brand-primary)] text-white"
                    : "text-foreground hover:bg-[var(--color-surface-nav-hover)]",
                )}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {sourceMode === "internal" ? (
          <Select
            label="Supplying department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            options={INTERNAL_DEPARTMENTS.map((d) => ({
              value: d.code,
              label: d.label,
            }))}
          />
        ) : null}

        {sourceMode === "external" ? (
          <Select
            label="Supplier (required)"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            options={[
              { value: "", label: "Select supplier…" },
              ...supplierOptions,
            ]}
          />
        ) : null}

        {sourceMode !== "external" ? (
          <ProductItemSearch
            tenantId={tenantId}
            includeWarehouse
            allowCustom
            placeholder="Search own stock or warehouse parts…"
            onSelect={addFromItem}
          />
        ) : null}

        <div className="grid gap-2 sm:grid-cols-3">
          <Input
            label="Manual part name"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="e.g. Brake pads"
          />
          <Input
            label="Qty"
            type="number"
            min="0.01"
            step="0.01"
            value={manualQty}
            onChange={(e) => setManualQty(e.target.value)}
          />
          <Input
            label="Unit cost"
            type="number"
            min="0"
            step="0.01"
            value={manualUnitCost}
            onChange={(e) => setManualUnitCost(e.target.value)}
          />
        </div>
        {externalNeedsSupplier ? (
          <p className="text-xs text-amber-600">
            Select a supplier before adding an external purchase.
          </p>
        ) : null}
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="secondary"
            disabled={!manualName.trim() || externalNeedsSupplier || addMutation.isPending}
            onClick={addManual}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add manual line
          </Button>
        </div>
      </div>

      {job.materials.length === 0 ? (
        <EmptyState title="No materials" message="Search catalog or add a manual line above." />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="pb-2 font-medium">Material</th>
              <th className="pb-2 font-medium">Qty</th>
              <th className="pb-2 text-right font-medium">Unit</th>
              <th className="pb-2 text-right font-medium">Total</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {job.materials.map((row) => (
              <MaterialRow
                key={row.id}
                row={row}
                disabled={updateMutation.isPending || removeMutation.isPending}
                onUpdate={(patch) =>
                  updateMutation.mutate({ materialId: row.id, patch })
                }
                onRemove={() => removeMutation.mutate(row.id)}
              />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function MaterialSourceLabel({ row }: { row: JobMaterial }) {
  if (row.sourceType === "internal") {
    const label =
      INTERNAL_DEPARTMENTS.find((d) => d.code === row.sourceDepartment)?.label ??
      row.sourceDepartment ??
      "Internal";
    return (
      <div className="text-xs text-[var(--color-brand-accent)]">
        Internal · {label}
      </div>
    );
  }
  if (row.sourceType === "external") {
    return (
      <div className="text-xs text-amber-600">
        Purchase{row.supplierName ? ` · ${row.supplierName}` : ""}
      </div>
    );
  }
  if (row.source) {
    return <div className="text-xs text-muted">{row.source}</div>;
  }
  return null;
}

function MaterialRow({
  row,
  disabled,
  onUpdate,
  onRemove,
}: {
  row: JobMaterial;
  disabled: boolean;
  onUpdate: (patch: { quantity?: number; unitCost?: number }) => void;
  onRemove: () => void;
}) {
  const [qty, setQty] = useState(String(row.quantity));
  const [unit, setUnit] = useState(String(row.unitCost));

  const commit = () => {
    const quantity = Number(qty);
    const unitCost = Number(unit);
    const patch: { quantity?: number; unitCost?: number } = {};
    if (Number.isFinite(quantity) && quantity > 0 && quantity !== row.quantity) {
      patch.quantity = quantity;
    }
    if (Number.isFinite(unitCost) && unitCost >= 0 && unitCost !== row.unitCost) {
      patch.unitCost = unitCost;
    }
    if (Object.keys(patch).length > 0) onUpdate(patch);
  };

  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-2.5">
        <div>{row.name}</div>
        <MaterialSourceLabel row={row} />
      </td>
      <td className="py-2.5">
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={qty}
          disabled={disabled}
          onChange={(e) => setQty(e.target.value)}
          onBlur={commit}
          className="w-16 rounded border border-border px-2 py-1 text-sm"
        />
      </td>
      <td className="py-2.5 text-right">
        <input
          type="number"
          min="0"
          step="0.01"
          value={unit}
          disabled={disabled}
          onChange={(e) => setUnit(e.target.value)}
          onBlur={commit}
          className="w-24 rounded border border-border px-2 py-1 text-right text-sm"
        />
      </td>
      <td className="py-2.5 text-right font-medium">
        {formatCurrency(row.totalCost, "NGN")}
      </td>
      <td className="py-2.5 text-right">
        <button
          type="button"
          className="text-muted hover:text-error"
          disabled={disabled}
          aria-label={`Remove ${row.name}`}
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

export function JobLabourPanel({ job, tenantId, onJobChange }: JobCostPanelProps) {
  const queryClient = useQueryClient();
  const [staffId, setStaffId] = useState("");
  const [hours, setHours] = useState("1");
  const [rate, setRate] = useState("");

  const usersQuery = useQuery({
    queryKey: ["users", tenantId, "job-labour"],
    queryFn: () => getUsers(tenantId),
    enabled: Boolean(tenantId),
  });

  const staffOptions = useMemo(
    () =>
      (usersQuery.data ?? []).map((user) => ({
        value: user.id,
        label: user.name,
      })),
    [usersQuery.data],
  );

  const subtotal = job.labourEntries.reduce((sum, row) => sum + row.totalCost, 0);

  const addMutation = useAppMutation({
    mutationFn: () =>
      addJobLabour(job.id, {
        staffId,
        hours: Number(hours) || 0,
        rate: Number(rate) || 0,
      }),
    onSuccess: (updated) => {
      onJobChange(updated);
      invalidateJobQueries(queryClient, job.id);
      setHours("1");
      setRate("");
    },
  });

  const updateMutation = useAppMutation({
    mutationFn: ({
      labourId,
      patch,
    }: {
      labourId: string;
      patch: { hours?: number; rate?: number };
    }) => updateJobLabour(job.id, labourId, patch),
    onSuccess: (updated) => {
      onJobChange(updated);
      invalidateJobQueries(queryClient, job.id);
    },
  });

  const removeMutation = useAppMutation({
    mutationFn: (labourId: string) => removeJobLabour(job.id, labourId),
    onSuccess: (updated) => {
      onJobChange(updated);
      invalidateJobQueries(queryClient, job.id);
    },
  });

  return (
    <section className="rounded-lg border border-border bg-card p-5 shadow-card">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">Labour Log</h3>
        <span className="text-sm text-muted">{formatCurrency(subtotal, "NGN")}</span>
      </div>

      <div className="mb-4 grid gap-2 rounded-lg border border-dashed border-border bg-[var(--color-surface-muted)] p-3 sm:grid-cols-4">
        <Select
          label="Staff"
          value={staffId}
          onChange={(e) => setStaffId(e.target.value)}
          options={[{ value: "", label: "Select staff…" }, ...staffOptions]}
        />
        <Input
          label="Hours"
          type="number"
          min="0.01"
          step="0.25"
          value={hours}
          onChange={(e) => setHours(e.target.value)}
        />
        <Input
          label="Rate / hour"
          type="number"
          min="0"
          step="0.01"
          value={rate}
          onChange={(e) => setRate(e.target.value)}
        />
        <div className="flex items-end">
          <Button
            size="sm"
            className="w-full"
            disabled={!staffId || addMutation.isPending}
            onClick={() => addMutation.mutate()}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add labour
          </Button>
        </div>
      </div>

      {job.labourEntries.length === 0 ? (
        <EmptyState title="No labour" message="Log staff hours using the form above." />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="pb-2 font-medium">Staff</th>
              <th className="pb-2 font-medium">Hours</th>
              <th className="pb-2 text-right font-medium">Rate</th>
              <th className="pb-2 text-right font-medium">Total</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {job.labourEntries.map((row) => (
              <LabourRow
                key={row.id}
                row={row}
                disabled={updateMutation.isPending || removeMutation.isPending}
                onUpdate={(patch) => updateMutation.mutate({ labourId: row.id, patch })}
                onRemove={() => removeMutation.mutate(row.id)}
              />
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function LabourRow({
  row,
  disabled,
  onUpdate,
  onRemove,
}: {
  row: JobLabour;
  disabled: boolean;
  onUpdate: (patch: { hours?: number; rate?: number }) => void;
  onRemove: () => void;
}) {
  const [hours, setHours] = useState(String(row.hours));
  const [rate, setRate] = useState(String(row.rate));

  const commit = () => {
    const nextHours = Number(hours);
    const nextRate = Number(rate);
    const patch: { hours?: number; rate?: number } = {};
    if (Number.isFinite(nextHours) && nextHours > 0 && nextHours !== row.hours) {
      patch.hours = nextHours;
    }
    if (Number.isFinite(nextRate) && nextRate >= 0 && nextRate !== row.rate) {
      patch.rate = nextRate;
    }
    if (Object.keys(patch).length > 0) onUpdate(patch);
  };

  return (
    <tr className="border-b border-border last:border-0">
      <td className="py-2.5">{row.staffName ?? row.staffId}</td>
      <td className="py-2.5">
        <input
          type="number"
          min="0.01"
          step="0.25"
          value={hours}
          disabled={disabled}
          onChange={(e) => setHours(e.target.value)}
          onBlur={commit}
          className="w-16 rounded border border-border px-2 py-1 text-sm"
        />
      </td>
      <td className="py-2.5 text-right">
        <input
          type="number"
          min="0"
          step="0.01"
          value={rate}
          disabled={disabled}
          onChange={(e) => setRate(e.target.value)}
          onBlur={commit}
          className="w-24 rounded border border-border px-2 py-1 text-right text-sm"
        />
      </td>
      <td className="py-2.5 text-right font-medium">
        {formatCurrency(row.totalCost, "NGN")}
      </td>
      <td className="py-2.5 text-right">
        <button
          type="button"
          className="text-muted hover:text-error"
          disabled={disabled}
          aria-label="Remove labour entry"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

export function JobCostSummaryPanel({
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
