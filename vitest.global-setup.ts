/**
 * Vitest Global Setup/Teardown
 *
 * Ensures proper cleanup of all processes and resources after tests complete.
 *
 * Issue: Worker processes and main vitest processes were not terminating,
 * causing 56+ zombie processes to accumulate over 10+ hours.
 *
 * Solution: Force exit with process.exit() after a grace period for cleanup.
 */

export async function setup() {
  console.log('🔧 Vitest Global Setup - Initializing test environment');

  // Set up global test timeout handler
  const globalTimeout = setTimeout(() => {
    console.error('⏰ Global test timeout reached - Force exiting');
    process.exit(1);
  }, 5 * 60 * 1000); // 5 minutes max for entire test suite

  // Store timeout in global for teardown
  (global as any).__vitestGlobalTimeout = globalTimeout;

  return async () => {
    // This teardown function runs after ALL tests complete
    console.log('🧹 Vitest Global Teardown - Cleaning up');

    // Clear the global timeout
    clearTimeout((global as any).__vitestGlobalTimeout);

    // Give hooks time to clean up
    await new Promise((resolve) => setTimeout(resolve, 100));

    // CRITICAL: Force exit to ensure all worker processes terminate
    // Without this, worker pools remain running as zombie processes
    console.log('✅ Tests complete - Force exiting in 500ms');
    setTimeout(() => {
      console.log('👋 Exiting vitest process');
      process.exit(0);
    }, 500);
  };
}
