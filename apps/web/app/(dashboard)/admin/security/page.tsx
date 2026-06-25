import { SecuritySettingsPanel } from "@/components/pages/SecuritySettingsPanel";

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Security</h2>
        <p className="mt-1 text-sm text-muted">
          Manage authentication settings for your super admin account.
        </p>
      </div>
      <SecuritySettingsPanel />
    </div>
  );
}
