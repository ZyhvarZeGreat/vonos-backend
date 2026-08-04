import { DashboardBodySkeleton } from "@/components/organisms/skeletons";

/** Overview chrome stays in the shell; only KPI/chart body shimmers. */
export default function TenantOverviewLoading() {
  return (
    <div className="hq6-page" aria-busy aria-label="Loading overview">
      <section className="content-header">
        <h1 className="tw-text-xl md:tw-text-3xl tw-font-bold tw-text-black">
          Overview
        </h1>
      </section>
      <section className="content">
        <DashboardBodySkeleton chartCount={2} />
      </section>
    </div>
  );
}
