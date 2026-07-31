import { toast } from "@/stores/toastStore";

export type PrivilegeDenialKind = "view" | "action";

const MESSAGES: Record<PrivilegeDenialKind, string> = {
  view: "You don’t have access privilege to this information.",
  action: "Your privileges aren’t high enough for this action.",
};

/** Simple toast when the user tries something above their role. */
export function notifyInsufficientPrivilege(
  kind: PrivilegeDenialKind = "action",
): void {
  toast.warning(MESSAGES[kind]);
}
