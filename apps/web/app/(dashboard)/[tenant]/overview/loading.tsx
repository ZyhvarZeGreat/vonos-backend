/** Overview route — keep text chrome; TopProgressBar handles indication. */
export default function TenantOverviewLoading() {
  return (
    <div
      className="mx-auto space-y-6 p-4 sm:p-6"
      aria-busy
      aria-label="Loading overview"
    >
      <h1 className="text-xl font-semibold text-foreground">Overview</h1>
      <p className="text-sm text-muted">Dashboard metrics load in a moment.</p>
      <div className="min-h-[40vh]" />
    </div>
  );
}
