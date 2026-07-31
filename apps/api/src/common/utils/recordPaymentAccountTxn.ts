import type { Prisma } from '@prisma/client';

type DbClient = Prisma.TransactionClient | Prisma.DefaultPrismaClient;

export type PaymentAccountTxnInput = {
  tenantId: string;
  accountId: string;
  type: 'credit' | 'debit';
  subType: string;
  amount: number;
  operationDate: Date;
  refNo?: string | null;
  note?: string | null;
  paymentMethod?: string | null;
  saleId?: string | null;
  paymentId?: string | null;
  invoiceId?: string | null;
  createdByName?: string | null;
};

/**
 * Records a payment-account book entry. No-op when accountId is missing or
 * amount is not positive. Used so sale/purchase payments update balances the
 * same way as deposits / fund transfers.
 */
export async function recordPaymentAccountTxn(
  db: DbClient,
  input: PaymentAccountTxnInput,
): Promise<void> {
  const amount = Number(input.amount);
  if (!input.accountId || !Number.isFinite(amount) || amount <= 0) {
    return;
  }

  const account = await db.paymentAccount.findFirst({
    where: {
      id: input.accountId,
      tenantId: input.tenantId,
      deletedAt: null,
    },
    select: { id: true, isClosed: true },
  });
  if (!account || account.isClosed) {
    return;
  }

  await db.accountTransaction.create({
    data: {
      tenantId: input.tenantId,
      accountId: account.id,
      type: input.type,
      subType: input.subType,
      amount,
      refNo: input.refNo?.trim() || null,
      operationDate: input.operationDate,
      note: input.note?.trim() || null,
      paymentMethod: input.paymentMethod?.trim() || null,
      saleId: input.saleId ?? null,
      paymentId: input.paymentId ?? null,
      invoiceId: input.invoiceId ?? null,
      createdByName: input.createdByName ?? null,
    },
  });
}
