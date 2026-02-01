import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // E2E tests configuration
    name: 'e2e',

    // Test file patterns
    include: ['tests/e2e/**/*.test.ts', 'tests/e2e/**/*.spec.ts'],
    exclude: ['node_modules', 'dist'],

    // Environment
    environment: 'node',

    // Timeouts
    testTimeout: 60000, // 60 seconds for E2E tests
    hookTimeout: 30000, // 30 seconds for hooks

    // Global setup
    globals: true,
    globalSetup: './tests/setup/global-setup.ts',

    // Coverage (optional)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'tests/**',
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
    },

    // Reporters
    reporters: ['verbose'],

    // Parallel execution
    // CRITICAL: SINGLE THREAD ONLY to prevent system freeze
    // 2025-12-26: After system freeze incident, reduced from 2 to 1
    // - Each E2E test spawns multiple services (Express, Vectra, WebSocket, RAG)
    // - Parallel execution causes 48+ concurrent processes → system freeze
    // - Must use sequential execution for stability
    //
    // 2026-02-02: Added GlobalResourcePool management (Solution C - Phase 1)
    // - Global setup ensures resource pool initialization and cleanup
    // - Provides baseline protection against resource leaks
    // - Tests can optionally use helper functions for explicit control (Phase 2)

    // Parallel execution (Vitest 4 format)
    // Migration from Vitest 3.x: poolOptions.threads -> top-level options
    pool: 'threads',
    maxWorkers: 1,     // CRITICAL: Only 1 worker to prevent freeze (was maxThreads)
    isolate: false,    // Equivalent to singleThread: true (prevents resource explosion)
    // Rationale: Each test spawns ~4 services, 2 workers × retry = 12+ instances = freeze

    // Retry configuration
    // CRITICAL: NO RETRIES - auth failures indicate config problems, not transient issues
    retry: 0, // No retries - prevents request explosion
    // Note: If tests fail, fix the root cause, don't retry

    // Environment variables for E2E tests
    env: {
      NODE_ENV: 'test',
    },
  },
});
