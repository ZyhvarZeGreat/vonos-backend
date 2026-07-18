import type { TenantScopedPrisma } from '../prisma/prisma.service';
import { parseMovementLines, toNumber } from './serializers';

const ACTIVE_WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

function movementLineTotal(lines: ReturnType<typeof parseMovementLines>): number {
  return lines.reduce(
    (sum, line) =>
      sum + line.quantity * toNumber((line as { unitCost?: number }).unitCost ?? 0),
    0,
  );
}

/** Recompute denormalized supplier purchase rollups from stock movements. */
export async function refreshSupplierPurchaseRollups(
  db: TenantScopedPrisma,
  supplierId: string,
): Promise<void> {
  const movements = await db.stockMovement.findMany({
    where: { supplierId, deletedAt: null },
    select: {
      lines: true,
      status: true,
      type: true,
      source: true,
      paymentStatus: true,
      date: true,
    },
  });

  let totalPurchase = 0;
  let totalPurchaseDue = 0;
  let totalPurchasePaid = 0;
  let totalPurchaseReturn = 0;
  let lastPurchaseAt: Date | null = null;

  for (const movement of movements) {
    const amount = movementLineTotal(parseMovementLines(movement.lines));
    if (movement.source === 'purchase_return') {
      totalPurchaseReturn += amount;
      continue;
    }
    if (movement.type !== 'inbound') continue;

    totalPurchase += amount;
    const received =
      movement.status === 'Received' || movement.status === 'Delivered';
    if (
      movement.paymentStatus === 'due' ||
      movement.paymentStatus === 'partial'
    ) {
      totalPurchaseDue += amount;
    } else if (movement.paymentStatus === 'paid' || received) {
      totalPurchasePaid += amount;
    } else {
      totalPurchaseDue += amount;
    }

    if (received && (!lastPurchaseAt || movement.date > lastPurchaseAt)) {
      lastPurchaseAt = movement.date;
    }
  }

  await db.supplier.update({
    where: { id: supplierId },
    data: {
      totalPurchase,
      totalPurchaseDue,
      totalPurchasePaid,
      totalPurchaseReturn,
      totalAdvance: Math.max(0, totalPurchasePaid - totalPurchase),
      lastPurchaseAt,
    },
  });
}

export function supplierActivityStatus(
  lastPurchaseAt: Date | null | undefined,
  now = Date.now(),
): 'active' | 'inactive' {
  if (!lastPurchaseAt) return 'inactive';
  return now - lastPurchaseAt.getTime() <= ACTIVE_WINDOW_MS
    ? 'active'
    : 'inactive';
}
