// tests/unit/SessionTokenTracker.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { SessionTokenTracker } from '../../src/core/SessionTokenTracker.js';

describe('SessionTokenTracker', () => {
  let tracker: SessionTokenTracker;

  beforeEach(() => {
    tracker = new SessionTokenTracker({ tokenLimit: 200000 });
  });

  it('should initialize with zero tokens', () => {
    expect(tracker.getTotalTokens()).toBe(0);
    expect(tracker.getUsagePercentage()).toBe(0);
  });

  it('should record token usage', () => {
    tracker.recordUsage({ inputTokens: 1000, outputTokens: 500 });
    expect(tracker.getTotalTokens()).toBe(1500);
  });

  it('should calculate usage percentage', () => {
    tracker.recordUsage({ inputTokens: 100000, outputTokens: 0 });
    expect(tracker.getUsagePercentage()).toBe(50);
  });

  it('should detect threshold warnings', () => {
    tracker.recordUsage({ inputTokens: 160000, outputTokens: 0 }); // 80%
    const warnings = tracker.checkThresholds();
    expect(warnings).toContainEqual(
      expect.objectContaining({ level: 'warning', threshold: 80 })
    );
  });

  it('should detect critical threshold', () => {
    tracker.recordUsage({ inputTokens: 180000, outputTokens: 0 }); // 90%
    const warnings = tracker.checkThresholds();
    expect(warnings).toContainEqual(
      expect.objectContaining({ level: 'critical', threshold: 90 })
    );
  });

  it('should prevent duplicate threshold warnings', () => {
    tracker.recordUsage({ inputTokens: 160000, outputTokens: 0 }); // 80%
    const warnings1 = tracker.checkThresholds();
    expect(warnings1.length).toBeGreaterThan(0);
    expect(warnings1[0].threshold).toBe(80);

    tracker.recordUsage({ inputTokens: 1000, outputTokens: 0 }); // Still > 80%
    const warnings2 = tracker.checkThresholds();
    expect(warnings2.length).toBe(0); // No duplicate warning
  });

  it('should record usage history with timestamps', () => {
    tracker.recordUsage({ inputTokens: 1000, outputTokens: 500 });
    tracker.recordUsage({ inputTokens: 2000, outputTokens: 1000 });

    const stats = tracker.getStats();
    expect(stats.interactionCount).toBe(2);
  });

  it('should provide usage statistics', () => {
    tracker.recordUsage({ inputTokens: 100000, outputTokens: 0 });

    const stats = tracker.getStats();
    expect(stats.totalTokens).toBe(100000);
    expect(stats.tokenLimit).toBe(200000);
    expect(stats.usagePercentage).toBe(50);
    expect(stats.tokensRemaining).toBe(100000);
    expect(stats.interactionCount).toBe(1);
    expect(stats.triggeredThresholds).toEqual([]);
  });

  it('should detect threshold at exact percentage', () => {
    tracker.recordUsage({ inputTokens: 160000, outputTokens: 0 }); // Exactly 80%
    const warnings = tracker.checkThresholds();
    expect(warnings.length).toBe(1);
    expect(warnings[0].threshold).toBe(80);
  });

  it('should support custom threshold configuration', () => {
    const customTracker = new SessionTokenTracker({
      tokenLimit: 100000,
      thresholds: [
        { percentage: 50, level: 'info' },
        { percentage: 75, level: 'warning' },
      ],
    });
    customTracker.recordUsage({ inputTokens: 50000, outputTokens: 0 });
    const warnings = customTracker.checkThresholds();
    expect(warnings[0].level).toBe('info');
    expect(warnings[0].threshold).toBe(50);
  });

  // CRITICAL-1: Division by zero and NaN validation tests
  describe('CRITICAL-1: Division by zero and NaN validation', () => {
    it('should throw error for NaN tokenLimit', () => {
      expect(() => new SessionTokenTracker({ tokenLimit: NaN })).toThrow(
        'Token limit must be finite number'
      );
    });

    it('should throw error for Infinity tokenLimit', () => {
      expect(() => new SessionTokenTracker({ tokenLimit: Infinity })).toThrow(
        'Token limit must be finite number'
      );
    });

    it('should throw error for negative Infinity tokenLimit', () => {
      expect(() => new SessionTokenTracker({ tokenLimit: -Infinity })).toThrow(
        'Token limit must be finite number'
      );
    });

    it('should throw error for zero tokenLimit', () => {
      expect(() => new SessionTokenTracker({ tokenLimit: 0 })).toThrow(
        'Token limit must be positive'
      );
    });

    it('should throw error for negative tokenLimit', () => {
      expect(() => new SessionTokenTracker({ tokenLimit: -100 })).toThrow(
        'Token limit must be positive'
      );
    });

    it('should throw error for tokenLimit exceeding MAX_SAFE_INTEGER', () => {
      expect(() => new SessionTokenTracker({ tokenLimit: Number.MAX_SAFE_INTEGER + 1 })).toThrow(
        'Token limit exceeds safe integer'
      );
    });

    it('should throw error for NaN threshold percentage', () => {
      expect(() => new SessionTokenTracker({
        tokenLimit: 100000,
        thresholds: [{ percentage: NaN, level: 'warning' }]
      })).toThrow('Threshold percentage must be finite');
    });

    it('should throw error for threshold percentage > 100', () => {
      expect(() => new SessionTokenTracker({
        tokenLimit: 100000,
        thresholds: [{ percentage: 150, level: 'warning' }]
      })).toThrow('Threshold percentage must be 0-100');
    });

    it('should throw error for negative threshold percentage', () => {
      expect(() => new SessionTokenTracker({
        tokenLimit: 100000,
        thresholds: [{ percentage: -10, level: 'warning' }]
      })).toThrow('Threshold percentage must be 0-100');
    });

    it('should throw error for NaN inputTokens', () => {
      expect(() => tracker.recordUsage({ inputTokens: NaN, outputTokens: 100 })).toThrow(
        'Input tokens must be finite'
      );
    });

    it('should throw error for Infinity inputTokens', () => {
      expect(() => tracker.recordUsage({ inputTokens: Infinity, outputTokens: 100 })).toThrow(
        'Input tokens must be finite'
      );
    });

    it('should throw error for NaN outputTokens', () => {
      expect(() => tracker.recordUsage({ inputTokens: 100, outputTokens: NaN })).toThrow(
        'Output tokens must be finite'
      );
    });

    it('should throw error for Infinity outputTokens', () => {
      expect(() => tracker.recordUsage({ inputTokens: 100, outputTokens: Infinity })).toThrow(
        'Output tokens must be finite'
      );
    });

    it('should throw error when token sum exceeds MAX_SAFE_INTEGER', () => {
      expect(() => tracker.recordUsage({
        inputTokens: Number.MAX_SAFE_INTEGER,
        outputTokens: 1
      })).toThrow('Token sum exceeds safe integer');
    });

    it('should throw error when total would exceed MAX_SAFE_INTEGER', () => {
      const largeTracker = new SessionTokenTracker({ tokenLimit: Number.MAX_SAFE_INTEGER });
      largeTracker.recordUsage({ inputTokens: Number.MAX_SAFE_INTEGER - 1000, outputTokens: 0 });
      expect(() => largeTracker.recordUsage({ inputTokens: 1000, outputTokens: 1 })).toThrow(
        'Total tokens would exceed safe integer'
      );
    });

    it('should return 0 for getUsagePercentage when tokenLimit is 0 (defensive)', () => {
      // This should not happen due to constructor validation, but test defensive code
      const tracker = new SessionTokenTracker({ tokenLimit: 1 });
      (tracker as any).tokenLimit = 0; // Force invalid state
      expect(tracker.getUsagePercentage()).toBe(0);
    });

    it('should return 0 for getUsagePercentage when percentage is NaN (defensive)', () => {
      const tracker = new SessionTokenTracker({ tokenLimit: 1 });
      (tracker as any).totalTokens = NaN; // Force invalid state
      expect(tracker.getUsagePercentage()).toBe(0);
    });

    it('should accept valid edge case values', () => {
      const tracker = new SessionTokenTracker({ tokenLimit: Number.MAX_SAFE_INTEGER });
      tracker.recordUsage({ inputTokens: 1, outputTokens: 0 });
      expect(tracker.getTotalTokens()).toBe(1);
      expect(tracker.getUsagePercentage()).toBeGreaterThan(0);
    });
  });
});
