import { DataConverter } from './data-converter';

describe('DataConverter', () => {
  describe('centsToYuan', () => {
    it('should convert cents to yuan correctly', () => {
      expect(DataConverter.centsToYuan(100)).toBe(1);
      expect(DataConverter.centsToYuan(1234)).toBe(12.34);
      expect(DataConverter.centsToYuan(0)).toBe(0);
    });

    it('should handle negative values', () => {
      expect(DataConverter.centsToYuan(-100)).toBe(-1);
      expect(DataConverter.centsToYuan(-1234)).toBe(-12.34);
    });

    it('should handle large values', () => {
      expect(DataConverter.centsToYuan(100000000)).toBe(1000000);
    });

    it('should handle floating point precision', () => {
      // 1234.56 cents -> 12.35 yuan (rounded)
      expect(DataConverter.centsToYuan(1234.56)).toBe(12.35);
    });
  });

  describe('yuanToCents', () => {
    it('should convert yuan to cents correctly', () => {
      expect(DataConverter.yuanToCents(1)).toBe(100);
      expect(DataConverter.yuanToCents(12.34)).toBe(1234);
      expect(DataConverter.yuanToCents(0)).toBe(0);
    });

    it('should handle negative values', () => {
      expect(DataConverter.yuanToCents(-1)).toBe(-100);
      expect(DataConverter.yuanToCents(-12.34)).toBe(-1234);
    });

    it('should handle floating point precision', () => {
      // 1.234 yuan -> 123 cents (rounded)
      expect(DataConverter.yuanToCents(1.234)).toBe(123);
    });
  });

  describe('lotsToShares', () => {
    it('should convert lots to shares correctly', () => {
      expect(DataConverter.lotsToShares(1)).toBe(100);
      expect(DataConverter.lotsToShares(10)).toBe(1000);
      expect(DataConverter.lotsToShares(0)).toBe(0);
    });
  });

  describe('sharesToLots', () => {
    it('should convert shares to lots correctly', () => {
      expect(DataConverter.sharesToLots(100)).toBe(1);
      expect(DataConverter.sharesToLots(1000)).toBe(10);
      expect(DataConverter.sharesToLots(0)).toBe(0);
    });

    it('should round to nearest lot', () => {
      expect(DataConverter.sharesToLots(150)).toBe(2);
      expect(DataConverter.sharesToLots(149)).toBe(1);
    });
  });

  describe('validatePrice', () => {
    it('should validate price correctly', () => {
      expect(DataConverter.validatePrice(100)).toBe(true);
      expect(DataConverter.validatePrice(0)).toBe(true);
      expect(DataConverter.validatePrice(10000)).toBe(true);
    });

    it('should reject invalid prices', () => {
      expect(DataConverter.validatePrice(-1)).toBe(false);
      expect(DataConverter.validatePrice(10001)).toBe(false);
      expect(DataConverter.validatePrice(NaN)).toBe(false);
      // @ts-ignore
      expect(DataConverter.validatePrice('100')).toBe(false);
    });
  });

  describe('validateVolume', () => {
    it('should validate volume correctly', () => {
      expect(DataConverter.validateVolume(100)).toBe(true);
      expect(DataConverter.validateVolume(0)).toBe(true);
    });

    it('should reject invalid volumes', () => {
      expect(DataConverter.validateVolume(-1)).toBe(false);
      expect(DataConverter.validateVolume(NaN)).toBe(false);
    });
  });
});
