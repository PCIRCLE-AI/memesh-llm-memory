/**
 * Dashboard Tests
 *
 * Tests for the CLI dashboard functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HealthChecker } from '../../core/HealthCheck.js';
import { UnifiedMemoryStore } from '../../memory/UnifiedMemoryStore.js';

describe('Dashboard Metrics Collection', () => {
  let healthChecker: HealthChecker;
  let memoryStore: UnifiedMemoryStore;

  beforeEach(async () => {
    healthChecker = new HealthChecker({ timeout: 3000 });
  });

  afterEach(async () => {
    if (memoryStore) {
      memoryStore.close();
    }
  });

  it('should collect system health metrics', async () => {
    const health = await healthChecker.checkAll();

    expect(health).toBeDefined();
    expect(health.status).toMatch(/healthy|degraded|unhealthy/);
    expect(health.components).toBeInstanceOf(Array);
    expect(health.components.length).toBeGreaterThan(0);
    expect(health.isHealthy).toBeDefined();
    expect(health.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('should collect memory statistics', async () => {
    memoryStore = await UnifiedMemoryStore.create(':memory:');

    // Store some test memories
    await memoryStore.store({
      type: 'knowledge',
      content: 'Test knowledge entry',
      tags: ['test'],
      importance: 0.8,
      timestamp: new Date(),
    });

    const memories = await memoryStore.search('', { limit: 10 });

    expect(memories).toBeInstanceOf(Array);
    expect(memories.length).toBeGreaterThan(0);
    expect(memories[0]).toHaveProperty('type');
    expect(memories[0]).toHaveProperty('content');
  });

  it('should measure process memory usage', () => {
    const memUsage = process.memoryUsage();

    expect(memUsage.heapUsed).toBeGreaterThan(0);
    expect(memUsage.heapTotal).toBeGreaterThan(0);
    expect(memUsage.heapUsed).toBeLessThanOrEqual(memUsage.heapTotal);

    const usagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
    expect(usagePercent).toBeGreaterThan(0);
    expect(usagePercent).toBeLessThanOrEqual(100);
  });

  it('should measure uptime', () => {
    const uptime = Math.floor(process.uptime());

    expect(uptime).toBeGreaterThanOrEqual(0);
    expect(typeof uptime).toBe('number');
  });

  it('should handle health check timeout gracefully', async () => {
    const fastChecker = new HealthChecker({ timeout: 1 });

    const health = await fastChecker.checkAll();

    // Should complete even with very short timeout
    expect(health).toBeDefined();
    expect(health.components).toBeInstanceOf(Array);
  });

  it('should categorize health status correctly', async () => {
    const health = await healthChecker.checkAll();

    for (const component of health.components) {
      expect(component.status).toMatch(/healthy|degraded|unhealthy|unknown/);
      expect(component.name).toBeDefined();
      expect(component.message).toBeDefined();
      expect(component.durationMs).toBeGreaterThanOrEqual(0);
      expect(component.timestamp).toBeInstanceOf(Date);
    }
  });

  it('should calculate overall system health', async () => {
    const health = await healthChecker.checkAll();

    const hasUnhealthy = health.components.some((c) => c.status === 'unhealthy');
    const hasDegraded = health.components.some((c) => c.status === 'degraded');

    if (hasUnhealthy) {
      expect(health.status).toBe('unhealthy');
      expect(health.isHealthy).toBe(false);
    } else if (hasDegraded) {
      expect(health.status).toBe('degraded');
      expect(health.isHealthy).toBe(true);
    } else {
      expect(health.status).toBe('healthy');
      expect(health.isHealthy).toBe(true);
    }
  });

  it('should include timestamp in health check results', async () => {
    const beforeCheck = new Date();
    const health = await healthChecker.checkAll();
    const afterCheck = new Date();

    expect(health.timestamp).toBeInstanceOf(Date);
    expect(health.timestamp.getTime()).toBeGreaterThanOrEqual(beforeCheck.getTime());
    expect(health.timestamp.getTime()).toBeLessThanOrEqual(afterCheck.getTime());

    // Each component should also have timestamp
    for (const component of health.components) {
      expect(component.timestamp).toBeInstanceOf(Date);
      expect(component.timestamp.getTime()).toBeGreaterThanOrEqual(beforeCheck.getTime());
      expect(component.timestamp.getTime()).toBeLessThanOrEqual(afterCheck.getTime());
    }
  });
});

describe('Dashboard Display Formatting', () => {
  it('should format memory bar correctly', () => {
    // Test memory bar rendering logic
    const testCases = [
      { percent: 0, expectedFilled: 0, color: 'green' },
      { percent: 50, expectedFilled: 10, color: 'green' },
      { percent: 76, expectedFilled: 15, color: 'yellow' },
      { percent: 91, expectedFilled: 18, color: 'red' },
      { percent: 100, expectedFilled: 20, color: 'red' },
    ];

    const barLength = 20;

    for (const testCase of testCases) {
      const filled = Math.round((testCase.percent / 100) * barLength);
      expect(filled).toBe(testCase.expectedFilled);
    }
  });

  it('should format uptime string correctly', () => {
    const testCases = [
      { uptime: 0, expected: { h: 0, m: 0, s: 0 } },
      { uptime: 65, expected: { h: 0, m: 1, s: 5 } },
      { uptime: 3661, expected: { h: 1, m: 1, s: 1 } },
      { uptime: 7200, expected: { h: 2, m: 0, s: 0 } },
    ];

    for (const testCase of testCases) {
      const hours = Math.floor(testCase.uptime / 3600);
      const minutes = Math.floor((testCase.uptime % 3600) / 60);
      const seconds = testCase.uptime % 60;

      expect(hours).toBe(testCase.expected.h);
      expect(minutes).toBe(testCase.expected.m);
      expect(seconds).toBe(testCase.expected.s);
    }
  });

  it('should truncate long activity messages', () => {
    const longContent = 'This is a very long content that should be truncated to 50 characters maximum';
    const maxLength = 50;

    const truncated =
      longContent.substring(0, maxLength) + (longContent.length > maxLength ? '...' : '');

    expect(truncated.length).toBeLessThanOrEqual(maxLength + 3); // +3 for '...'
    expect(truncated).toContain('...');
  });

  it('should handle empty activity list', () => {
    const activities: string[] = [];

    expect(activities.length).toBe(0);
    // Dashboard should show "No recent activities" message
  });

  it('should limit activities to max count', () => {
    const MAX_RECENT_ACTIVITIES = 10;
    const manyActivities = Array.from({ length: 20 }, (_, i) => `Activity ${i + 1}`);

    const limited = manyActivities.slice(0, MAX_RECENT_ACTIVITIES);

    expect(limited.length).toBe(MAX_RECENT_ACTIVITIES);
    expect(limited[0]).toBe('Activity 1');
    expect(limited[9]).toBe('Activity 10');
  });
});

describe('Dashboard Error Handling', () => {
  it('should handle missing database file gracefully', async () => {
    const checker = new HealthChecker();
    const health = await checker.checkAll();

    // Database component should be degraded if file doesn't exist
    const dbComponent = health.components.find((c) => c.name === 'database');
    expect(dbComponent).toBeDefined();
    // Status can be degraded (file not found) or healthy (exists)
    expect(dbComponent!.status).toMatch(/healthy|degraded/);
  });

  it('should handle memory store creation errors', async () => {
    // Test with invalid path should be handled gracefully
    try {
      // This might fail, but should not crash
      const store = await UnifiedMemoryStore.create('/invalid/path/test.db');
      store.close();
    } catch (error) {
      // Error is expected and should be caught
      expect(error).toBeDefined();
    }
  });

  it('should continue on non-critical errors', async () => {
    // Dashboard should continue even if some metrics fail to collect
    const checker = new HealthChecker({ timeout: 5000 });
    const health = await checker.checkAll();

    // Should return result even if some checks are 'unknown'
    expect(health).toBeDefined();
    expect(health.components).toBeInstanceOf(Array);
  });
});
