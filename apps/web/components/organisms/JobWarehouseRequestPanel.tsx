"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Package } from "lucide-react";
import type { RequisitionLine } from "@vonos/types";
import { Button } from "@/components/atoms/Button";
import { Select } from "@/components/atoms/Select";
import { Modal, ModalFooter, ModalHeader } from "@/components/atoms/Modal";
import type { JobDetail } from "@/lib/api/jobs";
import { getItem, getSourceAvailability } from "@/lib/api/items";
import { createRequisition } from "@/lib/api/requisitions";
import { useAppMutation } from "@/lib/hooks/useAppMutation";
import { formatNumber } from "@/lib/utils/formatCurrency";

interface JobWarehouseRequestPanelProps {
  job: JobDetail;
  tenantId: string;
}

/** Internal departments a VA job can request parts from. */
const REQUEST_DEPARTMENTS: { code: string; label: string }[] = [
  { code: "VW", label: "Warehouse" },
  { code: "VISP", label: "Spare Parts — Institute" },
  { code: "VSP", label: "Spare Parts — Marketplace" },
];

export function JobWarehouseRequestPanel({
  job,
  tenantId,
}: JobWarehouseRequestPanelProps) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [department, setDepartment] = useState(REQUEST_DEPARTMENTS[0]!.code);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [availableByMaterial, setAvailableByMaterial] = useState<
    Record<string, number | null>
  >({});

  const catalogMaterials = useMemo(
    () => job.materials.filter((row) => row.itemId),
    [job.materials],
  );

  const openModal = () => {
    const internalDept = catalogMaterials.find(
      (row) => row.sourceType === "internal" && row.sourceDepartment,
    )?.sourceDepartment;
    if (
      internalDept &&
      REQUEST_DEPARTMENTS.some((d) => d.code === internalDept)
    ) {
      setDepartment(internalDept);
    }
    setSelectedIds(new Set(catalogMaterials.map((row) => row.id)));
    setNotes(`Parts for job ${job.reference}`);
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    void (async () => {
      const next: Record<string, number | null> = {};
      for (const row of catalogMaterials) {
        try {
          const item = await getItem(row.itemId!);
          const avail = await getSourceAvailability(
            tenantId,
            item.sku,
            department,
          );
          next[row.id] = avail.available;
        } catch {
          next[row.id] = null;
        }
      }
      if (!cancelled) setAvailableByMaterial(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, department, catalogMaterials, tenantId]);

  const toggleMaterial = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const createMutation = useAppMutation({
    mutationFn: async () => {
      const picked = catalogMaterials.filter((row) => selectedIds.has(row.id));
      if (picked.length === 0) {
        throw new Error("Select at least one catalog-linked material");
      }

      const lines: RequisitionLine[] = [];
      for (const material of picked) {
        const item = await getItem(material.itemId!);
        lines.push({
          itemId: item.id,
          sku: item.sku,
          name: material.name || item.name,
          quantity: material.quantity,
        });
      }

      const suffix = Date.now().toString(36).slice(-4).toUpperCase();
      return createRequisition(tenantId, {
        reference: `REQ-${job.reference}-${suffix}`,
        jobId: job.id,
        notes: notes.trim() || undefined,
        sourceTenantCode: department,
        lines,
      });
    },
    successMessage: "Internal requisition created",
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["requisitions", tenantId],
      });
      setOpen(false);
    },
  });

  if (catalogMaterials.length === 0) {
    return null;
  }

  return (
    <>
      <section className="rounded-lg border border-border bg-card p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-[var(--color-brand-accent)]" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                Internal parts requisition
              </p>
              <p className="text-xs text-muted">
                Request catalog parts from another Vonos department for this
                job. The supplying warehouse approves and fulfils.
              </p>
            </div>
          </div>
          <Button size="sm" variant="secondary" onClick={openModal}>
            Request internally
          </Button>
        </div>
      </section>

      <Modal open={open} onClose={() => setOpen(false)} panelClassName="max-w-lg">
        <ModalHeader
          title="Request parts internally"
          subtitle={`Job ${job.reference}`}
          onClose={() => setOpen(false)}
        />
        <div className="space-y-4 border-t border-border px-4 py-4">
          <Select
            label="Supplying department"
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            options={REQUEST_DEPARTMENTS.map((d) => ({
              value: d.code,
              label: d.label,
            }))}
          />
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
              Materials to request
            </p>
            <ul className="max-h-48 space-y-2 overflow-y-auto">
              {catalogMaterials.map((row) => {
                const available = availableByMaterial[row.id];
                return (
                  <li
                    key={row.id}
                    className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
                  >
                    <input
                      id={`req-${row.id}`}
                      type="checkbox"
                      checked={selectedIds.has(row.id)}
                      onChange={() => toggleMaterial(row.id)}
                      className="h-4 w-4 rounded border-border accent-[var(--color-brand-accent)]"
                    />
                    <label htmlFor={`req-${row.id}`} className="flex-1 text-sm">
                      <span className="font-medium">{row.name}</span>
                      <span className="ml-2 text-muted">
                        × {formatNumber(row.quantity)}
                      </span>
                      <span className="mt-0.5 block text-xs text-muted">
                        {available === undefined
                          ? "Checking source stock…"
                          : available === null
                            ? "Source available: —"
                            : `Source available: ${formatNumber(available)}`}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
          <div>
            <label
              htmlFor="req-notes"
              className="mb-1 block text-xs font-medium text-muted"
            >
              Notes (optional)
            </label>
            <textarea
              id="req-notes"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              rows={2}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>
        <ModalFooter>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={createMutation.isPending || selectedIds.size === 0}
            onClick={() => createMutation.mutate()}
          >
            Submit requisition
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
