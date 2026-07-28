/** Tabler icons lifted from Ultimate POS home/index.blade.php (HQ6 live capture). */

import type { ReactElement } from "react";

const svgProps = {
  "aria-hidden": true as const,
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function Hq6IconShoppingCart({ className }: { className?: string }) {
  return (
    <svg className={className} {...svgProps} strokeWidth={2}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M6 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M17 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" />
      <path d="M17 17h-11v-14h-2" />
      <path d="M6 5l14 1l-1 7h-13" />
    </svg>
  );
}

export function Hq6IconReceipt({ className }: { className?: string }) {
  return (
    <svg className={className} {...svgProps} strokeWidth={2}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16l-3 -2l-2 2l-2 -2l-2 2l-2 -2l-3 2" />
      <path d="M14.8 8a2 2 0 0 0 -1.8 -1h-2a2 2 0 1 0 0 4h2a2 2 0 1 1 0 4h-2a2 2 0 0 1 -1.8 -1" />
      <path d="M12 6v10" />
    </svg>
  );
}

export function Hq6IconFileInvoice({ className }: { className?: string }) {
  return (
    <svg className={className} {...svgProps} strokeWidth={2}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M14 3v4a1 1 0 0 0 1 1h4" />
      <path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z" />
      <path d="M9 7l1 0" />
      <path d="M9 13l6 0" />
      <path d="M13 17l2 0" />
    </svg>
  );
}

export function Hq6IconArrowsExchange({ className }: { className?: string }) {
  return (
    <svg className={className} {...svgProps} strokeWidth={2}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M21 7l-18 0" />
      <path d="M18 10l3 -3l-3 -3" />
      <path d="M6 20l-3 -3l3 -3" />
      <path d="M3 17l18 0" />
    </svg>
  );
}

export function Hq6IconDownload({ className }: { className?: string }) {
  return (
    <svg className={className} {...svgProps} strokeWidth={2}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 3v12" />
      <path d="M16 11l-4 4l-4 -4" />
      <path d="M3 12a9 9 0 0 0 18 0" />
    </svg>
  );
}

export function Hq6IconAlertTriangle({ className }: { className?: string }) {
  return (
    <svg className={className} {...svgProps} strokeWidth={2}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M12 9v4" />
      <path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z" />
      <path d="M12 16h.01" />
    </svg>
  );
}

export function Hq6IconReceiptRefund({ className }: { className?: string }) {
  return (
    <svg className={className} {...svgProps} strokeWidth={2}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16l-3 -2l-2 2l-2 -2l-2 2l-2 -2l-3 2" />
      <path d="M15 14v-2a2 2 0 0 0 -2 -2h-4l2 -2m0 4l-2 -2" />
    </svg>
  );
}

export function Hq6IconAlertCircle({ className }: { className?: string }) {
  return (
    <svg className={className} {...svgProps} strokeWidth={2}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

export function Hq6IconCalendar({ className }: { className?: string }) {
  return (
    <svg className={className} {...svgProps} strokeWidth={1.5}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z" />
      <path d="M16 3v4" />
      <path d="M8 3v4" />
      <path d="M4 11h16" />
      <path d="M7 14h.013" />
      <path d="M10.01 14h.005" />
      <path d="M13.01 14h.005" />
      <path d="M16.015 14h.005" />
      <path d="M13.015 17h.005" />
      <path d="M7.01 17h.005" />
      <path d="M10.01 17h.005" />
    </svg>
  );
}

export function Hq6IconChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} {...svgProps} strokeWidth={2}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M6 9l6 6l6 -6" />
    </svg>
  );
}

export function Hq6IconBuilding({ className }: { className?: string }) {
  return (
    <svg className={className} {...svgProps} strokeWidth={2}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M3 21l18 0" />
      <path d="M9 8l1 0" />
      <path d="M9 12l1 0" />
      <path d="M9 16l1 0" />
      <path d="M14 8l1 0" />
      <path d="M14 12l1 0" />
      <path d="M14 16l1 0" />
      <path d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16" />
    </svg>
  );
}

export function Hq6IconTool({ className }: { className?: string }) {
  return (
    <svg className={className} {...svgProps} strokeWidth={2}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <path d="M7 10h3v-3l-3.5 -3.5a6 6 0 0 1 8 8l6 6a2 2 0 0 1 -3 3l-6 -6a6 6 0 0 1 -8 -8l3.5 3.5" />
    </svg>
  );
}

const KPI_ICONS: Record<
  string,
  (props: { className?: string }) => ReactElement
> = {
  totalSale: Hq6IconShoppingCart,
  net: Hq6IconReceipt,
  invoiceDue: Hq6IconFileInvoice,
  sellReturn: Hq6IconArrowsExchange,
  purchase: Hq6IconDownload,
  purchaseDue: Hq6IconAlertTriangle,
  purchaseReturn: Hq6IconReceiptRefund,
  expense: Hq6IconReceipt,
  // VAG group overview
  revenue: Hq6IconReceipt,
  jobs: Hq6IconTool,
  entities: Hq6IconBuilding,
  outstanding: Hq6IconFileInvoice,
};

const KPI_ICON_WRAP: Record<string, string> = {
  totalSale: "tw-bg-sky-100 tw-text-sky-500",
  net: "tw-text-green-500 tw-bg-green-100",
  invoiceDue: "tw-text-yellow-500 tw-bg-yellow-100",
  sellReturn: "tw-text-red-500 tw-bg-red-100",
  purchase: "bg-sky-100 tw-text-sky-500",
  purchaseDue: "tw-text-yellow-500 tw-bg-yellow-100",
  purchaseReturn: "tw-text-red-500 tw-bg-red-100",
  expense: "tw-text-red-500 tw-bg-red-100",
  revenue: "tw-text-green-500 tw-bg-green-100",
  jobs: "tw-bg-sky-100 tw-text-sky-500",
  entities: "tw-bg-sky-100 tw-text-sky-500",
  outstanding: "tw-text-yellow-500 tw-bg-yellow-100",
};

export function hq6KpiIcon(metricKey: string) {
  return KPI_ICONS[metricKey] ?? Hq6IconShoppingCart;
}

export function hq6KpiIconWrapClass(metricKey: string) {
  return (
    KPI_ICON_WRAP[metricKey] ?? "tw-bg-sky-100 tw-text-sky-500"
  );
}
