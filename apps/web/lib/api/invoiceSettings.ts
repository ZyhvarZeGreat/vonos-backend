import type {
  CreateInvoiceSchemeInput,
  CreateReceiptPrinterInput,
  InvoiceScheme,
  InvoiceSettings,
  ReceiptPrinter,
  UpdateInvoiceSchemeInput,
  UpdateInvoiceSettingsInput,
  UpdateReceiptPrinterInput,
} from "@vonos/types";
import { apiFetch } from "@/lib/api/client";

export async function getInvoiceSettings(): Promise<InvoiceSettings> {
  const response = await apiFetch("/invoice-settings");
  if (!response.ok) throw new Error("Failed to fetch invoice settings");
  return response.json();
}

export async function updateInvoiceSettings(
  input: UpdateInvoiceSettingsInput,
): Promise<InvoiceSettings> {
  const response = await apiFetch("/invoice-settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Failed to update invoice settings");
  return response.json();
}

export async function createInvoiceScheme(
  input: CreateInvoiceSchemeInput,
): Promise<InvoiceScheme> {
  const response = await apiFetch("/invoice-settings/schemes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Failed to create invoice scheme");
  return response.json();
}

export async function updateInvoiceScheme(
  id: string,
  input: UpdateInvoiceSchemeInput,
): Promise<InvoiceScheme> {
  const response = await apiFetch(`/invoice-settings/schemes/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Failed to update invoice scheme");
  return response.json();
}

export async function deleteInvoiceScheme(id: string): Promise<void> {
  const response = await apiFetch(`/invoice-settings/schemes/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete invoice scheme");
}

export async function createReceiptPrinter(
  input: CreateReceiptPrinterInput,
): Promise<ReceiptPrinter> {
  const response = await apiFetch("/invoice-settings/printers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Failed to create receipt printer");
  return response.json();
}

export async function updateReceiptPrinter(
  id: string,
  input: UpdateReceiptPrinterInput,
): Promise<ReceiptPrinter> {
  const response = await apiFetch(`/invoice-settings/printers/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error("Failed to update receipt printer");
  return response.json();
}

export async function deleteReceiptPrinter(id: string): Promise<void> {
  const response = await apiFetch(`/invoice-settings/printers/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Failed to delete receipt printer");
}
