export const displayModes = ["table", "kanban", "calendar"] as const;
export type DisplayMode = (typeof displayModes)[number];

export function assertDisplayModeImplemented(mode: DisplayMode): void {
  if (mode !== "table") {
    throw new Error(`${mode} display mode is not implemented yet`);
  }
}
