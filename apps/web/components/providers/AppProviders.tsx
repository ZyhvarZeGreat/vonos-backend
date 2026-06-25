"use client";

import { AuthGuard } from "@/components/guards/AuthGuard";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
