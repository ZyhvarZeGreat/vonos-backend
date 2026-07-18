"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { MutationProgressBar } from "@/components/molecules/MutationProgressBar";
import { ToastStack } from "@/components/molecules/ToastStack";
import { createQueryClient } from "@/lib/query/createQueryClient";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={client}>
      {children}
      <MutationProgressBar />
      <ToastStack />
    </QueryClientProvider>
  );
}
