import {
  defaultYearInvoicePrefix,
  formatInvoiceNumber,
  isYearInvoicePrefix,
  resolveInvoicePrefix,
} from './allocateInvoiceNumber';

describe('allocateInvoiceNumber helpers', () => {
  it('detects year prefixes with slash or hyphen', () => {
    expect(isYearInvoicePrefix('2026/')).toBe(true);
    expect(isYearInvoicePrefix('2026-')).toBe(true);
    expect(isYearInvoicePrefix('2026')).toBe(true);
    expect(isYearInvoicePrefix('INV')).toBe(false);
    expect(isYearInvoicePrefix('')).toBe(false);
  });

  it('resolves year prefixes to current year with slash', () => {
    const year = new Date().getFullYear();
    expect(resolveInvoicePrefix('2025/')).toBe(`${year}/`);
    expect(resolveInvoicePrefix('2026-')).toBe(`${year}/`);
    expect(resolveInvoicePrefix('INV-')).toBe('INV-');
  });

  it('formats padded sequential numbers', () => {
    const year = new Date().getFullYear();
    expect(formatInvoiceNumber('2026/', 1, 4)).toBe(`${year}/0001`);
    expect(formatInvoiceNumber('2026/', 12, 4)).toBe(`${year}/0012`);
    expect(formatInvoiceNumber(null, 1, 4)).toBe('0001');
    expect(defaultYearInvoicePrefix()).toBe(`${year}/`);
  });
});
