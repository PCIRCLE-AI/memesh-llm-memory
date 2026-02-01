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
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true, // MUST be true - prevents resource explosion
        maxThreads: 1, // CRITICAL: Only 1 thread to prevent freeze
        // Rationale: Each test spawns ~4 services, 2 threads × retry = 12+ instances = freeze
      },
    },

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
