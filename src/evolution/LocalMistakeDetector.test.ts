/**
 * Tests for LocalMistakeDetector
 *
 * Validates multi-language correction detection
 */

import { describe, it, expect } from 'vitest';
import { LocalMistakeDetector } from './LocalMistakeDetector.js';

describe('LocalMistakeDetector', () => {
  const detector = new LocalMistakeDetector();

  describe('English correction detection', () => {
    it('should detect "no, that\'s wrong"', () => {
      const result = detector.detectCorrection('no, that\'s wrong');
      expect(result.isCorrection).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
      expect(result.language).toBe('en');
    });

    it('should detect "you\'re wrong, should be X"', () => {
      const result = detector.detectCorrection('you\'re wrong, should be using POST instead');
      expect(result.isCorrection).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.correctMethod).toBe('using POST instead');
    });

    it('should detect "don\'t do that"', () => {
      const result = detector.detectCorrection('don\'t do that');
      expect(result.isCorrection).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.4);
    });

    it('should not detect normal statements', () => {
      const result = detector.detectCorrection('Can you help me with this task?');
      expect(result.isCorrection).toBe(false);
    });
  });

  describe('Chinese correction detection', () => {
    it('should detect "不對，應該是X"', () => {
      const result = detector.detectCorrection('不對，應該是用 POST');
      expect(result.isCorrection).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
      expect(result.language).toBe('zh');
      expect(result.correctMethod).toBe('用 POST');
    });

    it('should detect "你搞錯了"', () => {
      const result = detector.detectCorrection('你搞錯了');
      expect(result.isCorrection).toBe(true);
      expect(result.language).toBe('zh');
    });

    it('should detect "不應該這樣做"', () => {
      const result = detector.detectCorrection('不應該這樣做');
      expect(result.isCorrection).toBe(true);
      expect(result.language).toBe('zh');
    });
  });

  describe('Japanese correction detection', () => {
    it('should detect "違う"', () => {
      const result = detector.detectCorrection('違う');
      expect(result.isCorrection).toBe(true);
      expect(result.language).toBe('ja');
    });

    it('should detect "間違い"', () => {
      const result = detector.detectCorrection('それは間違いです');
      expect(result.isCorrection).toBe(true);
      expect(result.language).toBe('ja');
    });
  });

  describe('Spanish correction detection', () => {
    it('should detect "no, eso no"', () => {
      const result = detector.detectCorrection('no, eso no está correcto');
      expect(result.isCorrection).toBe(true);
      expect(result.language).toBe('es');
    });

    it('should detect "debería ser"', () => {
      const result = detector.detectCorrection('debería ser POST');
      expect(result.isCorrection).toBe(true);
      expect(result.language).toBe('es');
    });
  });

  describe('Context-aware detection', () => {
    it('should boost confidence when following AI message', () => {
      const conversation = [
        { role: 'assistant' as const, content: 'I will use GET for this operation' },
        { role: 'user' as const, content: 'actually, it should be POST' },
      ];

      const result = detector.detectCorrectionWithContext(
        'actually, it should be POST',
        conversation
      );

      expect(result.isCorrection).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.6);
    });

    it('should lower confidence for very long messages', () => {
      const longMessage = 'Actually, I need to clarify something. ' + 'a'.repeat(500);

      const shortDetection = detector.detectCorrection('Actually, it should be POST');
      const longDetection = detector.detectCorrectionWithContext(longMessage, []);

      expect(longDetection.confidence).toBeLessThan(shortDetection.confidence);
    });
  });

  describe('Negative sentiment detection', () => {
    it('should detect negative indicators', () => {
      expect(detector.detectNegativeSentiment('no, that is wrong')).toBe(true);
      expect(detector.detectNegativeSentiment('incorrect approach')).toBe(true);
      expect(detector.detectNegativeSentiment('不對')).toBe(true);
      expect(detector.detectNegativeSentiment('違う')).toBe(true);
    });

    it('should not detect neutral messages', () => {
      expect(detector.detectNegativeSentiment('please help me')).toBe(false);
      expect(detector.detectNegativeSentiment('thank you')).toBe(false);
    });
  });

  describe('Multi-language support', () => {
    it('should auto-detect language', () => {
      const enResult = detector.detectCorrection('no, that\'s wrong');
      const zhResult = detector.detectCorrection('不對');
      const jaResult = detector.detectCorrection('違う');

      expect(enResult.language).toBe('en');
      expect(zhResult.language).toBe('zh');
      expect(jaResult.language).toBe('ja');
    });

    it('should work with language hint', () => {
      const result = detector.detectCorrection('should be POST', 'en');
      expect(result.isCorrection).toBe(true);
    });
  });
});
