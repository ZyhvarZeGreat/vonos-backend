import { Spinner } from "@/components/atoms/Spinner";

/** Admin segment loader. */
export default function AdminLoading() {
  return (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-3 p-8"
      aria-busy
      aria-label="Loading"
    >
      <Spinner size="lg" />
      <p className="text-sm text-muted">Loading…</p>
    </div>
  );
}