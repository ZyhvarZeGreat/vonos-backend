"use client";

import { useQuery } from "@tanstack/react-query";
import { getItemMeta, getJobMeta, getSaleMeta } from "@/lib/api";
import { getAppointment } from "@/lib/api/appointments";
import { getCustomerContact } from "@/lib/api/customers";
import { getStockMovement } from "@/lib/api/stockMovements";
import { getSupplierMeta } from "@/lib/api/suppliers";

export function useRecordTitle(
  section: string,
  recordId: string | null,
  tenantId: string | null,
): string | null {
  const enabled = Boolean(recordId);

  const itemQuery = useQuery({
    queryKey: ["recordTitle", "item-meta", recordId],
    queryFn: () => getItemMeta(recordId!),
    enabled:
      enabled &&
      (section === "inventory" || section === "catalog" || section === "menu-items"),
    staleTime: 60_000,
  });
  const jobQuery = useQuery({
    queryKey: ["recordTitle", "job-meta", recordId],
    queryFn: () => getJobMeta(recordId!),
    enabled: enabled && section === "jobs",
    staleTime: 60_000,
  });
  const saleQuery = useQuery({
    queryKey: ["recordTitle", "sale-meta", tenantId, recordId],
    queryFn: () => getSaleMeta(recordId!, tenantId!),
    enabled: enabled && (section === "sales" || section === "orders") && Boolean(tenantId),
    staleTime: 60_000,
  });
  const customerQuery = useQuery({
    queryKey: ["recordTitle", "customer-contact", recordId],
    queryFn: () => getCustomerContact(recordId!),
    enabled: enabled && section === "customers",
    staleTime: 60_000,
  });
  const supplierQuery = useQuery({
    queryKey: ["recordTitle", "supplier-meta", recordId],
    queryFn: () => getSupplierMeta(recordId!),
    enabled: enabled && section === "suppliers",
    staleTime: 60_000,
  });
  const inboundQuery = useQuery({
    queryKey: ["recordTitle", "inbound", recordId],
    queryFn: () => getStockMovement(recordId!),
    enabled: enabled && section === "inbound",
    staleTime: 60_000,
  });
  const outboundQuery = useQuery({
    queryKey: ["recordTitle", "outbound", recordId],
    queryFn: () => getStockMovement(recordId!),
    enabled: enabled && section === "outbound",
    staleTime: 60_000,
  });
  const appointmentQuery = useQuery({
    queryKey: ["recordTitle", "appointment", recordId],
    queryFn: () => getAppointment(recordId!),
    enabled: enabled && section === "appointments",
    staleTime: 60_000,
  });

  if (!recordId) return null;

  if (section === "inventory" || section === "catalog" || section === "menu-items") {
    return itemQuery.data?.name ?? null;
  }
  if (section === "jobs") return jobQuery.data?.reference ?? null;
  if (section === "sales" || section === "orders") return saleQuery.data?.reference ?? null;
  if (section === "customers") return customerQuery.data?.name ?? null;
  if (section === "suppliers") return supplierQuery.data?.name ?? null;
  if (section === "inbound" || section === "outbound") {
    return inboundQuery.data?.reference ?? outboundQuery.data?.reference ?? null;
  }
  if (section === "appointments") return appointmentQuery.data?.serviceName ?? null;

  return null;
}
