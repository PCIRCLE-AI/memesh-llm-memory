/**
 * E2E Testing Helper Functions
 *
 * Provides convenient wrappers for E2E resource management using GlobalResourcePool.
 * Part of Solution C (Hybrid Approach) - Phase 2
 *
 * @example
 * ```typescript
 * // Simple wrapper (recommended)
 * it('should work', withE2EResource(async () => {
 *   // Test code automatically protected
 * }));
 *
 * // Manual control (advanced)
 * describe('Custom control', () => {
 *   let resourceId: string;
 *   beforeAll(async () => {
 *     resourceId = await acquireE2EResource();
 *   });
 *   afterAll(async () => {
 *     await releaseE2EResource(resourceId);
 *   });
 * });
 * ```
 */

import { randomBytes } from 'crypto';
import { acquireE2ESlot, releaseE2ESlot, GlobalResourcePool } from '../../src/orchestrator/GlobalResourcePool.js';
import { logger } from '../../src/utils/logger.js';

/**
 * Generate unique resource ID for testing
 */
function generateResourceId(prefix: string = 'test'): string {
  return `${prefix}-${randomBytes(4).toString('hex')}`;
}

/**
 * Acquire E2E resource slot
 *
 * Manually acquire an E2E resource slot from GlobalResourcePool.
 * You MUST call `releaseE2EResource()` in a finally block or afterAll hook.
 *
 * @param resourceId Optional custom resource ID (auto-generated if not provided)
 * @returns Resource ID (use this to release the resource later)
 *
 * @example
 * ```typescript
 * describe('Manual resource control', () => {
 *   let resourceId: string;
 *
 *   beforeAll(async () => {
 *     resourceId = await acquireE2EResource();
 *   });
 *
 *   afterAll(async () => {
 *     await releaseE2EResource(resourceId);
 *   });
 *
 *   it('test 1', async () => { ... });
 *   it('test 2', async () => { ... });
 * });
 * ```
 */
export async function acquireE2EResource(resourceId?: string): Promise<string> {
  const id = resourceId || generateResourceId('test');

  logger.info(`[E2E Helper] Acquiring resource slot: ${id}`);

  try {
    await acquireE2ESlot(id);
    logger.info(`[E2E Helper] Resource slot acquired: ${id}`);
    return id;
  } catch (error) {
    logger.error(`[E2E Helper] Failed to acquire resource slot: ${id}`, error);
    throw error;
  }
}

/**
 * Release E2E resource slot
 *
 * Releases a previously acquired E2E resource slot.
 * Should be called in a finally block or afterAll hook.
 *
 * @param resourceId Resource ID returned from acquireE2EResource()
 *
 * @example
 * ```typescript
 * let resourceId: string;
 *
 * beforeAll(async () => {
 *   resourceId = await acquireE2EResource();
 * });
 *
 * afterAll(async () => {
 *   await releaseE2EResource(resourceId);
 * });
 * ```
 */
export function releaseE2EResource(resourceId: string): void {
  logger.info(`[E2E Helper] Releasing resource slot: ${resourceId}`);

  try {
    releaseE2ESlot(resourceId);
    logger.info(`[E2E Helper] Resource slot released: ${resourceId}`);
  } catch (error) {
    logger.error(`[E2E Helper] Failed to release resource slot: ${resourceId}`, error);
    // Don't throw - we want cleanup to continue even if release fails
  }
}

/**
 * Wrapper for E2E tests with automatic resource management
 *
 * Automatically acquires an E2E resource slot before running the test
 * and releases it afterwards (even if the test fails).
 *
 * This is the RECOMMENDED way to use E2E resource management.
 *
 * @param testFn Test function to wrap
 * @returns Wrapped test function with resource management
 *
 * @example
 * ```typescript
 * it('should do something', withE2EResource(async () => {
 *   // Your test code here
 *   const server = new A2AServer({...});
 *   await server.start();
 *   // ... test logic
 *   // Resource is automatically released even if test fails
 * }));
 * ```
 */
