import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // E2E tests configuration
    name: 'e2e',

    // Test file patterns
    include: ['tests/e2e/**/*.spec.ts'],
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
    // E2E tests may have shared state, so run sequentially by default
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false, // Allow parallel execution
        maxThreads: 3, // Limit concurrency to avoid overwhelming services
      },
    },

    // Retry configuration for flaky tests
    retry: 2, // Retry failed tests up to 2 times

    // Environment variables for E2E tests
    env: {
      NODE_ENV: 'test',
      VOICE_RAG_API: 'http://localhost:3003',
    },
  },
});
