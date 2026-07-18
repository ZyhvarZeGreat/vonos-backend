"use client";

import type { ReactNode } from "react";
import { Button, type ButtonProps } from "@/components/atoms/Button";

export interface AsyncButtonProps extends Omit<ButtonProps, "isLoading" | "loadingText"> {
  isPending: boolean;
  pendingLabel?: ReactNode;
}

/**
 * Primary action button for CRUD — spinner + disable while the mutation runs.
 */
export function AsyncButton({
  isPending,
  pendingLabel = "Saving…",
  children,
  disabled,
  ...props
}: AsyncButtonProps) {
  return (
    <Button
      {...props}
      disabled={disabled || isPending}
      isLoading={isPending}
      loadingText={pendingLabel}
    >
      {children}
    </Button>
  );
}