export function withE2EResource<T = void>(
  testFn: () => Promise<T>
): () => Promise<T> {
  return async () => {
    const resourceId = generateResourceId('test');

    logger.info(`[E2E Helper] Test starting with resource: ${resourceId}`);

    let acquired = false;

    try {
      // Acquire resource
      await acquireE2ESlot(resourceId);
      acquired = true;
      logger.info(`[E2E Helper] Resource acquired for test: ${resourceId}`);

      // Run test
      const result = await testFn();

      logger.info(`[E2E Helper] Test completed successfully: ${resourceId}`);
      return result;
    } catch (error) {
      logger.error(`[E2E Helper] Test failed: ${resourceId}`, error);
      throw error;
    } finally {
      // Always release resource
      if (acquired) {
        try {
          releaseE2ESlot(resourceId);
          logger.info(`[E2E Helper] Resource released after test: ${resourceId}`);
        } catch (releaseError) {
          logger.error(
            `[E2E Helper] Failed to release resource after test: ${resourceId}`,
            releaseError
          );
          // Don't throw - test result is more important
        }
      }
    }
  };
}

/**
 * Wrapper for E2E tests requiring multiple resource slots
 *
 * Acquires multiple E2E resource slots and passes them to the test function.
 * Useful for multi-agent coordination tests.
 *
 * @param count Number of resource slots to acquire
 * @param testFn Test function that receives the resource IDs
 * @returns Wrapped test function with multi-resource management
 *
 * @example
 * ```typescript
 * it('should coordinate multiple agents', withE2EResources(2, async (slots) => {
 *   const [slot1, slot2] = slots;
 *
 *   const server1 = new A2AServer({ agentId: slot1, ... });
 *   const server2 = new A2AServer({ agentId: slot2, ... });
 *
 *   await server1.start();
 *   await server2.start();
 *   // ... multi-agent test logic
 * }));
 * ```
 */
export function withE2EResources<T = void>(
  count: number,
  testFn: (slots: string[]) => Promise<T>
): () => Promise<T> {
  if (count < 1) {
    throw new Error('withE2EResources: count must be at least 1');
  }

  return async () => {
    // ✅ FIX: Deadlock prevention - check if requested count exceeds max concurrent
    const pool = GlobalResourcePool.getInstance();
    const status = pool.getStatus();
    const maxConcurrent = status.e2e.max;

    if (count > maxConcurrent) {
      throw new Error(
        `withE2EResources: Deadlock detected! Requested ${count} resources but maxConcurrentE2E is ${maxConcurrent}. ` +
        `This would cause deadlock as the test would wait indefinitely for resources that can never be acquired. ` +
        `Either reduce the number of resources needed (count <= ${maxConcurrent}) or increase maxConcurrentE2E in global setup.`
      );
    }

    const resourceIds: string[] = [];
    const acquiredIds: string[] = [];

    logger.info(`[E2E Helper] Test starting with ${count} resources`);

    try {
      // Generate IDs
      for (let i = 0; i < count; i++) {
        resourceIds.push(generateResourceId(`test-${i + 1}`));
      }

      // Acquire all resources
      for (const id of resourceIds) {
        await acquireE2ESlot(id);
        acquiredIds.push(id);
        logger.info(`[E2E Helper] Resource acquired: ${id} (${acquiredIds.length}/${count})`);
      }

      // Run test
      const result = await testFn(resourceIds);

      logger.info(`[E2E Helper] Multi-resource test completed successfully`);
      return result;
    } catch (error) {
      logger.error(`[E2E Helper] Multi-resource test failed`, error);
      throw error;
    } finally {
      // Release all acquired resources
      for (const id of acquiredIds) {
        try {
          releaseE2ESlot(id);
          logger.info(`[E2E Helper] Resource released: ${id}`);
        } catch (releaseError) {
          logger.error(`[E2E Helper] Failed to release resource: ${id}`, releaseError);
          // Continue releasing other resources
        }
      }
    }
  };
}

/**
 * Type definitions for test functions
 */
export type TestFunction<T = void> = () => Promise<T>;
export type ResourceTestFunction<T = void> = (resourceId: string) => Promise<T>;
export type MultiResourceTestFunction<T = void> = (resourceIds: string[]) => Promise<T>;
