"use client";

import { useParams } from "next/navigation";
import { AdminHrmTenantGate } from "@/components/molecules/AdminHrmTenantGate";
import { Hq6RoleDetailView } from "@/components/pages/Hq6RoleDetailView";

/** VAG HRM → edit role. */
export default function AdminHrmRoleEditPage() {
  const params = useParams<{ id: string }>();
  return (
    <AdminHrmTenantGate>
      <Hq6RoleDetailView recordId={params.id} mode="edit" />
    </AdminHrmTenantGate>
  );
}
