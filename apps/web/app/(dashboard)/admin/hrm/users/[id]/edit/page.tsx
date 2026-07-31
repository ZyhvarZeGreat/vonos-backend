"use client";

import { useParams } from "next/navigation";
import { AdminHrmTenantGate } from "@/components/molecules/AdminHrmTenantGate";
import { Hq6UserDetailView } from "@/components/pages/Hq6UserDetailView";

/** VAG HRM → edit user. */
export default function AdminHrmUserEditPage() {
  const params = useParams<{ id: string }>();
  return (
    <AdminHrmTenantGate>
      <Hq6UserDetailView recordId={params.id} mode="edit" />
    </AdminHrmTenantGate>
  );
}
