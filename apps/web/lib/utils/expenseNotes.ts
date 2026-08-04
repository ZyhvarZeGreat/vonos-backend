export function parseExpenseNotes(note: string | null | undefined): {
  expenseNote: string;
  paymentNote: string;
} {
  const raw = note?.trim() ?? "";
  if (!raw) return { expenseNote: "", paymentNote: "" };
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  let paymentNote = "";
  const expenseLines: string[] = [];
  for (const line of lines) {
    const pay = line.match(/^Payment note:\s*(.*)$/i);
    if (pay) {
      paymentNote = pay[1]!.trim();
      continue;
    }
    expenseLines.push(line);
  }
  return {
    expenseNote: expenseLines.join("\n").trim(),
    paymentNote,
  };
}

export function buildExpenseNoteBlob(
  expenseNote: string,
  paymentNote: string,
): string | undefined {
  const parts: string[] = [];
  if (expenseNote.trim()) parts.push(expenseNote.trim());
  if (paymentNote.trim()) parts.push(`Payment note: ${paymentNote.trim()}`);
  return parts.length ? parts.join("\n") : undefined;
}
