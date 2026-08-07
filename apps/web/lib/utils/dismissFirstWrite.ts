import { withWriteProgress } from "@/stores/mutationBusyStore";
import { toast } from "@/stores/toastStore";
import { formatApiError } from "@/lib/utils/formatApiError";

/**
 * Perceived-speed write: close the UI immediately, finish the API in the
 * background (with a couple retries via withWriteProgress). Toast on settle.
 * Use for pay/confirm/simple modal saves where waiting on Neon RTT feels broken.
 */
export async function dismissFirstWrite<T>(options: {
  dismiss: () => void;
  write: () => Promise<T>;
  label?: string;
  successMessage?: string | ((result: T) => string);
  errorMessage?: string;
  onSuccess?: (result: T) => void;
}): Promise<void> {
  options.dismiss();
  try {
    const result = await withWriteProgress(
      options.write,
      options.label ?? "Saving",
    );
    const message =
      typeof options.successMessage === "function"
        ? options.successMessage(result)
        : options.successMessage;
    if (message) toast.success(message);
    options.onSuccess?.(result);
  } catch (err) {
    toast.error(
      options.errorMessage ??
        (err instanceof Error ? err.message : formatApiError(err)),
    );
  }
}
