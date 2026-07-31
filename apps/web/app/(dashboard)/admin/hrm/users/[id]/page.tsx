"use client";

import { useParams } from "next/navigation";
import { AdminHrmTenantGate } from "@/components/molecules/AdminHrmTenantGate";
import { Hq6UserDetailView } from "@/components/pages/Hq6UserDetailView";

/** VAG HRM → view user. */
export default function AdminHrmUserViewPage() {
  const params = useParams<{ id: string }>();
  return (
    <AdminHrmTenantGate>
      <Hq6UserDetailView recordId={params.id} mode="view" />
    </AdminHrmTenantGate>
  );
}
