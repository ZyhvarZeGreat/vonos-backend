import { notFound } from "next/navigation";
import { OPERATIONS_MOUNTED_TENANTS } from "@/lib/utils/tenantMount";
import { OperationsTenantShell } from "./OperationsTenantShell";

/**
 * Real App Router tree for `/operations/{VC|VS|VKW}/…`.
 * Soft client navigations do not always apply next.config rewrites; without
 * these pages, `app/operations/page.tsx` claims the segment and 404s children.
 * Middleware still rewrites when it can; this tree is the reliable fallback.
 */
export default async function OperationsTenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant } = await params;
  if (!OPERATIONS_MOUNTED_TENANTS.has(tenant)) {
    notFound();
  }
  return <OperationsTenantShell>{children}</OperationsTenantShell>;
}
