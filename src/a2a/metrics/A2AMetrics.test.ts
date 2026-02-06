/**
 * A2AMetrics - Validation Tests
 *
 * Tests for NaN/Infinity validation and LRU eviction in metric methods
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { A2AMetrics } from './A2AMetrics.js';
import { logger } from '../../utils/logger.js';

describe('A2AMetrics - Validation', () => {
  let metrics: A2AMetrics;

  beforeEach(() => {
    metrics = A2AMetrics.getInstance();
    metrics.clear();
    metrics.setEnabled(true);
  });

  afterEach(() => {
    A2AMetrics.resetInstance();
  });

  describe('incrementCounter', () => {
    it('should accept valid positive values', () => {
      metrics.incrementCounter('test.counter', {}, 5);
      expect(metrics.getValue('test.counter')).toBe(5);

      metrics.incrementCounter('test.counter', {}, 3);
      expect(metrics.getValue('test.counter')).toBe(8);
    });

    it('should accept zero', () => {
      metrics.incrementCounter('test.counter', {}, 0);
      expect(metrics.getValue('test.counter')).toBe(0);
    });

    it('should reject NaN', () => {
      metrics.incrementCounter('test.counter', {}, NaN);
      expect(metrics.getValue('test.counter')).toBeUndefined();
    });

    it('should reject Infinity', () => {
      metrics.incrementCounter('test.counter', {}, Infinity);
      expect(metrics.getValue('test.counter')).toBeUndefined();
    });

    it('should reject negative Infinity', () => {
      metrics.incrementCounter('test.counter', {}, -Infinity);
      expect(metrics.getValue('test.counter')).toBeUndefined();
    });

    it('should reject negative values', () => {
      metrics.incrementCounter('test.counter', {}, -5);
      expect(metrics.getValue('test.counter')).toBeUndefined();
    });
  });

  describe('setGauge', () => {
    it('should accept valid positive values', () => {
      metrics.setGauge('test.gauge', 42);
      expect(metrics.getValue('test.gauge')).toBe(42);
    });

    it('should accept zero', () => {
      metrics.setGauge('test.gauge', 0);
      expect(metrics.getValue('test.gauge')).toBe(0);
    });

    it('should accept negative values (gauges can be negative)', () => {
      metrics.setGauge('test.gauge', -10);
      expect(metrics.getValue('test.gauge')).toBe(-10);
    });

    it('should reject NaN', () => {
      metrics.setGauge('test.gauge', NaN);
      expect(metrics.getValue('test.gauge')).toBeUndefined();
    });

    it('should reject Infinity', () => {
      metrics.setGauge('test.gauge', Infinity);
      expect(metrics.getValue('test.gauge')).toBeUndefined();
    });

    it('should reject negative Infinity', () => {
      metrics.setGauge('test.gauge', -Infinity);
      expect(metrics.getValue('test.gauge')).toBeUndefined();
    });
  });

  describe('recordHistogram', () => {
    it('should accept valid positive values', () => {
      metrics.recordHistogram('test.histogram', 1500);
      expect(metrics.getValue('test.histogram')).toBe(1500);
    });

    it('should accept zero', () => {
      metrics.recordHistogram('test.histogram', 0);
      expect(metrics.getValue('test.histogram')).toBe(0);
    });

    it('should reject NaN', () => {
      metrics.recordHistogram('test.histogram', NaN);
      expect(metrics.getValue('test.histogram')).toBeUndefined();
    });

    it('should reject Infinity', () => {
      metrics.recordHistogram('test.histogram', Infinity);
      expect(metrics.getValue('test.histogram')).toBeUndefined();
    });

    it('should reject negative Infinity', () => {
      metrics.recordHistogram('test.histogram', -Infinity);
      expect(metrics.getValue('test.histogram')).toBeUndefined();
    });

    it('should reject negative values', () => {
      metrics.recordHistogram('test.histogram', -100);
      expect(metrics.getValue('test.histogram')).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle very large but finite numbers', () => {
      const largeNumber = Number.MAX_SAFE_INTEGER;
      metrics.incrementCounter('test.counter', {}, largeNumber);
      expect(metrics.getValue('test.counter')).toBe(largeNumber);
    });

    it('should handle very small positive numbers', () => {
      const smallNumber = Number.MIN_VALUE;
      metrics.setGauge('test.gauge', smallNumber);
      expect(metrics.getValue('test.gauge')).toBe(smallNumber);
    });

    it('should handle decimal values', () => {
      metrics.recordHistogram('test.histogram', 123.456);
      expect(metrics.getValue('test.histogram')).toBe(123.456);
    });
  });

  describe('LRU eviction', () => {
    it('should maintain metrics under the limit', () => {
      // Add some metrics
      for (let i = 0; i < 100; i++) {
        metrics.incrementCounter('test.counter', { id: `${i}` });
      }

      const snapshot = metrics.getSnapshot();
      expect(snapshot.size).toBe(100);
    });

    it('should update access order on metric update', () => {
      // Create metrics in order
      metrics.incrementCounter('test.counter', { id: '1' });
      metrics.incrementCounter('test.counter', { id: '2' });
      metrics.incrementCounter('test.counter', { id: '3' });

      // Access the first one again to move it to end of LRU
      metrics.incrementCounter('test.counter', { id: '1' });

      // All metrics should still exist
      expect(metrics.getValue('test.counter', { id: '1' })).toBe(2);
      expect(metrics.getValue('test.counter', { id: '2' })).toBe(1);
      expect(metrics.getValue('test.counter', { id: '3' })).toBe(1);
    });

    it('should clear access order when metrics are cleared', () => {
      metrics.incrementCounter('test.counter', { id: '1' });
      metrics.incrementCounter('test.counter', { id: '2' });

      metrics.clear();

      const snapshot = metrics.getSnapshot();
      expect(snapshot.size).toBe(0);
    });
  });

  describe('label cardinality validation', () => {
    it('should warn when too many labels are provided', () => {
      const warnSpy = vi.spyOn(logger, 'warn');

      // Create labels object with more than 10 labels
      const manyLabels: Record<string, string> = {};
      for (let i = 0; i < 15; i++) {
        manyLabels[`label${i}`] = `value${i}`;
      }

      metrics.incrementCounter('test.counter', manyLabels);

      expect(warnSpy).toHaveBeenCalledWith(
        '[A2A Metrics] Too many labels may cause high cardinality',
        expect.objectContaining({
          labelCount: 15,
          maxRecommended: 10,
        })
      );

      warnSpy.mockRestore();
    });

    it('should not warn when label count is within limit', () => {
      const warnSpy = vi.spyOn(logger, 'warn');

      const fewLabels: Record<string, string> = {
        agent: 'agent-1',
        status: 'completed',
      };

      metrics.incrementCounter('test.counter', fewLabels);

      // Should not have been called with the cardinality warning
      expect(warnSpy).not.toHaveBeenCalledWith(
        '[A2A Metrics] Too many labels may cause high cardinality',
        expect.anything()
      );

      warnSpy.mockRestore();
    });
  });
});
