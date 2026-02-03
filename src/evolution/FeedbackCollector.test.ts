/**
 * FeedbackCollector - Validation Tests
 *
 * Tests for NaN/Infinity validation in count parameter
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FeedbackCollector } from './FeedbackCollector.js';
import { AIErrorType } from './types.js';

describe('FeedbackCollector - Validation', () => {
  let collector: FeedbackCollector;

  beforeEach(() => {
    collector = new FeedbackCollector();

    // Add some test mistakes
    for (let i = 0; i < 20; i++) {
      collector.recordAIMistake({
        action: `test-action-${i}`,
        errorType: AIErrorType.PROCEDURE_VIOLATION,
        userCorrection: 'test correction',
        correctMethod: 'test method',
        impact: 'test impact',
        preventionMethod: 'test prevention',
      });
    }
  });

  describe('getRecentMistakes validation', () => {
    it('should accept valid positive integer', () => {
      const mistakes = collector.getRecentMistakes(10);
      expect(mistakes).toHaveLength(10);
    });

    it('should reject NaN', () => {
      expect(() => {
        collector.getRecentMistakes(NaN);
      }).toThrow('count must be finite');
    });

    it('should reject Infinity', () => {
      expect(() => {
        collector.getRecentMistakes(Infinity);
      }).toThrow('count must be finite');
    });

    it('should reject negative Infinity', () => {
      expect(() => {
        collector.getRecentMistakes(-Infinity);
      }).toThrow('count must be finite');
    });

    it('should reject non-integer', () => {
      expect(() => {
        collector.getRecentMistakes(5.5);
      }).toThrow('count must be a positive integer');
    });

    it('should reject zero', () => {
      expect(() => {
        collector.getRecentMistakes(0);
      }).toThrow('count must be a positive integer');
    });

    it('should reject negative', () => {
      expect(() => {
        collector.getRecentMistakes(-5);
      }).toThrow('count must be a positive integer');
    });

    it('should handle count larger than available mistakes', () => {
      const mistakes = collector.getRecentMistakes(100);
      expect(mistakes).toHaveLength(20); // Only 20 mistakes available
    });

    it('should return mistakes in newest-first order', () => {
      const mistakes = collector.getRecentMistakes(5);
      expect(mistakes).toHaveLength(5);

      // Check that newest is first
      for (let i = 0; i < mistakes.length - 1; i++) {
        expect(mistakes[i].timestamp.getTime()).toBeGreaterThanOrEqual(
          mistakes[i + 1].timestamp.getTime()
        );
      }
    });
  });

  describe('edge cases', () => {
    it('should handle count = 1', () => {
      const mistakes = collector.getRecentMistakes(1);
      expect(mistakes).toHaveLength(1);
    });

    it('should handle very large valid count', () => {
      const mistakes = collector.getRecentMistakes(Number.MAX_SAFE_INTEGER);
      expect(mistakes).toHaveLength(20); // Still limited by available mistakes
    });

    it('should handle empty mistake collection', () => {
      const emptyCollector = new FeedbackCollector();
      const mistakes = emptyCollector.getRecentMistakes(10);
      expect(mistakes).toHaveLength(0);
    });
  });
});
