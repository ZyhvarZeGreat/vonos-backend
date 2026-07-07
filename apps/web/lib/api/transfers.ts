import { apiFetch } from "@/lib/api/client";
import type { TransferRow, TransferZoneSummary } from "@vonos/types";
import {
  DEFAULT_TABLE_PAGE_SIZE,
  EXPORT_PAGE_SIZE,
  fetchAllPages,
  fetchFirstPage,
  type ListPage,
} from "@/lib/api/fetchAllPages";
import { appendListQuery, fetchJsonListPage } from "@/lib/api/listPageHelpers";

export type { TransferRow, TransferZoneSummary };

const LIST_PATH = "/transfers";

async function fetchTransfersRaw(
  cursor?: string,
  limit?: number,
): Promise<TransferRow[]> {
  const url = appendListQuery(LIST_PATH, { cursor, limit });
  const response = await apiFetch(url);
  if (!response.ok) throw new Error("Failed to fetch transfers");
  return response.json();
}

export async function getTransfersPage(
  cursor: string | undefined,
  limit = DEFAULT_TABLE_PAGE_SIZE,
): Promise<ListPage<TransferRow>> {
  return fetchJsonListPage(LIST_PATH, cursor, limit);
}

/** Full transfer list for export — not for table rendering. */
export async function getAllTransfers(): Promise<TransferRow[]> {
  return fetchAllPages(
    (cursor, limit) => fetchTransfersRaw(cursor, limit),
    EXPORT_PAGE_SIZE,
  );
}

export async function getTransfers(): Promise<TransferRow[]> {
  return fetchFirstPage((cursor, limit) => fetchTransfersRaw(cursor, limit));
}

export async function getTransferZones(): Promise<TransferZoneSummary[]> {
  const response = await apiFetch("/transfers/zones");
  if (!response.ok) throw new Error("Failed to fetch transfer zones");
  return response.json();
}
