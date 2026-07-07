"use client";

import { useRouter } from "next/navigation";
import {
  paymentAccountPageRoute,
  paymentAccountPageTabs,
  type PaymentAccountPageSlug,
} from "@/lib/registries/paymentAccountNav";
import { useRouteTenant } from "@/lib/hooks/useRouteTenant";

export function usePaymentAccountPageTabs(activeSlug: PaymentAccountPageSlug) {
  const router = useRouter();
  const { tenantCode } = useRouteTenant();

  return {
    tabs: paymentAccountPageTabs(),
    activeTab: activeSlug,
    onTabChange: (tabId: string) => {
      if (!tenantCode) return;
      router.push(
        paymentAccountPageRoute(tenantCode, tabId as PaymentAccountPageSlug),
      );
    },
  };
}
