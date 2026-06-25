import {
  AlertCircle,
  ArrowRightLeft,
  ClipboardList,
  PackageCheck,
  Truck,
} from "lucide-react";
import type { IconComponent } from "@/lib/utils/icons";

/** Static samples for /dev/design-system only — not used in production routes. */

export const sampleActivity: {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  icon: IconComponent;
}[] = [
  {
    id: "act_001",
    title: "Received PO#2041 — 120 units",
    description: "Sari W · PT Maju Jaya",
    timestamp: "10:12am",
    icon: PackageCheck,
  },
  {
    id: "act_002",
    title: "Shipped ORD#8821 — 24 units",
    description: "Doni R · JNE Express",
    timestamp: "10:12am",
    icon: Truck,
  },
  {
    id: "act_003",
    title: "Stock adjusted — SKU-0492",
    description: "Budi W · Count Correction",
    timestamp: "10:12am",
    icon: ClipboardList,
  },
  {
    id: "act_004",
    title: "Low stock alert — SKU-1120",
    description: "System · 3 units remaining",
    timestamp: "10:12am",
    icon: AlertCircle,
  },
  {
    id: "act_005",
    title: "Transfer approved — Zone A→B",
    description: "Budi W · 60 units, 3 SKU",
    timestamp: "10:12am",
    icon: ArrowRightLeft,
  },
];

export const sampleChartData = [
  { label: "May1", inbound: 280, outbound: 320 },
  { label: "May2", inbound: 200, outbound: 260 },
  { label: "May3", inbound: 350, outbound: 300 },
  { label: "May4", inbound: 220, outbound: 180 },
  { label: "May5", inbound: 300, outbound: 340 },
  { label: "May6", inbound: 180, outbound: 220 },
  { label: "May7", inbound: 400, outbound: 380 },
];

export const samplePendingOrders: {
  id: string;
  ref: string;
  name: string;
  date: string;
  carrier: string;
  status: string;
}[] = [];

export const sampleKpiDeltas = {
  totalSku: { delta: 12, deltaLabel: "this week" },
  todayInbound: { delta: 8, deltaLabel: "vs yesterday" },
  todayOutbound: { delta: -5, deltaLabel: "this week" },
  stockValue: { deltaPercent: "+3.2%", deltaLabel: "this week" },
};
