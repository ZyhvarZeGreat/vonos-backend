import {
  assertBusinessLocation,
  assertProductStockLocation,
} from './businessLocation';

const vispConfig = {
  code: 'VISP',
  businessLocations: [
    { code: 'VISP', name: 'Vonos Institute Spare Parts' },
  ],
};

describe('product vs sale location validation', () => {
  it('lets product create/edit omit a location', () => {
    expect(assertProductStockLocation(vispConfig, undefined)).toBeNull();
    expect(assertProductStockLocation(vispConfig, '')).toBeNull();
    expect(assertProductStockLocation(vispConfig, '   ')).toBeNull();
  });

  it('accepts VW / VISP / VSP stock homes on product writes', () => {
    expect(assertProductStockLocation(vispConfig, 'VISP')).toBe('VISP');
    expect(assertProductStockLocation(vispConfig, 'VW')).toBe('VW');
    expect(assertProductStockLocation(vispConfig, 'VSP')).toBe('VSP');
  });

  it('rejects unknown product stock locations', () => {
    expect(() => assertProductStockLocation(vispConfig, 'VA')).toThrow(
      /Unknown business location/,
    );
  });

  it('still requires a location on sale / expense writes', () => {
    expect(() => assertBusinessLocation(vispConfig, undefined)).toThrow(
      /Business location is required/,
    );
    expect(assertBusinessLocation(vispConfig, 'VISP')).toBe('VISP');
  });
});
