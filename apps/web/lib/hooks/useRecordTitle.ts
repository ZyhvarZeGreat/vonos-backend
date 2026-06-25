"use client";

import { useQuery } from "@tanstack/react-query";
import { getCustomer, getItem, getJob, getSale } from "@/lib/api";
import { getAppointment } from "@/lib/api/appointments";
import { getStockMovement } from "@/lib/api/stockMovements";
import { getSupplier } from "@/lib/api/suppliers";

export function useRecordTitle(
  section: string,
  recordId: string | null,
  tenantId: string | null,
): string | null {
  const enabled = Boolean(recordId);

  const itemQuery = useQuery({
    queryKey: ["recordTitle", "item", recordId],
    queryFn: () => getItem(recordId!),
    enabled: enabled && section === "inventory",
  });
  const jobQuery = useQuery({
    queryKey: ["recordTitle", "job", recordId],
    queryFn: () => getJob(recordId!),
    enabled: enabled && section === "jobs",
  });
  const saleQuery = useQuery({
    queryKey: ["recordTitle", "sale", tenantId, recordId],
    queryFn: () => getSale(recordId!, tenantId!),
    enabled: enabled && (section === "sales" || section === "orders") && Boolean(tenantId),
  });
  const customerQuery = useQuery({
    queryKey: ["recordTitle", "customer", recordId],
    queryFn: () => getCustomer(recordId!),
    enabled: enabled && section === "customers",
  });
  const supplierQuery = useQuery({
    queryKey: ["recordTitle", "supplier", recordId],
    queryFn: () => getSupplier(recordId!),
    enabled: enabled && section === "suppliers",
  });
  const inboundQuery = useQuery({
    queryKey: ["recordTitle", "inbound", recordId],
    queryFn: () => getStockMovement(recordId!),
    enabled: enabled && section === "inbound",
  });
  const outboundQuery = useQuery({
    queryKey: ["recordTitle", "outbound", recordId],
    queryFn: () => getStockMovement(recordId!),
    enabled: enabled && section === "outbound",
  });
  const appointmentQuery = useQuery({
    queryKey: ["recordTitle", "appointment", recordId],
    queryFn: () => getAppointment(recordId!),
    enabled: enabled && section === "appointments",
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
