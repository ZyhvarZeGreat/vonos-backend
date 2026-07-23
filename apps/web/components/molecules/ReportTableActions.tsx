"use client";

import type { ReportRowAction } from "@vonos/types";
import { RowActionsMenu } from "@/components/molecules/RowActionsMenu";
import { hq6ActionIcon } from "@/lib/utils/hq6ActionIcon";

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
      actions={actions.map((action, index) => ({
        id: `${action.kind}-${index}`,
        label: action.label,
        icon: hq6ActionIcon(action.kind),
        onClick: () => onAction(action),
      }))}
    />
  );
}
