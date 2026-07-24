"use client";

import { Hq6PageFrame } from "@/components/hq6/Hq6Chrome";
import { SecuritySettingsPanel } from "@/components/pages/SecuritySettingsPanel";

export default function SecurityPage() {
  return (
    <Hq6PageFrame
      title="Security"
      subtitle="Authentication settings for your super admin account"
    >
      <div className="hq6-card p-4 md:p-6">
        <SecuritySettingsPanel />
      </div>
    </Hq6PageFrame>
  );
}
