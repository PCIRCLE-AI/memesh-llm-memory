// tests/unit/SessionContextMonitor.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SessionContextMonitor } from '../../src/core/SessionContextMonitor.js';
import type { SessionTokenTracker } from '../../src/core/SessionTokenTracker.js';

describe('SessionContextMonitor', () => {
  let monitor: SessionContextMonitor;
  let mockTokenTracker: SessionTokenTracker;

  beforeEach(() => {
    mockTokenTracker = {
      getTotalTokens: vi.fn().mockReturnValue(160000), // 80%
      getUsagePercentage: vi.fn().mockReturnValue(80),
      checkThresholds: vi.fn().mockReturnValue([
        {
          threshold: 80,
          level: 'warning',
          tokensUsed: 160000,
          tokensRemaining: 40000,
          message: 'Session token usage at 80%',
        },
      ]),
      recordUsage: vi.fn(),
      getStats: vi.fn().mockReturnValue({
        totalTokens: 160000,
        tokenLimit: 200000,
        usagePercentage: 80,
      }),
      reset: vi.fn(),
    } as unknown as SessionTokenTracker;

    monitor = new SessionContextMonitor(mockTokenTracker);
  });

  it('should check session health and detect token warnings', () => {
    const health = monitor.checkSessionHealth();

    expect(health.status).toBe('warning');
    expect(health.tokenUsagePercentage).toBe(80);
    expect(health.warnings).toContainEqual(
      expect.objectContaining({
        type: 'token-threshold',
        level: 'warning',
      })
    );
  });

  it('should suggest context reload when critical threshold reached', () => {
    // Mock critical threshold (90%)
    vi.mocked(mockTokenTracker.getUsagePercentage).mockReturnValue(90);
    vi.mocked(mockTokenTracker.checkThresholds).mockReturnValue([
      {
        threshold: 90,
        level: 'critical',
        tokensUsed: 180000,
        tokensRemaining: 20000,
        message: 'Session token usage at 90%',
      },
    ]);

    const health = monitor.checkSessionHealth();

    expect(health.status).toBe('critical');
    expect(health.recommendations).toContainEqual(
      expect.objectContaining({
        action: 'reload-claude-md',
        priority: 'critical',
      })
    );
  });

  it('should track quality degradation patterns', () => {
    // Need at least 6 scores: 3 previous + 3 recent
    monitor.recordQualityScore(0.9);
    monitor.recordQualityScore(0.88);
    monitor.recordQualityScore(0.87);
    monitor.recordQualityScore(0.75); // Start of decline
    monitor.recordQualityScore(0.72);
    monitor.recordQualityScore(0.7); // Significant drop (>15%)

    const health = monitor.checkSessionHealth();

    expect(health.warnings).toContainEqual(
      expect.objectContaining({
        type: 'quality-degradation',
      })
    );
  });
});
