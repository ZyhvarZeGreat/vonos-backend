import { toast } from "@/stores/toastStore";
import { startNavigationProgress } from "@/stores/navigationBusyStore";

/**
 * Show a sticky toast with a progress bar and start the top nav indicator
 * so soft redirects don't feel like a dead UI.
 */
export function announceRedirect(message = "Redirecting…"): void {
  startNavigationProgress();
  toast.progress(message, { source: "navigation" });
}
