import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

describe('SalesService sale outbound stock movement', () => {
  const src = readFileSync(join(__dirname, 'sales.service.ts'), 'utf8');

  it('writes outbound StockMovement after stock deduct on create', () => {
    expect(src).toContain('writeSaleOutboundMovement');
    expect(src).toContain("type: 'outbound'");
    expect(src).toContain('outboundLinesFromStockDeltas');
    expect(src).toContain('SO-');
  });

  it('soft-deletes and rewrites outbound on update', () => {
    expect(src).toContain('softDeleteSaleOutboundMovements');
    expect(src).toContain('outboundLinesFromSaleLines');
    expect(src).toContain('stayingOrBecomingFinal');
  });

  it('links movements via saleId notes marker', () => {
    expect(src).toContain('saleId:');
    expect(src).toContain('saleOutboundNotesMarker');
  });
});
