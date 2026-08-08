import {
  movementLineRollups,
  shouldApplyInboundQty,
  shouldApplyOutboundQty,
} from './stockQuantity';

describe('stockQuantity', () => {
  it('applies inbound qty only when moving into Received', () => {
    expect(shouldApplyInboundQty('Ordered', 'Received')).toBe(true);
    expect(shouldApplyInboundQty('Pending', 'Received')).toBe(true);
    expect(shouldApplyInboundQty('Received', 'Received')).toBe(false);
    expect(shouldApplyInboundQty('Ordered', 'Ordered')).toBe(false);
  });

  it('applies outbound qty only on first ship/deliver', () => {
    expect(shouldApplyOutboundQty('Pending', 'Shipped')).toBe(true);
    expect(shouldApplyOutboundQty('Shipped', 'Delivered')).toBe(false);
    expect(shouldApplyOutboundQty('Delivered', 'Shipped')).toBe(false);
  });

  it('rolls up line count and discounted totals', () => {
    expect(
      movementLineRollups([
        { itemId: 'a', sku: 'A', name: 'A', quantity: 2, unitCost: 100 },
        {
          itemId: 'b',
          sku: 'B',
          name: 'B',
          quantity: 1,
          unitCost: 50,
          discountPercent: 10,
        },
      ]),
    ).toEqual({ itemCount: 2, grandTotal: 245 });
  });
});
