"use client";

import { Hq6PageFrame } from "@/components/hq6/Hq6Chrome";
import { StockAvailabilityView } from "@/lib/registries/lazyEntityViews";

export default function AdminStockPage() {
  return (
    <Hq6PageFrame
      title="Stock"
      subtitle="Cross-entity availability across the Autos Group"
    >
      <StockAvailabilityView />
    </Hq6PageFrame>
  );
}
