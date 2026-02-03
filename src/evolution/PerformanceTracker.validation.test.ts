/**
 * PerformanceTracker - Additional Validation Tests
 *
 * Tests for NaN/Infinity validation in track() and getMetrics()
 * Complements existing PerformanceTracker.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PerformanceTracker } from './PerformanceTracker.js';

describe('PerformanceTracker - Additional Validation', () => {
  describe('constructor config validation', () => {
    it('should accept valid config', () => {
      const tracker = new PerformanceTracker({
        maxMetricsPerAgent: 500,
        maxTotalMetrics: 5000,
      });
      expect(tracker).toBeDefined();
    });

    it('should reject NaN maxMetricsPerAgent', () => {
      expect(() => {
        new PerformanceTracker({ maxMetricsPerAgent: NaN });
      }).toThrow('maxMetricsPerAgent must be finite');
    });

    it('should reject Infinity maxMetricsPerAgent', () => {
      expect(() => {
        new PerformanceTracker({ maxMetricsPerAgent: Infinity });
      }).toThrow('maxMetricsPerAgent must be finite');
    });

    it('should reject non-integer maxMetricsPerAgent', () => {
      expect(() => {
        new PerformanceTracker({ maxMetricsPerAgent: 100.5 });
      }).toThrow('maxMetricsPerAgent must be a positive integer');
    });

    it('should reject negative maxMetricsPerAgent', () => {
      expect(() => {
        new PerformanceTracker({ maxMetricsPerAgent: -10 });
      }).toThrow('maxMetricsPerAgent must be a positive integer');
    });

    it('should reject zero maxMetricsPerAgent', () => {
      expect(() => {
        new PerformanceTracker({ maxMetricsPerAgent: 0 });
      }).toThrow('maxMetricsPerAgent must be a positive integer');
    });

    it('should reject NaN maxTotalMetrics', () => {
      expect(() => {
        new PerformanceTracker({ maxTotalMetrics: NaN });
      }).toThrow('maxTotalMetrics must be finite');
    });

    it('should reject Infinity maxTotalMetrics', () => {
      expect(() => {
        new PerformanceTracker({ maxTotalMetrics: Infinity });
      }).toThrow('maxTotalMetrics must be finite');
    });

    it('should reject non-integer maxTotalMetrics', () => {
      expect(() => {
        new PerformanceTracker({ maxTotalMetrics: 5000.7 });
      }).toThrow('maxTotalMetrics must be a positive integer');
    });
  });

  describe('track() numeric validation', () => {
    let tracker: PerformanceTracker;

    beforeEach(() => {
      tracker = new PerformanceTracker();
    });

    describe('durationMs validation', () => {
      it('should reject NaN durationMs', () => {
        expect(() => {
          tracker.track({
            agentId: 'agent-1',
            taskType: 'test',
            durationMs: NaN,
            cost: 0.5,
            qualityScore: 0.8,
            success: true,
          });
        }).toThrow('durationMs must be a finite number');
      });

      it('should reject Infinity durationMs', () => {
        expect(() => {
          tracker.track({
            agentId: 'agent-1',
            taskType: 'test',
            durationMs: Infinity,
            cost: 0.5,
            qualityScore: 0.8,
            success: true,
          });
        }).toThrow('durationMs must be a finite number');
      });

      it('should reject negative durationMs', () => {
        expect(() => {
          tracker.track({
            agentId: 'agent-1',
            taskType: 'test',
            durationMs: -100,
            cost: 0.5,
            qualityScore: 0.8,
            success: true,
          });
        }).toThrow('durationMs must be non-negative');
      });

      it('should accept zero durationMs', () => {
        const result = tracker.track({
          agentId: 'agent-1',
          taskType: 'test',
          durationMs: 0,
          cost: 0.5,
          qualityScore: 0.8,
          success: true,
        });
        expect(result.durationMs).toBe(0);
      });
    });

    describe('cost validation', () => {
      it('should reject NaN cost', () => {
        expect(() => {
          tracker.track({
            agentId: 'agent-1',
            taskType: 'test',
            durationMs: 100,
            cost: NaN,
            qualityScore: 0.8,
            success: true,
          });
        }).toThrow('cost must be a finite number');
      });

      it('should reject Infinity cost', () => {
        expect(() => {
          tracker.track({
            agentId: 'agent-1',
            taskType: 'test',
            durationMs: 100,
            cost: Infinity,
            qualityScore: 0.8,
            success: true,
          });
        }).toThrow('cost must be a finite number');
      });

      it('should reject negative cost', () => {
        expect(() => {
          tracker.track({
            agentId: 'agent-1',
            taskType: 'test',
            durationMs: 100,
            cost: -0.5,
            qualityScore: 0.8,
            success: true,
          });
        }).toThrow('cost must be non-negative');
      });

      it('should accept zero cost', () => {
        const result = tracker.track({
          agentId: 'agent-1',
          taskType: 'test',
          durationMs: 100,
          cost: 0,
          qualityScore: 0.8,
          success: true,
        });
        expect(result.cost).toBe(0);
      });
    });

    describe('qualityScore validation', () => {
      it('should reject NaN qualityScore', () => {
        expect(() => {
          tracker.track({
            agentId: 'agent-1',
            taskType: 'test',
            durationMs: 100,
            cost: 0.5,
            qualityScore: NaN,
            success: true,
          });
        }).toThrow('qualityScore must be a finite number');
      });

      it('should reject Infinity qualityScore', () => {
        expect(() => {
          tracker.track({
            agentId: 'agent-1',
            taskType: 'test',
            durationMs: 100,
            cost: 0.5,
            qualityScore: Infinity,
            success: true,
          });
        }).toThrow('qualityScore must be a finite number');
      });

      it('should reject negative qualityScore', () => {
        expect(() => {
          tracker.track({
            agentId: 'agent-1',
            taskType: 'test',
            durationMs: 100,
            cost: 0.5,
            qualityScore: -0.1,
            success: true,
          });
        }).toThrow('qualityScore must be between 0 and 1');
      });

      it('should reject qualityScore > 1', () => {
        expect(() => {
          tracker.track({
            agentId: 'agent-1',
            taskType: 'test',
            durationMs: 100,
            cost: 0.5,
            qualityScore: 1.5,
            success: true,
          });
        }).toThrow('qualityScore must be between 0 and 1');
      });

      it('should accept qualityScore = 0', () => {
        const result = tracker.track({
          agentId: 'agent-1',
          taskType: 'test',
          durationMs: 100,
          cost: 0.5,
          qualityScore: 0,
          success: false,
        });
        expect(result.qualityScore).toBe(0);
      });

      it('should accept qualityScore = 1', () => {
        const result = tracker.track({
          agentId: 'agent-1',
          taskType: 'test',
          durationMs: 100,
          cost: 0.5,
          qualityScore: 1.0,
          success: true,
        });
        expect(result.qualityScore).toBe(1.0);
      });
    });
  });

  describe('getMetrics() filter.limit validation', () => {
    let tracker: PerformanceTracker;

    beforeEach(() => {
      tracker = new PerformanceTracker();

      // Add test metrics
      for (let i = 0; i < 10; i++) {
        tracker.track({
          agentId: 'agent-1',
          taskType: 'test',
          durationMs: 100 + i,
          cost: 0.5,
          qualityScore: 0.8,
          success: true,
        });
      }
    });

    it('should accept valid positive integer limit', () => {
      const metrics = tracker.getMetrics('agent-1', { limit: 5 });
      expect(metrics).toHaveLength(5);
    });

    it('should reject NaN limit', () => {
      expect(() => {
        tracker.getMetrics('agent-1', { limit: NaN });
      }).toThrow('filter.limit must be a finite number');
    });

    it('should reject Infinity limit', () => {
      expect(() => {
        tracker.getMetrics('agent-1', { limit: Infinity });
      }).toThrow('filter.limit must be a finite number');
    });

    it('should reject non-integer limit', () => {
      expect(() => {
        tracker.getMetrics('agent-1', { limit: 5.5 });
      }).toThrow('filter.limit must be a positive integer');
    });

    it('should reject negative limit', () => {
      expect(() => {
        tracker.getMetrics('agent-1', { limit: -5 });
      }).toThrow('filter.limit must be a positive integer');
    });

    it('should reject zero limit', () => {
      expect(() => {
        tracker.getMetrics('agent-1', { limit: 0 });
      }).toThrow('filter.limit must be a positive integer');
    });
  });

  describe('edge cases', () => {
    it('should handle very large finite values', () => {
      const tracker = new PerformanceTracker();
      const result = tracker.track({
        agentId: 'agent-1',
        taskType: 'test',
        durationMs: Number.MAX_SAFE_INTEGER,
        cost: Number.MAX_VALUE,
        qualityScore: 0.999999,
        success: true,
      });
      expect(result).toBeDefined();
    });

    it('should handle very small positive values', () => {
      const tracker = new PerformanceTracker();
      const result = tracker.track({
        agentId: 'agent-1',
        taskType: 'test',
        durationMs: Number.MIN_VALUE,
        cost: Number.MIN_VALUE,
        qualityScore: Number.MIN_VALUE,
        success: true,
      });
      expect(result).toBeDefined();
    });
  });
});
