/**
 * Global Setup for E2E Tests
 *
 * Ensures GlobalResourcePool is properly initialized and cleaned up
 * for all E2E tests. This provides baseline protection against
 * resource leaks even if individual tests don't explicitly manage resources.
 *
 * Part of Solution C (Hybrid Approach) - Phase 1
 */

import { GlobalResourcePool } from '../../src/orchestrator/GlobalResourcePool.js';
import { logger } from '../../src/utils/logger.js';

/**
 * Global setup - runs once before all tests
 */
export async function setup() {
  logger.info('[E2E Global Setup] Initializing GlobalResourcePool...');

  // Initialize the singleton instance
  const pool = GlobalResourcePool.getInstance({
    maxConcurrentE2E: 1,        // Only 1 E2E test at a time
    e2eWaitTimeout: 300000,     // 5 minutes timeout
    staleCheckInterval: 60000,  // Check for stale locks every minute
    staleLockThreshold: 1800000 // 30 minutes threshold
  });

  // Log initial status
  const status = pool.getStatus();
  logger.info('[E2E Global Setup] GlobalResourcePool initialized:', status);

  return async () => {
    // This function is called after all tests complete
    logger.info('[E2E Global Teardown] Cleaning up GlobalResourcePool...');

    // Get final status before cleanup
    const finalStatus = pool.getStatus();

    // Check for resource leaks
    if (finalStatus.e2e.active > 0) {
      logger.warn('[E2E Global Teardown] Resource leak detected!', {
        activeSlots: finalStatus.e2e.active,
        slots: finalStatus.e2e.slots,
      });
    }

    // Clean up the resource pool
    pool.cleanup();

    // Reset the singleton instance
    GlobalResourcePool.resetInstance();

    logger.info('[E2E Global Teardown] Cleanup complete');
  };
}

/**
 * Global teardown - runs once after all tests
 * (Already handled by the function returned from setup())
 */
export async function teardown() {
  // Teardown logic is handled by the function returned from setup()
  // This is here for compatibility with Vitest's globalTeardown
  logger.info('[E2E Global Teardown] Explicit teardown called');
}
