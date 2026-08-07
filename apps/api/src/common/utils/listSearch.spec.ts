import {
  compactPlateToken,
  isPlateLikeLookup,
  isSkuLikeLookup,
  itemTextSearchWhere,
  contactTextSearchWhere,
  saleTextSearchWhere,
  supplierTextSearchWhere,
  tokenizeListSearch,
} from './listSearch';

describe('listSearch', () => {
  it('tokenizes and caps at 4', () => {
    expect(tokenizeListSearch('  brake pad camry  ')).toEqual([
      'brake',
      'pad',
      'camry',
    ]);
    expect(tokenizeListSearch('a b c d e f g h')).toHaveLength(4);
  });

  it('detects SKU-like lookups', () => {
    expect(isSkuLikeLookup('BP-4412')).toBe(true);
    expect(isSkuLikeLookup('oil filter')).toBe(false);
    expect(isSkuLikeLookup('a')).toBe(false);
  });

  it('detects plate-like lookups including spaced plates', () => {
    expect(isPlateLikeLookup('ABC-123XY')).toBe(true);
    expect(isPlateLikeLookup('GWA 425 SF')).toBe(true);
    expect(isPlateLikeLookup('GWA425SF')).toBe(true);
    expect(isPlateLikeLookup('oil filter')).toBe(false);
    expect(isPlateLikeLookup('12345')).toBe(false);
    expect(compactPlateToken('GWA 425 SF')).toBe('GWA425SF');
  });

  it('matches Contact ID / plate on customer search', () => {
    const where = contactTextSearchWhere('ABC-123XY');
    expect(where?.AND[0]?.OR).toEqual(
      expect.arrayContaining([
        {
          details: {
            path: ['contactId'],
            string_contains: 'ABC-123XY',
          },
        },
      ]),
    );
  });

  it('matches spaced plates against Contact ID', () => {
    const where = contactTextSearchWhere('GWA 425 SF');
    expect(where?.AND[0]?.OR).toEqual(
      expect.arrayContaining([
        {
          details: {
            path: ['contactId'],
            string_contains: 'GWA425SF',
          },
        },
      ]),
    );
  });

  it('uses equality/prefix for SKU-like queries', () => {
    const where = itemTextSearchWhere('BP-4412');
    expect(where?.AND[0]?.OR).toEqual(
      expect.arrayContaining([
        { sku: { equals: 'BP-4412', mode: 'insensitive' } },
        { sku: { startsWith: 'BP-4412', mode: 'insensitive' } },
      ]),
    );
  });

  it('uses trigram contains for phrase search', () => {
    const where = itemTextSearchWhere('brake pad');
    expect(where?.AND).toHaveLength(2);
    expect(where?.AND[0]?.OR).toEqual(
      expect.arrayContaining([
        { name: { contains: 'brake', mode: 'insensitive' } },
        { sku: { contains: 'brake', mode: 'insensitive' } },
      ]),
    );
  });

  it('skips 1-character fuzzy tokens', () => {
    const where = itemTextSearchWhere('a brake');
    expect(where?.AND).toHaveLength(1);
  });

  it('uses prefix/equality for invoice-like sale search', () => {
    const where = saleTextSearchWhere('2024/001');
    expect(where?.AND[0]?.OR).toEqual(
      expect.arrayContaining([
        { reference: { equals: '2024/001', mode: 'insensitive' } },
        { reference: { startsWith: '2024/001', mode: 'insensitive' } },
      ]),
    );
  });

  it('sale search includes customer Contact ID for plates', () => {
    const where = saleTextSearchWhere('ABC-123XY');
    expect(where?.AND[0]?.OR).toEqual(
      expect.arrayContaining([
        {
          customer: {
            details: {
              path: ['contactId'],
              string_contains: 'ABC-123XY',
            },
          },
        },
      ]),
    );
  });

  it('uses customer contains for multi-word sale search', () => {
    const where = saleTextSearchWhere('peridot oil');
    expect(where?.AND).toHaveLength(2);
    expect(where?.AND[0]?.OR).toEqual(
      expect.arrayContaining([
        { reference: { contains: 'peridot', mode: 'insensitive' } },
        { customer: { name: { contains: 'peridot', mode: 'insensitive' } } },
      ]),
    );
  });
});

describe('supplierTextSearchWhere (audit: Add Purchase supplier typeahead)', () => {
  it('matches the full typed phrase against supplier name', () => {
    const where = supplierTextSearchWhere('Sunny Day 7');
    expect(where).toBeDefined();
    expect(where).toEqual(
      expect.objectContaining({
        OR: expect.arrayContaining([
          { name: { contains: 'Sunny Day 7', mode: 'insensitive' } },
          { contactName: { contains: 'Sunny Day 7', mode: 'insensitive' } },
        ]),
      }),
    );
  });

  it('also tokenizes multi-word queries so "Sunny Day number seven" hits', () => {
    const where = supplierTextSearchWhere('Sunny Day number seven');
    const or = (where as { OR: unknown[] }).OR;
    const tokenized = or.find(
      (branch) =>
        branch &&
        typeof branch === 'object' &&
        'AND' in (branch as Record<string, unknown>),
    ) as { AND: Array<{ OR: object[] }> };
    expect(tokenized.AND).toHaveLength(4);
    expect(tokenized.AND[0]?.OR).toEqual(
      expect.arrayContaining([
        { name: { contains: 'Sunny', mode: 'insensitive' } },
      ]),
    );
  });
});
