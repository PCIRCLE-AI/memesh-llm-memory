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
});
