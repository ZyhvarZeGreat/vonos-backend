"use client";

import { useParams } from "next/navigation";
import { RecordDetailView } from "@/components/pages/RecordDetailView";

/** HQ6 edit routes — `/users/:id/edit`, `/roles/:id/edit`, etc. */
export default function TenantRecordEditPage() {
  const params = useParams<{ tenant: string; listSlug: string; id: string }>();
  return (
    <RecordDetailView listSlug={params.listSlug} recordId={params.id} mode="edit" />
  );
}
