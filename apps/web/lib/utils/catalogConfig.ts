import type { BusinessLocation } from "@vonos/types";

export function linesToList(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function listToLines(items: string[] | undefined): string {
  return (items ?? []).join("\n");
}

/** One branch per line: `CODE | Display name` */
export function parseBusinessLocations(text: string): BusinessLocation[] {
  return linesToList(text)
    .map((line) => {
      const pipe = line.indexOf("|");
      if (pipe === -1) {
        const trimmed = line.trim();
        return { code: trimmed, name: trimmed };
      }
      return {
        code: line.slice(0, pipe).trim(),
        name: line.slice(pipe + 1).trim(),
      };
    })
    .filter((row) => row.code.length > 0 && row.name.length > 0);
}

export function formatBusinessLocations(
  locations: BusinessLocation[] | undefined,
): string {
  return (locations ?? []).map((row) => `${row.code} | ${row.name}`).join("\n");
}
