"use client";

import { useEffect, useMemo, useState } from "react";
import type { Job, Sale } from "@vonos/types";
import {
  Hq6Field,
  Hq6Modal,
  Hq6ModalSaveClose,
} from "@/components/hq6/Hq6Modal";
import { getJob, updateJobStatus } from "@/lib/api/jobs";
import { toast } from "@/stores/toastStore";

const ALL_STAGES = [
  "Received",
  "Quoted",
  "Approved",
  "In Progress",
  "QC",
  "Delivered",
] as const;

type Props = {
  open: boolean;
  sale: Sale | null;
  onClose: () => void;
  onUpdated?: () => void;
};

/**
 * VA / VP sales Action → update linked job stage + notes (feeds public track).
 */
export function Hq6UpdateJobStatusModal({
  open,
  sale,
  onClose,
  onUpdated,
}: Props) {
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("Received");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const jobId = sale?.jobId?.trim() || null;

  const statusOptions = useMemo(() => {
    if (!job) return [...ALL_STAGES];
    return job.hasQuote
      ? [...ALL_STAGES]
      : ALL_STAGES.filter((s) => s !== "Quoted");
  }, [job]);

  useEffect(() => {
    if (!open || !jobId) {
      setJob(null);
      setLoadError("");
      setNotes("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError("");
    void getJob(jobId)
      .then((detail) => {
        if (cancelled) return;
        setJob(detail);
        setStatus(detail.status || "Received");
        setNotes("");
      })
      .catch((err) => {
        if (cancelled) return;
        setJob(null);
        setLoadError(
          err instanceof Error ? err.message : "Failed to load job",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, jobId]);

  const handleUpdate = async () => {
    if (!jobId || !job) return;
    const trimmedNotes = notes.trim();
    if (status === job.status && !trimmedNotes) {
      toast.error("Change the status or add a note");
      return;
    }
    setSaving(true);
    try {
      await updateJobStatus(jobId, {
        status,
        ...(trimmedNotes ? { notes: trimmedNotes } : {}),
      });
      toast.success(
        status !== job.status
          ? `Job ${job.reference}: status → ${status}`
          : `Job ${job.reference}: notes saved`,
      );
      onUpdated?.();
      onClose();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update job status",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Hq6Modal
      open={open && Boolean(sale)}
      onClose={onClose}
      title="Update job status"
      size="md"
      footer={
        <Hq6ModalSaveClose
          saveLabel="Update"
          onSave={() => void handleUpdate()}
          onClose={onClose}
          saving={saving}
          saveDisabled={!job || loading || Boolean(loadError)}
        />
      }
    >
      {!jobId ? (
        <p className="text-sm text-[#6b7280]">
          This sale is not linked to a job. Open the job from Jobs, or link a
          job when creating the sale.
        </p>
      ) : loading ? (
        <p className="text-sm text-[#6b7280]">Loading job…</p>
      ) : loadError ? (
        <p className="text-sm text-[#b91c1c]">{loadError}</p>
      ) : job ? (
        <div className="space-y-3">
          <div className="rounded border border-[#e5e7eb] bg-[#f9fafb] px-3 py-2 text-sm">
            <div>
              <span className="font-semibold text-[#374151]">Job:</span>{" "}
              {job.reference}
              {sale?.jobReference && sale.jobReference !== job.reference
                ? ` (${sale.jobReference})`
                : null}
            </div>
            {job.customerName ? (
              <div className="text-[#6b7280]">{job.customerName}</div>
            ) : null}
            <div className="text-xs text-[#6b7280]">
              Current: {job.status}
            </div>
          </div>

          <Hq6Field label="Job status" required>
            <select
              className="hq6-form-input"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {statusOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </Hq6Field>

          <Hq6Field label="Notes">
            <textarea
              className="hq6-form-input min-h-[5rem]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What changed? (shown on the job; customers only see stage, not this text)"
              rows={4}
            />
          </Hq6Field>

          {job.qcNotes?.trim() ? (
            <div>
              <div className="mb-1 text-xs font-semibold text-[#374151]">
                Previous notes
              </div>
              <p className="hq6-purchase-note-well max-h-32 overflow-y-auto whitespace-pre-wrap text-xs">
                {job.qcNotes}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}
    </Hq6Modal>
  );
}
