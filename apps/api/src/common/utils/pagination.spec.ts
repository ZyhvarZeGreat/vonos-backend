import {
  buildCompositeCursorQuery,
  decodeCompositeCursor,
  encodeCompositeCursor,
} from './pagination';

describe('buildCompositeCursorQuery', () => {
  it('clamps negative / All page sizes so Prisma take is never -1', () => {
    expect(buildCompositeCursorQuery({ sortField: 'id', sortDir: 'asc', limit: -1 }).take).toBe(1);
    expect(buildCompositeCursorQuery({ sortField: 'id', sortDir: 'asc', limit: 0 }).take).toBe(1);
    expect(
      buildCompositeCursorQuery({ sortField: 'id', sortDir: 'asc', limit: 50_000 }).take,
    ).toBe(1000);
    expect(buildCompositeCursorQuery({ sortField: 'id', sortDir: 'asc', limit: 25 }).take).toBe(25);
  });

  it('round-trips composite cursors', () => {
    const encoded = encodeCompositeCursor({ sortValue: 'Brake', id: 'item_1' });
    expect(decodeCompositeCursor(encoded)).toEqual({
      sortValue: 'Brake',
      id: 'item_1',
    });
  });

  it('treats legacy id-only cursors as id with empty sortValue', () => {
    expect(decodeCompositeCursor('plain-id')).toEqual({
      sortValue: '',
      id: 'plain-id',
    });
  });
});
