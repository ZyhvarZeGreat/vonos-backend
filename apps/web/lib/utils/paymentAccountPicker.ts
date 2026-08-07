/**
 * Chart-of-accounts imports that are not bank/cash tills for payment pickers.
 * Real tills from the Payment Accounts page (Cash Expense, Cash Received,
 * Discount, Moniepoint, Providus, Fidelity, etc.) remain selectable.
 */
const JUNK_PAYMENT_ACCOUNT_NAME_RE =
  /^(assets?|liabilit(y|ies)|equity|income|expense|address\s+to\s+new\s+bill|accounts?\s+payable|accounts?\s+receivable|cash\s+express\s+payment|cash\s+payment\s+received)\b/i;

/** True when this row should appear in sale/purchase/expense payment pickers. */
export function isSelectablePaymentAccount(account: {
  name: string;
  isClosed?: boolean;
  deletedAt?: string | null;
}): boolean {
  if (account.isClosed) return false;
  if (account.deletedAt) return false;
  const name = account.name.trim();
  if (!name) return false;
  return !JUNK_PAYMENT_ACCOUNT_NAME_RE.test(name);
}

export function filterSelectablePaymentAccounts<
  T extends { name: string; isClosed?: boolean; deletedAt?: string | null },
>(accounts: T[]): T[] {
  return accounts.filter(isSelectablePaymentAccount);
}
