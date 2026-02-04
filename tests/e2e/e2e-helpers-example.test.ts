/**
 * E2E Helper Functions - Usage Examples
 *
 * Demonstrates how to use the E2E helper functions for resource management.
 * These examples show best practices for different testing scenarios.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  withE2EResource,
  withE2EResources,
  acquireE2EResource,
  releaseE2EResource,
} from '../utils/e2e-helpers.js';
import { GlobalResourcePool } from '../../src/orchestrator/GlobalResourcePool.js';

describe('E2E Helper Functions - Usage Examples', () => {
  /**
   * Example 1: Simple Wrapper (Recommended)
   *
   * The easiest and most common way to use E2E resource management.
   * Resource is automatically acquired and released.
   */
  describe('Example 1: Simple Wrapper', () => {
    it(
      'should automatically manage resources',
      withE2EResource(async () => {
        // Resource is automatically acquired before this code runs
        const pool = GlobalResourcePool.getInstance();
        const status = pool.getStatus();

        // Verify we have a resource slot
        expect(status.e2e.active).toBeGreaterThan(0);

        // Your test code here
        // ...

        // Resource will be automatically released after this test
      })
    );

    it(
      'should release resource even if test fails',
      withE2EResource(async () => {
        // Resource is acquired
        const pool = GlobalResourcePool.getInstance();
        const initialActive = pool.getStatus().e2e.active;

        expect(initialActive).toBeGreaterThan(0);

        // Even if we throw an error, resource will be released
        // (Uncomment to test: throw new Error('Test error'))

        // Resource will be released in finally block
      })
    );
  });

  /**
   * Example 2: Manual Control (Advanced)
   *
   * For scenarios where you need more control over resource lifecycle,
   * such as sharing a resource across multiple tests.
   */
  describe('Example 2: Manual Control', () => {
    let resourceId: string;

    beforeAll(async () => {
      // Manually acquire resource before all tests
      resourceId = await acquireE2EResource();
    });

    afterAll(async () => {
      // Manually release resource after all tests
      releaseE2EResource(resourceId);
    });

    it('should use shared resource - test 1', async () => {
      expect(resourceId).toBeDefined();
      expect(typeof resourceId).toBe('string');

      const pool = GlobalResourcePool.getInstance();
      const status = pool.getStatus();
      expect(status.e2e.active).toBeGreaterThan(0);
    });

    it('should use shared resource - test 2', async () => {
      // Same resource is used across multiple tests
      expect(resourceId).toBeDefined();

      const pool = GlobalResourcePool.getInstance();
      const status = pool.getStatus();
      expect(status.e2e.active).toBeGreaterThan(0);
    });
  });

  /**
   * Example 3: Multi-Resource Coordination
   *
   * For tests that require multiple resource slots
   * (e.g., multi-agent coordination tests).
   *
   * ⚠️ SKIPPED: This test requires 2 E2E slots but maxConcurrentE2E = 1.
   * Requesting more resources than available would cause deadlock.
   * To enable this test, increase maxConcurrentE2E in global-setup.ts
   * (but be aware this may cause system resource issues).
   */
  describe.skip('Example 3: Multi-Resource Coordination', () => {
    it(
      'should manage multiple resources',
      withE2EResources(2, async (slots) => {
        // Receives array of resource IDs
        expect(slots).toBeDefined();
        expect(slots.length).toBe(2);
        expect(slots[0]).toBeDefined();
        expect(slots[1]).toBeDefined();

        // Destructure and verify individual slot IDs for multi-agent setup
        const [slot1, slot2] = slots;

        // Verify slots are unique and properly formatted
        expect(typeof slot1).toBe('string');
        expect(typeof slot2).toBe('string');
        expect(slot1).not.toBe(slot2); // Each slot should be unique

        // Example usage: Start two A2A servers with different agent IDs
        // const server1 = new A2AServer({ agentId: slot1, ... });
        // const server2 = new A2AServer({ agentId: slot2, ... });

        // All resources will be automatically released
      })
    );
  });

  /**
   * Example 4: Custom Resource ID
   *
   * For scenarios where you want to control the resource ID
   * (useful for debugging and logging).
   */
  describe('Example 4: Custom Resource ID', () => {
    let customResourceId: string;

    beforeAll(async () => {
      // Provide custom resource ID
      customResourceId = await acquireE2EResource('my-custom-test-resource');
    });

    afterAll(async () => {
      releaseE2EResource(customResourceId);
    });

    it('should use custom resource ID', async () => {
      expect(customResourceId).toBe('my-custom-test-resource');

      // Custom ID shows up in logs for easier debugging
    });
  });

  /**
   * Example 5: Error Handling
   *
   * Demonstrates proper error handling patterns.
   */
  describe('Example 5: Error Handling', () => {
    it(
      'should handle errors gracefully',
      withE2EResource(async () => {
        const pool = GlobalResourcePool.getInstance();
        const beforeStatus = pool.getStatus();

        expect(beforeStatus.e2e.active).toBeGreaterThan(0);

        try {
          // Your test logic that might throw
          // throw new Error('Simulated error');
        } catch (error) {
          // Handle test errors
          // Resource will still be released in finally block
          throw error; // Re-throw to fail the test
        }

        // If we reach here, test passed
        // Resource will be released automatically
      })
    );
  });
});
