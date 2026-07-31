import { Spinner } from "@/components/atoms/Spinner";

/** Finance route loading — shell stays; show loader while the segment resolves. */
export default function TenantFinanceLoading() {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8"
      aria-busy
      aria-label="Loading finance"
    >
      <Spinner size="lg" />
      <p className="text-sm text-muted">Loading…</p>
    </div>
  );
}