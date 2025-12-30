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

  // CRITICAL Issue #1: Validation on recordQualityScore
  describe('recordQualityScore validation', () => {
    it('should throw error for negative score', () => {
      expect(() => monitor.recordQualityScore(-0.1)).toThrow(
        'Quality score must be a finite number between 0 and 1'
      );
    });

    it('should throw error for NaN score', () => {
      expect(() => monitor.recordQualityScore(NaN)).toThrow(
        'Quality score must be a finite number between 0 and 1'
      );
    });

    it('should throw error for Infinity score', () => {
      expect(() => monitor.recordQualityScore(Infinity)).toThrow(
        'Quality score must be a finite number between 0 and 1'
      );
    });

    it('should throw error for score > 1', () => {
      expect(() => monitor.recordQualityScore(1.5)).toThrow(
        'Quality score must be a finite number between 0 and 1'
      );
    });
  });

  // CRITICAL Issue #2: Constructor validation
  it('should throw error for null tokenTracker', () => {
    expect(() => new SessionContextMonitor(null as any)).toThrow(
      'SessionTokenTracker is required'
    );
  });

  it('should throw error for undefined tokenTracker', () => {
    expect(() => new SessionContextMonitor(undefined as any)).toThrow(
      'SessionTokenTracker is required'
    );
  });

  // IMPORTANT Issue #3: Division by zero guard
  it('should return null degradation when all previous scores are 0', () => {
    monitor.recordQualityScore(0);
    monitor.recordQualityScore(0);
    monitor.recordQualityScore(0);
    monitor.recordQualityScore(0.5);
    monitor.recordQualityScore(0.5);
    monitor.recordQualityScore(0.5);

    const health = monitor.checkSessionHealth();

    // Should not have quality-degradation warning
    const qualityWarnings = health.warnings.filter(
      (w) => w.type === 'quality-degradation'
    );
    expect(qualityWarnings).toHaveLength(0);
  });

  // IMPORTANT Issue #4: Additional coverage
  it('should handle multiple simultaneous warnings', () => {
    // Token warning + quality degradation
    monitor.recordQualityScore(0.9);
    monitor.recordQualityScore(0.88);
    monitor.recordQualityScore(0.87);
    monitor.recordQualityScore(0.7);
    monitor.recordQualityScore(0.68);
    monitor.recordQualityScore(0.65);

    const health = monitor.checkSessionHealth();

    expect(health.warnings.length).toBeGreaterThanOrEqual(2);
    expect(health.warnings.some((w) => w.type === 'token-threshold')).toBe(
      true
    );
    expect(health.warnings.some((w) => w.type === 'quality-degradation')).toBe(
      true
    );
  });

  it('should handle empty threshold warnings from tracker', () => {
    vi.mocked(mockTokenTracker.checkThresholds).mockReturnValue([]);
    vi.mocked(mockTokenTracker.getUsagePercentage).mockReturnValue(50);

    const health = monitor.checkSessionHealth();

    expect(health.status).toBe('healthy');
    expect(health.warnings).toHaveLength(0);
  });

  it('should handle error when tokenTracker.checkThresholds() throws', () => {
    vi.mocked(mockTokenTracker.checkThresholds).mockImplementation(() => {
      throw new Error('Tracker failure');
    });

    const health = monitor.checkSessionHealth();

    expect(health.status).toBe('critical');
    expect(health.warnings).toContainEqual(
      expect.objectContaining({
        type: 'system-error',
        level: 'critical',
        message: 'Token tracker error: Tracker failure',
      })
    );
  });

  it('should handle quality history at boundary (exactly 3 scores)', () => {
    monitor.recordQualityScore(0.9);
    monitor.recordQualityScore(0.85);
    monitor.recordQualityScore(0.8);

    const health = monitor.checkSessionHealth();

    // Should not detect degradation with only 3 scores (no previous)
    const qualityWarnings = health.warnings.filter(
      (w) => w.type === 'quality-degradation'
    );
    expect(qualityWarnings).toHaveLength(0);
  });

  it('should handle quality history at boundary (exactly 6 scores)', () => {
    monitor.recordQualityScore(0.9);
    monitor.recordQualityScore(0.88);
    monitor.recordQualityScore(0.87);
    monitor.recordQualityScore(0.7);
    monitor.recordQualityScore(0.68);
    monitor.recordQualityScore(0.65);

    const health = monitor.checkSessionHealth();

    // Should detect degradation with 6 scores (3 previous + 3 recent)
    const qualityWarnings = health.warnings.filter(
      (w) => w.type === 'quality-degradation'
    );
    expect(qualityWarnings.length).toBeGreaterThan(0);
  });

  it('should enforce exactly 10 max quality history', () => {
    // Add 15 scores
    for (let i = 0; i < 15; i++) {
      monitor.recordQualityScore(0.8);
    }

    const stats = monitor.getStats();
    expect(stats.qualityHistory.length).toBe(10);
  });

  it('should verify 15% degradation threshold calculation', () => {
    // Previous avg: 0.9, Recent avg: 0.76 (>15% drop, should trigger)
    // 0.9 * 0.85 = 0.765, so 0.76 < 0.765 should trigger warning
    monitor.recordQualityScore(0.9);
    monitor.recordQualityScore(0.9);
    monitor.recordQualityScore(0.9);
    monitor.recordQualityScore(0.76);
    monitor.recordQualityScore(0.76);
    monitor.recordQualityScore(0.76);

    const health = monitor.checkSessionHealth();

    const qualityWarnings = health.warnings.filter(
      (w) => w.type === 'quality-degradation'
    );
    expect(qualityWarnings.length).toBeGreaterThan(0);
  });

  it('should not detect degradation with insufficient data (<3 scores)', () => {
    monitor.recordQualityScore(0.5);
    monitor.recordQualityScore(0.3);

    const health = monitor.checkSessionHealth();

    const qualityWarnings = health.warnings.filter(
      (w) => w.type === 'quality-degradation'
    );
    expect(qualityWarnings).toHaveLength(0);
  });

  // IMPORTANT Issue #8: Timestamp consistency
  it('should use consistent timestamp for lastHealthCheck and return value', () => {
    const health = monitor.checkSessionHealth();
    const stats = monitor.getStats();

    expect(stats.lastHealthCheck).toBeDefined();
    // Allow 1ms tolerance
    const timeDiff = Math.abs(
      health.timestamp.getTime() - stats.lastHealthCheck!.getTime()
    );
    expect(timeDiff).toBeLessThanOrEqual(1);
  });
});
