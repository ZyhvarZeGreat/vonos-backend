export function formatApiError(error: unknown, fallback = "Something went wrong"): string {
  let message = "";
  if (error instanceof Error && error.message.trim()) {
    message = error.message.trim();
  } else if (typeof error === "string" && error.trim()) {
    message = error.trim();
  }
  if (!message) return fallback;
  const lower = message.toLowerCase();
  if (
    lower === "internal server error" ||
    lower === "internalservererror"
  ) {
    return fallback === "Something went wrong"
      ? "Something went wrong — please try again."
      : fallback;
  }
  return message;
}
