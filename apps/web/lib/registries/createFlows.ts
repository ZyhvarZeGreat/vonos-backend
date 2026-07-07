export type CreateFlowKey =
  | "item"
  | "menu-item"
  | "variant"
  | "inbound"
  | "outbound"
  | "transfer"
  | "job"
  | "sale"
  | "supplier"
  | "customer"
  | "appointment";

export interface CreateFlowCopy {
  title: string;
  subtitle: string;
  submitLabel: string;
}

export const DEFAULT_CREATE_COPY: CreateFlowCopy = {
  title: "Create record",
  subtitle: "Fill in the details below",
  submitLabel: "Create",
};

export function movementTypeForFlow(
  flow: CreateFlowKey,
): "inbound" | "outbound" | "transfer" | null {
  if (flow === "inbound") return "inbound";
  if (flow === "outbound") return "outbound";
  if (flow === "transfer") return "transfer";
  return null;
}

export function isItemFlow(flow: CreateFlowKey): boolean {
  return flow === "item" || flow === "menu-item" || flow === "variant";
}
