export function parseExpenseNotes(note: string | null | undefined): {
  expenseNote: string;
  paymentNote: string;
  repetitions: string;
  applicableTax: string;
} {
  const raw = note?.trim() ?? "";
  if (!raw) {
    return {
      expenseNote: "",
      paymentNote: "",
      repetitions: "",
      applicableTax: "none",
    };
  }
  const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
  let paymentNote = "";
  let repetitions = "";
  let applicableTax = "none";
  const expenseLines: string[] = [];
  for (const line of lines) {
    const pay = line.match(/^Payment note:\s*(.*)$/i);
    if (pay) {
      paymentNote = pay[1]!.trim();
      continue;
    }
    const reps = line.match(/^Repetitions:\s*(.*)$/i);
    if (reps) {
      repetitions = reps[1]!.trim();
      continue;
    }
    const tax = line.match(/^Applicable tax:\s*(.*)$/i);
    if (tax) {
      applicableTax = tax[1]!.trim() || "none";
      continue;
    }
    expenseLines.push(line);
  }
  return {
    expenseNote: expenseLines.join("\n").trim(),
    paymentNote,
    repetitions,
    applicableTax,
  };
}

export function buildExpenseNoteBlob(
  expenseNote: string,
  paymentNote: string,
  extras?: { repetitions?: string; applicableTax?: string },
): string | undefined {
  const parts: string[] = [];
  if (expenseNote.trim()) parts.push(expenseNote.trim());
  if (extras?.applicableTax && extras.applicableTax !== "none") {
    parts.push(`Applicable tax: ${extras.applicableTax}`);
  }
  if (extras?.repetitions?.trim()) {
    parts.push(`Repetitions: ${extras.repetitions.trim()}`);
  }
  if (paymentNote.trim()) parts.push(`Payment note: ${paymentNote.trim()}`);
  return parts.length ? parts.join("\n") : undefined;
}
