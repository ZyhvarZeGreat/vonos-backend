"use client";

import { useParams } from "next/navigation";
import { Hq6BarcodeSettingFormView } from "@/components/pages/Hq6BarcodeSettingsViews";

export default function BarcodeSettingsEditPage() {
  const params = useParams<{ id: string }>();
  return <Hq6BarcodeSettingFormView mode="edit" settingId={params.id} />;
}
