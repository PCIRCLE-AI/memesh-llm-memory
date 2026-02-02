/**
 * Tracing Performance Impact Benchmarks
 *
 * Measures the overhead of AsyncLocalStorage-based trace context propagation
 * to ensure distributed tracing doesn't significantly impact performance.
 *
 * Test Scenarios:
 * 1. Baseline: No tracing (direct function calls)
 * 2. AsyncLocalStorage: Single trace context
 * 3. Nested Contexts: Multiple levels of trace context (depth=5)
 *
 * @module benchmarks/tracing-performance
 */

import { describe, bench } from 'vitest';
import {
  createTraceContext,
  runWithTraceContext,
  createChildSpan,
} from '../src/utils/tracing/TraceContext.js';

/**
 * Simulate a typical async function that would be traced
 * Performs a small amount of work to represent real operations
 */
async function simulateAsyncWork(): Promise<number> {
  // Simulate some async work (e.g., database query, API call)
  return new Promise((resolve) => {
    setImmediate(() => {
      // Small computation
      const result = Math.random() * 100;
      resolve(result);
    });
  });
}

/**
 * Simulate synchronous work
 */
function simulateSyncWork(): number {
  return Math.random() * 100;
}

describe('Tracing Performance Impact', () => {
  const ITERATIONS = 100;

  // ============================================================================
  // Baseline: No Tracing
  // ============================================================================

  bench('baseline: sync operations (no tracing)', () => {
    for (let i = 0; i < ITERATIONS; i++) {
      simulateSyncWork();
    }
  });

  bench('baseline: async operations (no tracing)', async () => {
    for (let i = 0; i < ITERATIONS; i++) {
      await simulateAsyncWork();
    }
  });

  // ============================================================================
  // AsyncLocalStorage Tracing
  // ============================================================================

  bench('with AsyncLocalStorage: sync operations', () => {
    const context = createTraceContext();
    runWithTraceContext(context, () => {
      for (let i = 0; i < ITERATIONS; i++) {
        simulateSyncWork();
      }
    });
  });

  bench('with AsyncLocalStorage: async operations', async () => {
    const context = createTraceContext();
    await new Promise((resolve, reject) => {
      runWithTraceContext(context, async () => {
        try {
          for (let i = 0; i < ITERATIONS; i++) {
            await simulateAsyncWork();
          }
          resolve(undefined);
        } catch (error) {
          reject(error);
        }
      });
    });
  });

  // ============================================================================
  // Nested Trace Contexts
  // ============================================================================

  bench('nested contexts: depth=2', async () => {
    const rootContext = createTraceContext();
    await new Promise((resolve, reject) => {
      runWithTraceContext(rootContext, async () => {
        try {
          const child1 = createChildSpan('child-1');
          await new Promise((resolve2, reject2) => {
            runWithTraceContext(child1, async () => {
              try {
                await simulateAsyncWork();
                resolve2(undefined);
              } catch (error) {
                reject2(error);
              }
            });
          });
          resolve(undefined);
        } catch (error) {
          reject(error);
        }
      });
    });
  });

  bench('nested contexts: depth=5', async () => {
    const rootContext = createTraceContext();
    await new Promise((resolve, reject) => {
      runWithTraceContext(rootContext, async () => {
        try {
          const child1 = createChildSpan('level-1');
          await new Promise((r1, e1) => {
            runWithTraceContext(child1, async () => {
              try {
                const child2 = createChildSpan('level-2');
                await new Promise((r2, e2) => {
                  runWithTraceContext(child2, async () => {
                    try {
                      const child3 = createChildSpan('level-3');
                      await new Promise((r3, e3) => {
                        runWithTraceContext(child3, async () => {
                          try {
                            const child4 = createChildSpan('level-4');
                            await new Promise((r4, e4) => {
                              runWithTraceContext(child4, async () => {
                                try {
                                  const child5 = createChildSpan('level-5');
                                  await new Promise((r5, e5) => {
                                    runWithTraceContext(child5, async () => {
                                      try {
                                        await simulateAsyncWork();
                                        r5(undefined);
                                      } catch (error) {
                                        e5(error);
                                      }
                                    });
                                  });
                                  r4(undefined);
                                } catch (error) {
                                  e4(error);
                                }
                              });
                            });
                            r3(undefined);
                          } catch (error) {
                            e3(error);
                          }
                        });
                      });
                      r2(undefined);
                    } catch (error) {
                      e2(error);
                    }
                  });
                });
                r1(undefined);
              } catch (error) {
                e1(error);
              }
            });
          });
          resolve(undefined);
        } catch (error) {
          reject(error);
        }
      });
    });
  });

  // ============================================================================
  // Real-world Scenario: HTTP Request Handler
  // ============================================================================

  bench('real-world: HTTP request with tracing', async () => {
    // Simulate a typical HTTP request handler with multiple operations
    const context = createTraceContext();

    await new Promise((resolve, reject) => {
      runWithTraceContext(context, async () => {
        try {
          // 1. Validate request
          const validateSpan = createChildSpan('validate-request');
          await new Promise((r, e) => {
            runWithTraceContext(validateSpan, async () => {
              try {
                await simulateAsyncWork();
                r(undefined);
              } catch (error) {
                e(error);
              }
            });
          });

          // 2. Database query
          const dbSpan = createChildSpan('db-query');
          await new Promise((r, e) => {
            runWithTraceContext(dbSpan, async () => {
              try {
                await simulateAsyncWork();
                r(undefined);
              } catch (error) {
                e(error);
              }
            });
          });

          // 3. Business logic
          const logicSpan = createChildSpan('business-logic');
          await new Promise((r, e) => {
            runWithTraceContext(logicSpan, async () => {
              try {
                await simulateAsyncWork();
                r(undefined);
              } catch (error) {
                e(error);
              }
            });
          });

          // 4. Format response
          const responseSpan = createChildSpan('format-response');
          await new Promise((r, e) => {
            runWithTraceContext(responseSpan, async () => {
              try {
                await simulateAsyncWork();
                r(undefined);
              } catch (error) {
                e(error);
              }
            });
          });

          resolve(undefined);
        } catch (error) {
          reject(error);
        }
      });
    });
  });

  bench('real-world: HTTP request without tracing', async () => {
    // Same operations without tracing
    await simulateAsyncWork(); // validate
    await simulateAsyncWork(); // db query
    await simulateAsyncWork(); // business logic
    await simulateAsyncWork(); // format response
  });
});
