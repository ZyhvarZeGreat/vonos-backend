/**
 * Parse NestJS / Express-style error JSON into a single user-facing message.
 */

type ApiErrorBody = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

function flattenMessage(message: string | string[] | undefined): string | null {
  if (!message) return null;
  if (Array.isArray(message)) {
    const parts = message.map((m) => String(m).trim()).filter(Boolean);
    return parts.length ? parts.join(" ") : null;
  }
  const text = message.trim();
  return text || null;
}

/** Map common Nest / Prisma status codes to clearer copy when body is empty. */
function fallbackForStatus(status: number, fallback: string): string {
  switch (status) {
    case 400:
      return "Please check the form and try again.";
    case 401:
      return "Your session expired. Sign in again.";
    case 403:
      return "You don’t have permission to do that.";
    case 404:
      return "That record was not found.";
    case 409:
      return "That conflicts with an existing record.";
    case 422:
      return "Some fields are invalid. Please correct them and try again.";
    case 429:
      return "Too many requests. Wait a moment and try again.";
    case 500:
    case 502:
    case 503:
      return "We can’t reach the server right now — please try again in a moment.";
    default:
      return fallback;
  }
}

function sanitizeClientMessage(message: string, fallback: string): string {
  const trimmed = message.trim();
  if (!trimmed) return fallback;
  const lower = trimmed.toLowerCase();
  if (
    lower === "internal server error" ||
    lower === "internalservererror" ||
    lower === "error"
  ) {
    return fallback || "Something went wrong — please try again.";
  }
  if (
    lower.includes("can't reach database") ||
    lower.includes("cannot reach database") ||
    lower.includes("database server is running") ||
    lower.includes("invalid `prisma") ||
    lower.includes("invalid `this.prisma") ||
    lower.includes("invocation in") ||
    lower.includes("timed out fetching a new connection") ||
    lower.includes("connection refused") ||
    lower.includes("econnrefused") ||
    /neon\.tech/.test(lower) ||
    /ep-[a-z0-9-]+\./.test(lower)
  ) {
    return "We can’t reach the database right now — please try again in a moment.";
  }
  return trimmed;
}

/**
 * Read a failed fetch Response and throw Error with the best available message.
 * Always rejects — return type is `never`.
 */
export async function throwApiError(
  response: Response,
  fallback: string,
): Promise<never> {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
  const fromBody =
    flattenMessage(body?.message) ??
    (typeof body?.error === "string" ? body.error.trim() : null);
  const raw = fromBody || fallbackForStatus(response.status, fallback);
  throw new Error(sanitizeClientMessage(raw, fallback));
}

/** Same parsing without throwing — for custom handling. */
export async function readApiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
  const fromBody =
    flattenMessage(body?.message) ??
    (typeof body?.error === "string" ? body.error.trim() : null);
  const raw = fromBody || fallbackForStatus(response.status, fallback);
  return sanitizeClientMessage(raw, fallback);
}
