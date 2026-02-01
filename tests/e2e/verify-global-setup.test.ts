/**
 * Verification Test for Global Setup
 *
 * This test verifies that the global setup correctly initializes
 * and manages the GlobalResourcePool.
 */

import { describe, it, expect } from 'vitest';
import { GlobalResourcePool } from '../../src/orchestrator/GlobalResourcePool.js';

describe('Global Setup Verification', () => {
  it('should have GlobalResourcePool initialized', () => {
    // Global setup should have already initialized the pool
    const pool = GlobalResourcePool.getInstance();
    expect(pool).toBeDefined();
  });

  it('should have correct resource pool configuration', () => {
    const pool = GlobalResourcePool.getInstance();
    const status = pool.getStatus();

    // Verify E2E slot configuration
    expect(status.e2e.max).toBe(1);  // Only 1 concurrent E2E test
    expect(status.e2e.active).toBe(0);  // No active tests initially
    expect(status.e2e.waiting).toBe(0);  // No waiting tests
  });

  it('should be able to generate resource pool report', async () => {
    const pool = GlobalResourcePool.getInstance();
    const report = await pool.generateReport();

    expect(report).toBeDefined();
    expect(typeof report).toBe('string');
    expect(report).toContain('GLOBAL RESOURCE POOL STATUS');
    expect(report).toContain('E2E Tests:');
  });

  it('should track resource pool status', () => {
    const pool = GlobalResourcePool.getInstance();
    const status = pool.getStatus();

    // Verify status structure
    expect(status).toHaveProperty('e2e');
    expect(status).toHaveProperty('builds');
    expect(status.e2e).toHaveProperty('active');
    expect(status.e2e).toHaveProperty('max');
    expect(status.e2e).toHaveProperty('waiting');
    expect(status.e2e).toHaveProperty('slots');
  });
});
