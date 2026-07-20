import { DashboardBodySkeleton } from "@/components/organisms/skeletons";

export default function TenantFinanceLoading() {
  return (
    <div className="mx-auto max-w-[var(--space-content-max)]">
      <DashboardBodySkeleton financeChartCount={2} />
    </div>
  );
}
