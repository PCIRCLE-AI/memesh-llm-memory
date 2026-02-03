/**
 * ✅ CODE QUALITY TESTS (MAJOR-2): Safe math operations
 *
 * Test suite for safe numeric parsing and operations
 */

import { describe, it, expect } from 'vitest';
import {
  safeParseInt,
  safeParseFloat,
  safeDivide,
  safeMultiply,
  safeAdd,
  safePercentage,
  clamp,
  isSafeInteger,
  bytesToMB,
  mbToBytes,
} from '../safeMath.js';

describe('safeMath', () => {
  describe('safeParseInt', () => {
    it('should parse valid integers', () => {
      expect(safeParseInt('42', 0)).toBe(42);
      expect(safeParseInt('100', 0)).toBe(100);
      expect(safeParseInt('-50', 0)).toBe(-50);
    });

    it('should return default on NaN', () => {
      expect(safeParseInt('abc', 100)).toBe(100);
      expect(safeParseInt('not a number', 0)).toBe(0);
      expect(safeParseInt('', 50)).toBe(50);
      expect(safeParseInt(undefined, 25)).toBe(25);
    });

    it('should clamp to min value', () => {
      expect(safeParseInt('-100', 0, 0, 100)).toBe(0);
      expect(safeParseInt('5', 0, 10, 100)).toBe(10);
    });

    it('should clamp to max value', () => {
      expect(safeParseInt('1000', 0, 0, 100)).toBe(100);
      expect(safeParseInt('150', 0, 0, 100)).toBe(100);
    });

    it('should handle number inputs', () => {
      expect(safeParseInt(42, 0)).toBe(42);
      expect(safeParseInt(100, 0, 0, 50)).toBe(50);
    });

    it('should handle edge cases', () => {
      expect(safeParseInt(null as any, 10)).toBe(10);
      expect(safeParseInt(NaN, 10)).toBe(10);
      expect(safeParseInt(Infinity, 10)).toBe(10);
    });
  });

  describe('safeParseFloat', () => {
    it('should parse valid floats', () => {
      expect(safeParseFloat('3.14', 0)).toBe(3.14);
      expect(safeParseFloat('100.5', 0)).toBe(100.5);
      expect(safeParseFloat('-50.25', 0)).toBe(-50.25);
    });

    it('should return default on NaN', () => {
      expect(safeParseFloat('abc', 1.0)).toBe(1.0);
      expect(safeParseFloat('not a number', 0)).toBe(0);
      expect(safeParseFloat('', 2.5)).toBe(2.5);
    });

    it('should clamp to min/max', () => {
      expect(safeParseFloat('0.5', 0, 1.0, 10.0)).toBe(1.0);
      expect(safeParseFloat('20.0', 0, 1.0, 10.0)).toBe(10.0);
    });

    it('should handle number inputs', () => {
      expect(safeParseFloat(3.14, 0)).toBe(3.14);
      expect(safeParseFloat(100.5, 0, 0, 50)).toBe(50);
    });
  });

  describe('safeDivide', () => {
    it('should perform valid division', () => {
      expect(safeDivide(10, 2)).toBe(5);
      expect(safeDivide(100, 4)).toBe(25);
      expect(safeDivide(7, 2)).toBe(3.5);
    });

    it('should handle division by zero', () => {
      expect(safeDivide(10, 0)).toBe(0);
      expect(safeDivide(10, 0, 100)).toBe(100);
    });

    it('should handle invalid inputs', () => {
      expect(safeDivide(NaN, 2)).toBe(0);
      expect(safeDivide(10, NaN)).toBe(0);
      expect(safeDivide(Infinity, 2)).toBe(0);
      expect(safeDivide(10, Infinity)).toBe(0);
    });

    it('should handle negative division', () => {
      expect(safeDivide(-10, 2)).toBe(-5);
      expect(safeDivide(10, -2)).toBe(-5);
      expect(safeDivide(-10, -2)).toBe(5);
    });
  });

  describe('safeMultiply', () => {
    it('should perform valid multiplication', () => {
      expect(safeMultiply(10, 20)).toBe(200);
      expect(safeMultiply(5, 5)).toBe(25);
      expect(safeMultiply(-5, 10)).toBe(-50);
    });

    it('should handle overflow', () => {
      expect(safeMultiply(1e15, 1e15)).toBe(Number.MAX_SAFE_INTEGER);
      expect(safeMultiply(Number.MAX_SAFE_INTEGER, 2)).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should respect custom max value', () => {
      expect(safeMultiply(100, 50, 1000)).toBe(1000);
      expect(safeMultiply(10, 20, 150)).toBe(150);
    });

    it('should handle invalid inputs', () => {
      expect(safeMultiply(NaN, 10)).toBe(0);
      expect(safeMultiply(10, NaN)).toBe(0);
      expect(safeMultiply(Infinity, 10)).toBe(0);
    });
  });

  describe('safeAdd', () => {
    it('should perform valid addition', () => {
      expect(safeAdd(10, 20)).toBe(30);
      expect(safeAdd(5, 5)).toBe(10);
      expect(safeAdd(-5, 10)).toBe(5);
    });

    it('should handle overflow', () => {
      expect(safeAdd(Number.MAX_SAFE_INTEGER, 1000)).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should respect custom max value', () => {
      expect(safeAdd(100, 50, 120)).toBe(120);
    });

    it('should handle invalid inputs', () => {
      expect(safeAdd(NaN, 10)).toBe(0);
      expect(safeAdd(10, NaN)).toBe(0);
    });
  });

  describe('safePercentage', () => {
    it('should calculate valid percentages', () => {
      expect(safePercentage(50, 200)).toBe(25.00);
      expect(safePercentage(1, 3)).toBe(33.33);
      expect(safePercentage(100, 100)).toBe(100.00);
    });

    it('should handle division by zero', () => {
      expect(safePercentage(50, 0)).toBe(0);
      expect(safePercentage(100, 0)).toBe(0);
    });

    it('should respect decimal places', () => {
      expect(safePercentage(50, 200, 0)).toBe(25);
      expect(safePercentage(1, 3, 4)).toBe(33.3333);
    });

    it('should handle edge cases', () => {
      expect(safePercentage(0, 100)).toBe(0);
      expect(safePercentage(200, 100)).toBe(200.00);
    });
  });

  describe('clamp', () => {
    it('should clamp within range', () => {
      expect(clamp(50, 0, 100)).toBe(50);
      expect(clamp(0, 0, 100)).toBe(0);
      expect(clamp(100, 0, 100)).toBe(100);
    });

    it('should clamp below min', () => {
      expect(clamp(-10, 0, 100)).toBe(0);
      expect(clamp(-100, 10, 50)).toBe(10);
    });

    it('should clamp above max', () => {
      expect(clamp(150, 0, 100)).toBe(100);
      expect(clamp(1000, 0, 100)).toBe(100);
    });

    it('should handle invalid inputs', () => {
      expect(clamp(NaN, 0, 100)).toBe(0);
      expect(clamp(Infinity, 0, 100)).toBe(0);
    });
  });

  describe('isSafeInteger', () => {
    it('should identify safe integers', () => {
      expect(isSafeInteger(42)).toBe(true);
      expect(isSafeInteger(0)).toBe(true);
      expect(isSafeInteger(-100)).toBe(true);
      expect(isSafeInteger(Number.MAX_SAFE_INTEGER)).toBe(true);
    });

    it('should reject unsafe values', () => {
      expect(isSafeInteger(1.5)).toBe(false);
      expect(isSafeInteger(NaN)).toBe(false);
      expect(isSafeInteger(Infinity)).toBe(false);
      expect(isSafeInteger(Number.MAX_SAFE_INTEGER + 1)).toBe(false);
    });
  });

  describe('bytesToMB', () => {
    it('should convert bytes to MB', () => {
      expect(bytesToMB(1048576)).toBe(1.00);
      expect(bytesToMB(1572864)).toBe(1.50);
      expect(bytesToMB(0)).toBe(0);
    });

    it('should respect decimal places', () => {
      expect(bytesToMB(1048576, 0)).toBe(1);
      expect(bytesToMB(1572864, 3)).toBe(1.500);
    });

    it('should handle invalid inputs', () => {
      expect(bytesToMB(NaN)).toBe(0);
      // Negative values should clamp to 0, but may return -0
      const result = bytesToMB(-1000);
      expect(result === 0 || result === -0).toBe(true);
    });
  });

  describe('mbToBytes', () => {
    it('should convert MB to bytes', () => {
      expect(mbToBytes(1)).toBe(1048576);
      expect(mbToBytes(1.5)).toBe(1572864);
      expect(mbToBytes(0)).toBe(0);
    });

    it('should handle invalid inputs', () => {
      expect(mbToBytes(NaN)).toBe(0);
      // Infinity results in 0 due to safeMultiply clamping
      expect(mbToBytes(Infinity)).toBe(0);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle config parsing safely', () => {
      // Simulate config file with invalid values
      const config = {
        port: 'abc',
        maxConnections: '1000',
        timeout: '-500',
        budget: '50.50',
      };

      const port = safeParseInt(config.port, 3000, 1024, 65535);
      const maxConn = safeParseInt(config.maxConnections, 5, 1, 100);
      const timeout = safeParseInt(config.timeout, 5000, 0, 30000);
      const budget = safeParseFloat(config.budget, 50, 0, 10000);

      expect(port).toBe(3000); // Invalid, use default
      expect(maxConn).toBe(100); // Valid but exceeds max
      expect(timeout).toBe(0); // Negative, clamp to min
      expect(budget).toBe(50.50); // Valid
    });

    it('should handle memory calculations safely', () => {
      // Simulate memory calculations with potential div-by-zero
      const totalMemory = 0;
      const usedMemory = 100;

      const usage = safePercentage(usedMemory, totalMemory);
      expect(usage).toBe(0); // Avoid NaN

      const allocated = safeDivide(usedMemory, totalMemory, 0);
      expect(allocated).toBe(0); // Avoid div-by-zero
    });

    it('should handle hash parsing safely', () => {
      // Simulate hash-to-number conversion
      const hashHex = 'ffffffff'; // Max 32-bit hex
      const hashInt = parseInt(hashHex, 16);
      expect(isNaN(hashInt)).toBe(false);
      expect(isFinite(hashInt)).toBe(true);

      const normalized = safeDivide(hashInt % 100000, 100000, 0);
      expect(normalized).toBeGreaterThanOrEqual(0);
      expect(normalized).toBeLessThanOrEqual(1);
    });
  });
});
