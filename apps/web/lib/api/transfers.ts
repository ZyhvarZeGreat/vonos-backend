import { apiFetch } from "@/lib/api/client";
import type { TransferRow, TransferZoneSummary } from "@vonos/types";

export type { TransferRow, TransferZoneSummary };

export async function getTransfers(): Promise<TransferRow[]> {
  const response = await apiFetch("/transfers");
  if (!response.ok) throw new Error("Failed to fetch transfers");
  return response.json();
}

export async function getTransferZones(): Promise<TransferZoneSummary[]> {
  const response = await apiFetch("/transfers/zones");
  if (!response.ok) throw new Error("Failed to fetch transfer zones");
  return response.json();
}
