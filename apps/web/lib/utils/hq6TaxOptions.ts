/** Shared HQ6 tax rate options for product/expense selects (localStorage until tax API). */

export type Hq6TaxOption = { value: string; label: string };

const TAX_RATES_STORAGE_PREFIX = "vonos:hq6-tax-rates:";

export const DEFAULT_HQ6_TAX_OPTIONS: Hq6TaxOption[] = [
  { value: "none", label: "None" },
  { value: "vat", label: "VAT (7.5%)" },
  { value: "wht-vat", label: "WHT/VAT (15.5%)" },
];

export function hq6TaxSelectOptions(tenantId: string | null | undefined): Hq6TaxOption[] {
  if (!tenantId || typeof window === "undefined") {
    return DEFAULT_HQ6_TAX_OPTIONS;
  }
  try {
    const raw = window.localStorage.getItem(
      `${TAX_RATES_STORAGE_PREFIX}${tenantId}`,
    );
    if (!raw) return DEFAULT_HQ6_TAX_OPTIONS;
    const parsed = JSON.parse(raw) as Array<{
      id?: string;
      name?: string;
      rate?: number;
      forTaxGroupOnly?: boolean;
    }>;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_HQ6_TAX_OPTIONS;
    }
    const rates = parsed
      .filter((row) => row.id && row.name && !row.forTaxGroupOnly)
      .map((row) => ({
        value: String(row.id),
        label:
          typeof row.rate === "number"
            ? `${row.name} (${row.rate}%)`
            : String(row.name),
      }));
    return [{ value: "none", label: "None" }, ...rates];
  } catch {
    return DEFAULT_HQ6_TAX_OPTIONS;
  }
}
