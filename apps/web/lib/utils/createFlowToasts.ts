import type { CreateFlowKey } from "@/lib/registries/createFlows";

const SUCCESS_MESSAGES: Record<CreateFlowKey, string> = {
  item: "Item created",
  "menu-item": "Menu item created",
  variant: "Variant created",
  inbound: "Inbound movement created",
  outbound: "Outbound movement created",
  transfer: "Transfer created",
  job: "Job created",
  sale: "Sale recorded",
  supplier: "Supplier added",
  customer: "Customer added",
  appointment: "Appointment booked",
};

export function createFlowSuccessMessage(flow: CreateFlowKey): string {
  return SUCCESS_MESSAGES[flow] ?? "Record created";
}
