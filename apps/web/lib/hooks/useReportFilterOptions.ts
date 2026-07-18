"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCatalogMeta } from "@/lib/api/catalogMeta";
import { getCustomers } from "@/lib/api/customers";
import { getCustomerGroups } from "@/lib/api/customerGroups";
import { getSuppliers } from "@/lib/api/suppliers";
import type { ReportFilterOptionSets } from "@/components/organisms/ReportFilterShell";
import type { ReportFilterField } from "@/lib/registries/reportTableUi";
import { locationFilterOptions } from "@/lib/utils/locationLabels";
import { useTenantStore } from "@/stores/tenantStore";
import { PAYMENT_METHODS } from "@vonos/types";
import type { Brand, ProductCategory } from "@vonos/types";

const EMPTY: ReportFilterOptionSets = {
  customers: [],
  customerGroups: [],
  locations: [],
  categories: [],
  brands: [],
  paymentMethods: PAYMENT_METHODS.map((method) => ({
    value: method,
    label: method.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
  })),
  suppliers: [],
};

function optionSourcesFromFields(
  fields: ReportFilterField[] | undefined,
): Set<string> {
  const sources = new Set<string>();
  for (const field of fields ?? []) {
    if (field.kind === "select") sources.add(field.optionsSource);
  }
  return sources;
}

export function useReportFilterOptions(
  tenantId: string | null | undefined,
  fields: ReportFilterField[] | undefined,
): ReportFilterOptionSets {
  const tenantConfig = useTenantStore((s) => s.tenantConfig);
  const sources = useMemo(() => optionSourcesFromFields(fields), [fields]);
  const enabled = Boolean(tenantId && fields && fields.length > 0);

  const customersQuery = useQuery({
    queryKey: ["report-filter-customers", tenantId],
    queryFn: () => getCustomers(tenantId!),
    enabled: enabled && sources.has("customers"),
    staleTime: 10 * 60_000,
  });

  const groupsQuery = useQuery({
    queryKey: ["report-filter-customer-groups", tenantId],
    queryFn: () => getCustomerGroups(tenantId!),
    enabled: enabled && sources.has("customerGroups"),
    staleTime: 10 * 60_000,
  });

  const categoriesQuery = useQuery({
    queryKey: ["report-filter-categories", tenantId],
    queryFn: () =>
      getCatalogMeta(tenantId!, "categories") as Promise<ProductCategory[]>,
    enabled: enabled && sources.has("categories"),
    staleTime: 10 * 60_000,
  });

  const brandsQuery = useQuery({
    queryKey: ["report-filter-brands", tenantId],
    queryFn: () => getCatalogMeta(tenantId!, "brands") as Promise<Brand[]>,
    enabled: enabled && sources.has("brands"),
    staleTime: 10 * 60_000,
  });

  const suppliersQuery = useQuery({
    queryKey: ["report-filter-suppliers", tenantId],
    queryFn: () => getSuppliers(tenantId!),
    enabled: enabled && sources.has("suppliers"),
    staleTime: 10 * 60_000,
  });

  return useMemo(() => {
    if (!enabled) return EMPTY;
    return {
      customers: (customersQuery.data ?? []).map((c) => ({
        value: c.id,
        label: c.name,
      })),
      customerGroups: (groupsQuery.data ?? []).map((g) => ({
        value: g.id,
        label: g.name,
      })),
      locations: locationFilterOptions(tenantConfig),
      categories: (categoriesQuery.data ?? []).map((c) => ({
        value: c.name,
        label: c.name,
      })),
      brands: (brandsQuery.data ?? []).map((b) => ({
        value: b.id,
        label: b.name,
      })),
      paymentMethods: EMPTY.paymentMethods,
      suppliers: (suppliersQuery.data ?? []).map((s) => ({
        value: s.id,
        label: s.name,
      })),
    };
  }, [
    enabled,
    customersQuery.data,
    groupsQuery.data,
    categoriesQuery.data,
    brandsQuery.data,
    suppliersQuery.data,
    tenantConfig,
  ]);
}
