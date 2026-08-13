"use client";

import TenantLayout from "@/app/(dashboard)/[tenant]/layout";

/** Client shell — reuses the shared tenant dashboard layout. */
export function OperationsTenantShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TenantLayout>{children}</TenantLayout>;
}
