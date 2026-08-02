import {
  isSkuLikeLookup,
  itemTextSearchWhere,
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
});
