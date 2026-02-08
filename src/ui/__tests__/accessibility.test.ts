/**
 * Accessibility Tests
 *
 * Verifies WCAG compliance and screen reader support
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getRelativeLuminance,
  parseHexColor,
  getContrastRatio,
  meetsWCAG,
  WCAGLevel,
  verifyContrast,
  isScreenReaderEnabled,
  emitScreenReaderEvent,
  formatForScreenReader,
  createAccessibleStatus,
} from '../accessibility.js';
import chalk from 'chalk';

describe('Accessibility Utilities', () => {
  describe('Color Contrast Calculation', () => {
    it('should calculate relative luminance correctly', () => {
      // White (maximum luminance)
      expect(getRelativeLuminance([255, 255, 255])).toBeCloseTo(1.0, 2);

      // Black (minimum luminance)
      expect(getRelativeLuminance([0, 0, 0])).toBeCloseTo(0.0, 2);

      // Gray (mid luminance)
      const gray = getRelativeLuminance([128, 128, 128]);
      expect(gray).toBeGreaterThan(0);
      expect(gray).toBeLessThan(1);
    });

    it('should parse hex colors correctly', () => {
      expect(parseHexColor('#ffffff')).toEqual([255, 255, 255]);
      expect(parseHexColor('000000')).toEqual([0, 0, 0]);
      expect(parseHexColor('#667eea')).toEqual([102, 126, 234]);
    });

    it('should throw on invalid hex colors', () => {
      expect(() => parseHexColor('#fff')).toThrow('Invalid hex color');
      expect(() => parseHexColor('invalid')).toThrow('Invalid hex color');
    });

    it('should calculate contrast ratio correctly', () => {
      // White on black (maximum contrast)
      const maxContrast = getContrastRatio('#ffffff', '#000000');
      expect(maxContrast).toBeCloseTo(21, 0);

      // Same color (minimum contrast)
      const minContrast = getContrastRatio('#ffffff', '#ffffff');
      expect(minContrast).toBeCloseTo(1, 0);

      // Real-world example: text color on background
      const textContrast = getContrastRatio('#f9fafb', '#111827');
      expect(textContrast).toBeGreaterThan(4.5); // Should meet WCAG AA
    });

    it('should accept RGB arrays as input', () => {
      const ratio = getContrastRatio([255, 255, 255], [0, 0, 0]);
      expect(ratio).toBeCloseTo(21, 0);
    });
  });

  describe('WCAG Compliance Checking', () => {
    it('should check WCAG AA compliance for normal text', () => {
      expect(meetsWCAG(4.5, WCAGLevel.AA, false)).toBe(true);
      expect(meetsWCAG(4.49, WCAGLevel.AA, false)).toBe(false);
    });

    it('should check WCAG AA compliance for large text', () => {
      expect(meetsWCAG(3.0, WCAGLevel.AA, true)).toBe(true);
      expect(meetsWCAG(2.99, WCAGLevel.AA, true)).toBe(false);
    });

    it('should check WCAG AAA compliance for normal text', () => {
      expect(meetsWCAG(7.0, WCAGLevel.AAA, false)).toBe(true);
      expect(meetsWCAG(6.99, WCAGLevel.AAA, false)).toBe(false);
    });

    it('should check WCAG AAA compliance for large text', () => {
      expect(meetsWCAG(4.5, WCAGLevel.AAA, true)).toBe(true);
      expect(meetsWCAG(4.49, WCAGLevel.AAA, true)).toBe(false);
    });
  });

  describe('Contrast Verification', () => {
    it('should verify passing contrast combinations', () => {
      const result = verifyContrast('#ffffff', '#000000', WCAGLevel.AA);

      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThan(4.5);
      expect(result.level).toBe(WCAGLevel.AA);
      expect(result.recommendation).toBeUndefined();
    });

    it('should verify failing contrast combinations', () => {
      const result = verifyContrast('#cccccc', '#ffffff', WCAGLevel.AA);

      expect(result.passes).toBe(false);
      expect(result.recommendation).toBeDefined();
      expect(result.recommendation).toContain('below WCAG AA requirement');
    });

    it('should handle large text separately', () => {
      // 3:1 ratio should pass for large text AA but fail for normal text AA
      const normalText = meetsWCAG(3.0, WCAGLevel.AA, false);
      const largeText = meetsWCAG(3.0, WCAGLevel.AA, true);

      expect(normalText).toBe(false);
      expect(largeText).toBe(true);
    });
  });

  describe('Screen Reader Support', () => {
    let originalEnv: string | undefined;

    beforeEach(() => {
      originalEnv = process.env.MEMESH_SCREEN_READER;
    });

    afterEach(() => {
      if (originalEnv === undefined) {
        delete process.env.MEMESH_SCREEN_READER;
      } else {
        process.env.MEMESH_SCREEN_READER = originalEnv;
      }
    });

    it('should detect screen reader mode from environment variable', () => {
      delete process.env.MEMESH_SCREEN_READER;
      expect(isScreenReaderEnabled()).toBe(false);

      process.env.MEMESH_SCREEN_READER = '1';
      expect(isScreenReaderEnabled()).toBe(true);

      process.env.MEMESH_SCREEN_READER = 'true';
      expect(isScreenReaderEnabled()).toBe(true);

      process.env.MEMESH_SCREEN_READER = '0';
      expect(isScreenReaderEnabled()).toBe(false);
    });

    it('should emit screen reader events when enabled', () => {
      process.env.MEMESH_SCREEN_READER = '1';

      // Mock stderr.write to capture output
      let captured = '';
      const originalWrite = process.stderr.write;
      process.stderr.write = ((str: string) => {
        captured += str;
        return true;
      }) as any;

      try {
        emitScreenReaderEvent({
          type: 'progress',
          message: 'Test message',
          progress: 5,
          total: 10,
          timestamp: Date.now(),
        });

        expect(captured).toContain('[SR]');
        expect(captured).toContain('"screenReader":true');
        expect(captured).toContain('"type":"progress"');
        expect(captured).toContain('"message":"Test message"');
      } finally {
        process.stderr.write = originalWrite;
      }
    });

    it('should not emit events when screen reader is disabled', () => {
      delete process.env.MEMESH_SCREEN_READER;

      let captured = '';
      const originalWrite = process.stderr.write;
      process.stderr.write = ((str: string) => {
        captured += str;
        return true;
      }) as any;

      try {
        emitScreenReaderEvent({
          type: 'progress',
          message: 'Test message',
          timestamp: Date.now(),
        });

        expect(captured).toBe('');
      } finally {
        process.stderr.write = originalWrite;
      }
    });

    it('should format text for screen readers by removing ANSI codes', () => {
      const colored = chalk.green('Success');
      const plain = formatForScreenReader(colored);

      expect(plain).toBe('Success');
      expect(plain).not.toContain('\x1b');
    });

    it('should create accessible status messages with symbols', () => {
      const success = createAccessibleStatus('success', 'Task completed');
      const error = createAccessibleStatus('error', 'Task failed');
      const warning = createAccessibleStatus('warning', 'Warning message');
      const info = createAccessibleStatus('info', 'Info message');

      expect(success).toContain('✓');
      expect(success).toContain('Task completed');

      expect(error).toContain('✗');
      expect(error).toContain('Task failed');

      expect(warning).toContain('⚠');
      expect(warning).toContain('Warning message');

      expect(info).toContain('ℹ');
      expect(info).toContain('Info message');
    });
  });

  describe('Theme Contrast Verification', () => {
    it('should verify primary text on primary background meets WCAG AA', () => {
      const result = verifyContrast('#f9fafb', '#111827', WCAGLevel.AA);

      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
      // ✅ IMPROVED: Verify actual value is in expected range
      expect(result.ratio).toBeCloseTo(16.98, 1); // Allow ±0.5 margin
    });

    it('should verify secondary text on primary background meets WCAG AA', () => {
      const result = verifyContrast('#d1d5db', '#111827', WCAGLevel.AA);

      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
      // ✅ IMPROVED: Verify actual value
      expect(result.ratio).toBeCloseTo(12.04, 1);
    });

    it('should verify success color on primary background meets WCAG AA', () => {
      const result = verifyContrast('#10b981', '#111827', WCAGLevel.AA);

      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
      // ✅ IMPROVED: Verify actual value
      expect(result.ratio).toBeCloseTo(6.99, 1);
    });

    it('should verify error color on primary background meets WCAG AA', () => {
      const result = verifyContrast('#ef4444', '#111827', WCAGLevel.AA);

      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
      // ✅ IMPROVED: Verify actual value
      expect(result.ratio).toBeCloseTo(4.71, 0.5);
    });

    it('should verify warning color on primary background meets WCAG AA', () => {
      const result = verifyContrast('#f59e0b', '#111827', WCAGLevel.AA);

      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
      // ✅ IMPROVED: Verify actual value
      expect(result.ratio).toBeCloseTo(8.26, 1);
    });

    it('should verify info color on primary background meets WCAG AA', () => {
      const result = verifyContrast('#3b82f6', '#111827', WCAGLevel.AA);

      expect(result.passes).toBe(true);
      expect(result.ratio).toBeGreaterThanOrEqual(4.5);
      // ✅ IMPROVED: Verify actual value
      expect(result.ratio).toBeCloseTo(4.82, 0.5);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should throw error on invalid hex color (too short)', () => {
      expect(() => parseHexColor('#fff')).toThrow('Invalid hex color');
      expect(() => parseHexColor('fff')).toThrow('Invalid hex color');
    });

    it('should throw error on invalid hex color (too long)', () => {
      expect(() => parseHexColor('#fffffff')).toThrow('Invalid hex color');
    });

    it('should throw error on invalid hex color (non-hex characters)', () => {
      expect(() => parseHexColor('#gggggg')).toThrow('Invalid hex color');
      expect(() => parseHexColor('#zzzzzz')).toThrow('Invalid hex color');
    });

    it('should handle near-identical colors (minimum contrast)', () => {
      const result = getContrastRatio('#ffffff', '#fefefe');
      expect(result).toBeCloseTo(1, 1); // Should be very close to 1:1
    });

    it('should handle extreme contrasts correctly', () => {
      const whiteOnBlack = getContrastRatio('#ffffff', '#000000');
      const blackOnWhite = getContrastRatio('#000000', '#ffffff');

      // Both should give the same ratio (contrast is symmetric)
      expect(whiteOnBlack).toBeCloseTo(blackOnWhite, 2);
      expect(whiteOnBlack).toBeCloseTo(21, 0);
    });

    it('should handle screen reader events with valid JSON structure', () => {
      process.env.MEMESH_SCREEN_READER = '1';

      let captured = '';
      const originalWrite = process.stderr.write;
      process.stderr.write = ((str: string) => {
        captured += str;
        return true;
      }) as any;

      try {
        emitScreenReaderEvent({
          type: 'success',
          message: 'Test completed',
          timestamp: 1234567890,
        });

        // ✅ IMPROVED: Verify JSON is actually valid
        const jsonStr = captured.replace('[SR] ', '').trim();
        const parsed = JSON.parse(jsonStr);

        expect(parsed.screenReader).toBe(true);
        expect(parsed.type).toBe('success');
        expect(parsed.message).toBe('Test completed');
        expect(parsed.timestamp).toBe(1234567890);
      } finally {
        process.stderr.write = originalWrite;
        delete process.env.MEMESH_SCREEN_READER;
      }
    });
  });
});
