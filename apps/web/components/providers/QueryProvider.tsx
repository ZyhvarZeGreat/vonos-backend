"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { Suspense, useState } from "react";
import { TopProgressBar } from "@/components/atoms/TopProgressBar";
import { MutationProgressBar } from "@/components/molecules/MutationProgressBar";
import { NavigationProgressBridge } from "@/components/molecules/NavigationProgressBridge";
import { EntitySwitchIndicator } from "@/components/molecules/EntitySwitchIndicator";
import { ToastStack } from "@/components/molecules/ToastStack";
import { createQueryClient } from "@/lib/query/createQueryClient";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={client}>
      {children}
      <Suspense fallback={null}>
        <NavigationProgressBridge />
      </Suspense>
      <TopProgressBar />
      <MutationProgressBar />
      <EntitySwitchIndicator />
      <ToastStack />
    </QueryClientProvider>
  );
}
