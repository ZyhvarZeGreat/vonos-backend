"use client";

import { useState, type ReactNode } from "react";
import type { ReportRowAction, ReportsTableRow } from "@vonos/types";
import { CustomerRecordModal } from "@/components/organisms/CustomerRecordModal";
import { ExpenseRecordModal } from "@/components/organisms/ExpenseRecordModal";
import { ItemRecordModal } from "@/components/organisms/ItemRecordModal";
import { JobRecordModal } from "@/components/organisms/JobRecordModal";
import { MovementRecordModal } from "@/components/organisms/MovementRecordModal";
import { ReportRowDetailModal } from "@/components/organisms/ReportRowDetailModal";
import { SaleRecordModal } from "@/components/organisms/SaleRecordModal";
import { Hq6PurchaseViewModal } from "@/components/hq6/Hq6PurchaseViewModal";
import { useIsVaHq6 } from "@/lib/hooks/useIsVaHq6";
import { reportRowRecordId } from "@/lib/utils/recordDetailPath";

type ReportRecordRow = ReportsTableRow & {
  id?: string | number;
  saleId?: string | number;
  itemId?: string | number;
  customerId?: string | number;
  recordType?: string;
};

const PURCHASE_TYPES = new Set(["purchase", "movement", "stockMovement"]);

/**
 * Opens report row details as modals — never navigates away to list/detail pages.
 * Covers sale, customer, item, purchase/movement, job, expense, and a generic
 * fallback for payment / ledger / other row shapes.
 */
export function useReportRecordModals(options?: {
  /** Called before opening a modal (e.g. set admin viewing tenant). */
  onBeforeOpen?: () => void;
}) {
  const isHq6 = useIsVaHq6();
  const [saleModalId, setSaleModalId] = useState<string | null>(null);
  const [customerModalId, setCustomerModalId] = useState<string | null>(null);
  const [itemModalId, setItemModalId] = useState<string | null>(null);
  const [movementModalId, setMovementModalId] = useState<string | null>(null);
  const [jobModalId, setJobModalId] = useState<string | null>(null);
  const [expenseModalId, setExpenseModalId] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<ReportsTableRow | null>(null);

  const openReportRecord = (row: ReportRecordRow) => {
    const recordType = String(row.recordType ?? "");
    const recordId = reportRowRecordId(row);

    if (recordType === "item") {
      const itemId =
        row.itemId != null && row.itemId !== ""
          ? String(row.itemId)
          : recordId;
      if (!itemId) return;
      options?.onBeforeOpen?.();
      setItemModalId(itemId);
      return;
    }

    if (recordType === "sale") {
      if (!recordId) return;
      options?.onBeforeOpen?.();
      setSaleModalId(recordId);
      return;
    }

    if (recordType === "customer") {
      if (!recordId) return;
      options?.onBeforeOpen?.();
      setCustomerModalId(recordId);
      return;
    }

    if (PURCHASE_TYPES.has(recordType)) {
      if (!recordId) return;
      options?.onBeforeOpen?.();
      setMovementModalId(recordId);
      return;
    }

    if (recordType === "job") {
      if (!recordId) return;
      options?.onBeforeOpen?.();
      setJobModalId(recordId);
      return;
    }

    if (recordType === "expense") {
      if (!recordId) return;
      options?.onBeforeOpen?.();
      setExpenseModalId(recordId);
      return;
    }

    // Payment linked to a sale → sale modal; otherwise show row details in place.
    if (recordType === "payment") {
      const saleId =
        row.saleId != null && row.saleId !== "" ? String(row.saleId) : "";
      options?.onBeforeOpen?.();
      if (saleId) {
        setSaleModalId(saleId);
        return;
      }
      setDetailRow(row);
      return;
    }

    // Unknown / ledger / account txn — stay on reports, show the row.
    if (recordType || recordId) {
      options?.onBeforeOpen?.();
      setDetailRow(row);
    }
  };

  const handleRowAction = (action: ReportRowAction) => {
    switch (action.kind) {
      case "view-record":
      case "edit-payment": {
        const recordType = String(action.payload.recordType ?? "payment");
        const recordId = String(
          recordType === "sale"
            ? (action.payload.saleId ?? action.payload.id ?? "")
            : recordType === "item"
              ? (action.payload.itemId ?? action.payload.id ?? "")
              : recordType === "customer"
                ? (action.payload.customerId ?? action.payload.id ?? "")
                : recordType === "payment"
                  ? (action.payload.paymentId ?? action.payload.id ?? "")
                  : (action.payload.paymentId ??
                      action.payload.saleId ??
                      action.payload.itemId ??
                      action.payload.id ??
                      ""),
        );
        if (!recordId && recordType !== "payment") return;

        if (recordType === "sale") {
          openReportRecord({ recordType, id: recordId, saleId: recordId });
          return;
        }
        if (recordType === "item") {
          openReportRecord({ recordType, id: recordId, itemId: recordId });
          return;
        }
        if (recordType === "customer") {
          openReportRecord({ recordType, id: recordId, customerId: recordId });
          return;
        }
        if (PURCHASE_TYPES.has(recordType) || recordType === "job" || recordType === "expense") {
          openReportRecord({ recordType, id: recordId });
          return;
        }

        // Payment / edit-payment / unknown action — modal with payload fields.
        options?.onBeforeOpen?.();
        const saleId =
          action.payload.saleId != null ? String(action.payload.saleId) : "";
        if (saleId) {
          setSaleModalId(saleId);
          return;
        }
        setDetailRow({
          id: recordId || String(action.payload.paymentId ?? ""),
          recordType: recordType || "payment",
          ...Object.fromEntries(
            Object.entries(action.payload).filter(
              ([, v]) => typeof v === "string" || typeof v === "number",
            ),
          ),
        });
        break;
      }
      default:
        break;
    }
  };

  const modals: ReactNode = (
    <>
      <SaleRecordModal
        saleId={saleModalId}
        listSlug="sales"
        showFullPageLink={false}
        onClose={() => setSaleModalId(null)}
      />
      <CustomerRecordModal
        customerId={customerModalId}
        showFullPageLink={false}
        onClose={() => setCustomerModalId(null)}
      />
      <ItemRecordModal
        itemId={itemModalId}
        onClose={() => setItemModalId(null)}
      />
      {isHq6 ? (
        <Hq6PurchaseViewModal
          open={Boolean(movementModalId)}
          purchaseId={movementModalId}
          onClose={() => setMovementModalId(null)}
        />
      ) : (
        <MovementRecordModal
          movementId={movementModalId}
          listSlug="inbound"
          showFullPageLink={false}
          onClose={() => setMovementModalId(null)}
        />
      )}
      <JobRecordModal
        jobId={jobModalId}
        onClose={() => setJobModalId(null)}
      />
      <ExpenseRecordModal
        expenseId={expenseModalId}
        onClose={() => setExpenseModalId(null)}
      />
      <ReportRowDetailModal
        row={detailRow}
        onClose={() => setDetailRow(null)}
      />
    </>
  );

  return {
    openReportRecord: openReportRecord as (
      row: ReportsTableRow & { id: string },
    ) => void,
    handleRowAction,
    modals,
  };
}
