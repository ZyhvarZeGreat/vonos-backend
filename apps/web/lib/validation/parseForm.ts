import type { z } from "zod";
import { toast } from "@/stores/toastStore";

/** First issue message from a failed Zod parse. */
export function firstZodIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Please check the form and try again.";
}

/**
 * Parse with Zod. On failure: toast (optional) and return null.
 * On success: return typed data.
 */
export function parseForm<T extends z.ZodTypeAny>(
  schema: T,
  values: unknown,
  options?: { toast?: boolean; setError?: (message: string) => void },
): z.infer<T> | null {
  const result = schema.safeParse(values);
  if (result.success) return result.data;
  const message = firstZodIssue(result.error);
  if (options?.setError) options.setError(message);
  if (options?.toast !== false && !options?.setError) {
    toast.error(message);
  }
  return null;
}
