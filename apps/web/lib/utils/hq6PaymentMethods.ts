/**
 * Ultimate POS payment method keys → display labels for Vonos HQ / VA.
 *
 * UPOS stores `custom_pay_1`…`custom_pay_7` as method codes; labels come from
 * business common_settings.payments (VA: POS 1, FCMB, GTB, …).
 */
export const HQ6_PAYMENT_METHOD_OPTIONS = [
  { value: "cash", label: "Cash" },
  { value: "card", label: "Card" },
  { value: "cheque", label: "Cheque" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other", label: "Other" },
  { value: "custom_pay_1", label: "POS 1" },
  { value: "custom_pay_2", label: "FCMB (Bank Transfer)" },
  { value: "custom_pay_3", label: "GTB (Bank Transfer)" },
  { value: "custom_pay_4", label: "Zenith (Bank Transfer)" },
  { value: "custom_pay_5", label: "POS 2" },
  { value: "custom_pay_6", label: "Discount" },
  { value: "custom_pay_7", label: "Exchange" },
] as const;

export type Hq6PaymentMethodValue =
  (typeof HQ6_PAYMENT_METHOD_OPTIONS)[number]["value"];

const LABEL_BY_VALUE = Object.fromEntries(
  HQ6_PAYMENT_METHOD_OPTIONS.map((opt) => [opt.value, opt.label]),
) as Record<string, string>;

/** Also accept UPOS alias `transfer` for bank transfer. */
LABEL_BY_VALUE.transfer = "Bank Transfer";
LABEL_BY_VALUE.advance = "Advance";

export function hq6PaymentMethodLabel(method?: string | null): string | null {
  if (!method) return null;
  const key = method.trim().toLowerCase();
  return LABEL_BY_VALUE[key] ?? LABEL_BY_VALUE[method.trim()] ?? null;
}
