/** Archetype → default report dashboard tabs (no page UI imports). */
export const REPORT_TABS: Record<string, { id: string; label: string }[]> = {
  stock: [
    { id: "valuation", label: "Stock Valuation" },
    { id: "movement", label: "Movement Summary" },
    { id: "lowstock", label: "Low Stock" },
  ],
  transaction: [
    { id: "sales", label: "Sales Summary" },
    { id: "closeout", label: "Daily Closeout History" },
  ],
  job: [
    { id: "costing", label: "Job Costing Summary" },
    { id: "turnaround", label: "Turnaround Time" },
  ],
  appointment: [
    { id: "stylist", label: "Revenue per Stylist" },
    { id: "noshow", label: "No-show Rate" },
  ],
};
