"use client";

import { useRouter } from "next/navigation";
import {
  expensePageRoute,
  expensePageTabs,
  type ExpensePageSlug,
} from "@/lib/registries/expenseNav";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";

export function useExpensePageTabs(activeSlug: ExpensePageSlug) {
  const router = useRouter();
  const { tenantCode } = useRouteTenant();

  return {
    tabs: expensePageTabs(activeSlug),
    activeTab: activeSlug,
    onTabChange: (tabId: string) => {
      if (!tenantCode) return;
      router.push(expensePageRoute(tenantCode, tabId as ExpensePageSlug));
    },
  };
}
