"use client";

import type { ReportRowAction } from "@vonos/types";
import { RowActionsMenu } from "@/components/molecules/RowActionsMenu";

export function ReportTableActions({
  actions,
  onAction,
}: {
  actions?: ReportRowAction[];
  onAction: (action: ReportRowAction) => void;
}) {
  if (!actions?.length) return null;

  return (
    <RowActionsMenu
      actions={actions.map((action) => ({
        id: `${action.kind}-${action.label}`,
        label: action.label,
        onClick: () => onAction(action),
      }))}
    />
  );
}
