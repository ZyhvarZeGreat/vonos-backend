/** Convert a non-negative amount to English words (for payslip "In words"). */
export function amountToWords(amount: number): string {
  const n = Math.round(Math.abs(amount));
  if (n === 0) return "Zero";

  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function underThousand(value: number): string {
    if (value < 20) return ones[value] ?? "";
    if (value < 100) {
      const t = Math.floor(value / 10);
      const o = value % 10;
      return `${tens[t]}${o ? ` ${ones[o]}` : ""}`.trim();
    }
    const h = Math.floor(value / 100);
    const rest = value % 100;
    return `${ones[h]} Hundred${rest ? ` and ${underThousand(rest)}` : ""}`;
  }

  const parts: string[] = [];
  let remaining = n;
  const scales: Array<{ div: number; label: string }> = [
    { div: 1_000_000_000, label: "Billion" },
    { div: 1_000_000, label: "Million" },
    { div: 1_000, label: "Thousand" },
  ];

  for (const scale of scales) {
    if (remaining >= scale.div) {
      const chunk = Math.floor(remaining / scale.div);
      parts.push(`${underThousand(chunk)} ${scale.label}`);
      remaining %= scale.div;
    }
  }
  if (remaining > 0) parts.push(underThousand(remaining));

  return parts.join(" ");
}
