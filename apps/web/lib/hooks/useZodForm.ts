"use client";

import {
  useForm,
  type DefaultValues,
  type FieldValues,
  type UseFormProps,
  type UseFormReturn,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";

/**
 * react-hook-form + Zod helper for Vonos forms.
 * Pass a Zod schema; get typed RHF methods with resolver wired.
 */
export function useZodForm<TSchema extends z.ZodType<FieldValues>>(
  schema: TSchema,
  options?: Omit<UseFormProps<z.infer<TSchema>>, "resolver"> & {
    defaultValues?: DefaultValues<z.infer<TSchema>>;
  },
): UseFormReturn<z.infer<TSchema>> {
  return useForm<z.infer<TSchema>>({
    ...options,
    resolver: zodResolver(schema),
    mode: options?.mode ?? "onBlur",
  });
}

/** Map first Zod/RHF error to a toast-friendly string. */
export function firstFormError(
  errors: Record<string, { message?: string } | undefined>,
): string | null {
  for (const value of Object.values(errors)) {
    if (value?.message) return value.message;
  }
  return null;
}
