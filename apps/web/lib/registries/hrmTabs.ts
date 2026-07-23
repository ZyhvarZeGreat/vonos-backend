export const HRM_TABS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "leave-type", label: "Leave Type" },
  { id: "leave", label: "Leave" },
  { id: "attendance", label: "Attendance" },
  { id: "pay-components", label: "Allowance & Deduction" },
  { id: "payroll", label: "Payroll" },
  { id: "holiday", label: "Holiday" },
  { id: "departments", label: "Departments" },
  { id: "designations", label: "Designations" },
  { id: "sales-targets", label: "Sales Targets" },
  { id: "hr-people", label: "HR & People" },
  { id: "settings", label: "Settings" },
] as const;

export type HrmTab = (typeof HRM_TABS)[number]["id"];

/** Map legacy sidebar slugs → tab id (bookmarks / entity switcher). */
export const HRM_SLUG_TO_TAB: Record<string, HrmTab> = {
  hrm: "dashboard",
  "hrm-dashboard": "dashboard",
  "leave-type": "leave-type",
  leave: "leave",
  attendance: "attendance",
  "pay-components": "pay-components",
  payroll: "payroll",
  holiday: "holiday",
  departments: "departments",
  designations: "designations",
  "sales-targets": "sales-targets",
  hr: "hr-people",
  "hr-people": "hr-people",
  /** HRM settings tab only — must NOT use bare `settings` (that is Business Settings). */
  "hrm-settings": "settings",
};
