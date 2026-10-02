import {
  aggregateGroupPaymentStatus,
  payrollGroupGrossTotal,
} from './payrollGroupAggregates';

describe('payrollGroupGrossTotal', () => {
  it('sums basic + earnings across the group (deductions excluded)', () => {
    const total = payrollGroupGrossTotal([
      { grossPay: 100_000 as any, totalAllowance: 10_000 as any },
      { grossPay: 50_000 as any, totalAllowance: null },
      { grossPay: 20_000 as any },
    ]);
    expect(total).toBe(180_000);
  });

  it('handles Prisma Decimal-style values', () => {
    const total = payrollGroupGrossTotal([
      { grossPay: { toString: () => '1234.5' }, totalAllowance: { toString: () => '0.5' } },
    ]);
    expect(total).toBe(1235);
  });
});

describe('aggregateGroupPaymentStatus', () => {
  it('is due when nothing is paid', () => {
    expect(
      aggregateGroupPaymentStatus([
        { paymentStatus: 'unpaid', netPay: 100 },
        { paymentStatus: 'unpaid', netPay: 200 },
      ]),
    ).toBe('due');
  });

  it('is partial when only some rows are paid', () => {
    expect(
      aggregateGroupPaymentStatus([
        { paymentStatus: 'paid', netPay: 100 },
        { paymentStatus: 'unpaid', netPay: 200 },
      ]),
    ).toBe('partial');
  });

  it('is paid when every row is paid', () => {
    expect(
      aggregateGroupPaymentStatus([
        { paymentStatus: 'paid', netPay: 100 },
        { paymentStatus: 'paid', netPay: 200 },
      ]),
    ).toBe('paid');
  });

  it('treats zero/negative net rows as settled so the group can complete', () => {
    expect(
      aggregateGroupPaymentStatus([
        { paymentStatus: 'paid', netPay: 100 },
        { paymentStatus: 'unpaid', netPay: 0 },
      ]),
    ).toBe('paid');
  });

  it('is paid when every row is zero/negative net (nothing left to pay)', () => {
    expect(
      aggregateGroupPaymentStatus([
        { paymentStatus: 'unpaid', netPay: 0 },
        { paymentStatus: 'unpaid', netPay: -50 },
      ]),
    ).toBe('paid');
  });

  it('is due for an empty group', () => {
    expect(aggregateGroupPaymentStatus([])).toBe('due');
  });
});
