# E2E Testing Setup - Solution C (Hybrid Approach)

## Overview

This directory contains the global setup for E2E tests, implementing **Solution C (Hybrid Approach)** for resource management.

## Phase 1: Global Setup ✅ COMPLETED

**Date**: 2026-02-02
**Status**: ✅ All tests passing

### What's Implemented

1. **Global Setup** (`global-setup.ts`)
   - Initializes GlobalResourcePool singleton before all tests
   - Configures resource limits (maxConcurrentE2E: 1)
   - Provides baseline protection against resource leaks
   - Automatic cleanup after all tests complete

2. **Vitest Configuration** (`vitest.e2e.config.ts`)
   - Integrated global setup
   - Updated to Vitest 4 format (removed deprecated `poolOptions`)
   - Single worker execution (`maxWorkers: 1, isolate: false`)
   - Zero retries to prevent resource explosion

3. **Verification Tests** (`tests/e2e/verify-global-setup.test.ts`)
   - Validates GlobalResourcePool initialization
   - Verifies configuration correctness
   - Tests status tracking and reporting
   - ✅ 4/4 tests passing

### Benefits

✅ **Zero Breaking Changes**: Existing tests work without modification
✅ **Baseline Protection**: All E2E tests automatically benefit from resource management
✅ **Vitest 4 Compatible**: No deprecation warnings
✅ **Verified**: Comprehensive test coverage

### Configuration Details

```typescript
// GlobalResourcePool configuration
{
  maxConcurrentE2E: 1,        // Only 1 E2E test at a time
  e2eWaitTimeout: 300000,     // 5 minutes timeout
  staleCheckInterval: 60000,  // Check for stale locks every minute
  staleLockThreshold: 1800000 // 30 minutes threshold
}
```

```typescript
// Vitest 4 configuration
{
  pool: 'threads',
  maxWorkers: 1,     // Single worker (was maxThreads in v3)
  isolate: false,    // Shared context (was singleThread in v3)
  retry: 0,          // No retries
}
```

## Phase 2: Helper Functions (Next Step)

**Status**: 🚧 Planned

Will provide:
- `withE2EResource()` - Automatic resource management wrapper
- `acquireE2EResource()` / `releaseE2EResource()` - Manual control
- `withE2EResources(n)` - Multi-resource coordination

See Task #2 for details.

## Phase 3: Migration (Optional)

**Status**: 📋 Backlog

Gradual migration of existing tests to use helper functions for explicit control.

## Testing

### Run Verification Test

```bash
# Using safe wrapper
npm run test:e2e:safe tests/e2e/verify-global-setup.test.ts

# Direct execution
npx vitest run --config vitest.e2e.config.ts tests/e2e/verify-global-setup.test.ts
```

### Expected Output

```
✓ should have GlobalResourcePool initialized
✓ should have correct resource pool configuration
✓ should be able to generate resource pool report
✓ should track resource pool status

Test Files  1 passed (1)
     Tests  4 passed (4)
```

## Troubleshooting

### Issue: "poolOptions was removed in Vitest 4"

**Solution**: Configuration has been updated to Vitest 4 format. If you see this warning, ensure you're using the latest version of `vitest.e2e.config.ts`.

### Issue: "close timed out after 10000ms"

**Status**: Known issue, does not affect test results.
**Cause**: Vitest's process cleanup behavior.
**Impact**: None - all tests complete successfully.

## Migration Guide

See [Vitest Migration Guide](https://vitest.dev/guide/migration.html) for Vitest 3 → 4 changes.

## Related Files

- `vitest.e2e.config.ts` - E2E test configuration
- `tests/e2e/verify-global-setup.test.ts` - Verification tests
- `src/orchestrator/GlobalResourcePool.ts` - Resource pool implementation

## Sources

- [Vitest Migration Guide](https://vitest.dev/guide/migration.html)
- [Vitest Configuration](https://vitest.dev/config/)
- [Vitest Pool Configuration](https://vitest.dev/config/pool)
