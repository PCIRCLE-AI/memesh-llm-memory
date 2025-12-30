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
});
