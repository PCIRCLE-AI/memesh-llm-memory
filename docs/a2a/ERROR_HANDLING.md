# A2A Error Handling Documentation

## Overview

A2A Phase 1.0 implements comprehensive error handling with:
- Centralized error codes and messages
- Circuit breaker pattern for timeout checker
- Graceful degradation and recovery
- Comprehensive error logging with context

## Error Code System

### Error Codes (`src/a2a/errors/ErrorCodes.ts`)

All error codes are defined in a centralized enum-like object:

```typescript
export const ErrorCodes = {
  // Authentication & Authorization
  AUTH_TOKEN_NOT_CONFIGURED: 'AUTH_TOKEN_NOT_CONFIGURED',
  AUTH_FAILED: 'AUTH_FAILED',

  // Agent Operations
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  AGENT_ALREADY_PROCESSING: 'AGENT_ALREADY_PROCESSING',

  // Task Operations
  TASK_TIMEOUT: 'TASK_TIMEOUT',
  TASK_SEND_FAILED: 'TASK_SEND_FAILED',

  // Timeout Checker
  TIMEOUT_CHECKER_ERROR: 'TIMEOUT_CHECKER_ERROR',
  TIMEOUT_CHECKER_CIRCUIT_OPEN: 'TIMEOUT_CHECKER_CIRCUIT_OPEN',

  // And more...
} as const;
```

### Error Messages (`src/a2a/errors/ErrorMessages.ts`)

Centralized error message templates support:
- Static messages (strings)
- Dynamic messages (functions with parameters)
- Type-safe parameter passing

```typescript
// Static message
[ErrorCodes.AUTH_FAILED]: 'Authentication failed - invalid A2A token'

// Dynamic message with parameters
[ErrorCodes.TASK_TIMEOUT]: (taskId: string, timeoutSeconds: number) =>
  `Task timeout detected: ${taskId} (timeout: ${timeoutSeconds}s)`
```

### Usage

**Creating errors:**
```typescript
import { ErrorCodes, createError } from '../errors/index.js';

// Static error
throw createError(ErrorCodes.AUTH_FAILED);

// Dynamic error with parameters
throw createError(ErrorCodes.TASK_TIMEOUT, 'task-123', 300);
```

**Formatting error messages:**
```typescript
import { ErrorCodes, formatErrorMessage } from '../errors/index.js';

const message = formatErrorMessage(ErrorCodes.TASK_TIMEOUT, 'task-123', 300);
// Returns: "Task timeout detected: task-123 (timeout: 300s)"
```

**Getting error message from unknown error:**
```typescript
import { getErrorMessage } from '../errors/index.js';

try {
  // some operation
} catch (error) {
  const message = getErrorMessage(error);
  logger.error('Operation failed', { error: message });
}
```

## Circuit Breaker Pattern

### TimeoutChecker Circuit Breaker (`src/a2a/jobs/TimeoutChecker.ts`)

Implements circuit breaker pattern for error recovery and graceful degradation.

**Circuit States:**
- **CLOSED**: Normal operation, all checks proceed
- **OPEN**: Too many failures, checks are skipped for cooldown period
- **HALF_OPEN**: Testing recovery after cooldown

**Configuration:**
```typescript
const checker = new TimeoutChecker(delegator, {
  intervalMs: 60_000,              // Check every 60 seconds
  maxConsecutiveErrors: 5,          // Open circuit after 5 consecutive errors
  circuitCooldownMs: 300_000,      // 5 minute cooldown before retry
  enableAlerting: true              // Enable alerting on systematic failures
});
```

**Features:**
1. **Error Counting**: Tracks consecutive errors
2. **Max Retries**: Opens circuit after threshold
3. **Cooldown Period**: Waits before attempting recovery
4. **Alerting**: Logs systematic failures at ERROR level
5. **Statistics**: Tracks error rate, total checks, etc.
6. **Manual Recovery**: Supports manual circuit reset

**Usage:**
```typescript
// Start timeout checker
checker.start();

// Get statistics
const stats = checker.getStatistics();
console.log(`Circuit state: ${stats.circuitState}`);
console.log(`Error rate: ${(stats.errorRate * 100).toFixed(2)}%`);
console.log(`Consecutive errors: ${stats.consecutiveErrors}`);

// Manual recovery (if needed)
if (stats.circuitState === CircuitState.OPEN) {
  checker.resetCircuit();
}

// Stop timeout checker
checker.stop();
```

**Error Recovery Flow:**
1. Check fails → increment error counter
2. If errors < max → continue normal operation
3. If errors >= max → open circuit
4. Circuit open → skip checks for cooldown period
5. After cooldown → transition to HALF_OPEN
6. Next check succeeds → close circuit
7. Next check fails → reopen circuit

**Alerting:**
When circuit opens, an error-level alert is logged:
```
[TimeoutChecker] ALERT: Systematic failure detected
{
  message: "TimeoutChecker circuit breaker is open (5/5 consecutive failures)...",
  statistics: { circuitState, consecutiveErrors, errorRate, ... },
  timestamp: "2026-02-03T12:00:00.000Z"
}
```

## Enhanced Error Logging

All modules use structured logging with comprehensive context:

**Before:**
```typescript
logger.error('TimeoutChecker error', error);
```

**After:**
```typescript
logger.error('[TimeoutChecker] Check failed', {
  error: errorMessage,
  consecutiveErrors: this.consecutiveErrors,
  maxConsecutiveErrors: this.maxConsecutiveErrors,
  circuitState: this.circuitState,
  stack: error instanceof Error ? error.stack : undefined,
});
```

**Logging Conventions:**
- All logs prefixed with module name: `[ModuleName]`
- Use structured metadata instead of string interpolation
- Include relevant context (taskId, agentId, error details)
- Always log stack traces for errors

## Migration Guide

### For Developers

**Old code:**
```typescript
throw new Error('Agent not found: ' + agentId);
```

**New code:**
```typescript
import { ErrorCodes, createError } from '../errors/index.js';
throw createError(ErrorCodes.AGENT_NOT_FOUND, agentId);
```

**Benefits:**
- Type-safe error codes
- Consistent error messages
- Easy to update messages globally
- Support for future i18n

### Adding New Error Codes

1. Add error code to `ErrorCodes.ts`:
```typescript
export const ErrorCodes = {
  // ... existing codes
  NEW_ERROR_CODE: 'NEW_ERROR_CODE',
} as const;
```

2. Add error message to `ErrorMessages.ts`:
```typescript
export const ErrorMessages = {
  // ... existing messages
  [ErrorCodes.NEW_ERROR_CODE]: 'Static error message',
  // OR
  [ErrorCodes.NEW_ERROR_CODE]: (param1: string, param2: number) =>
    `Dynamic error message: ${param1}, ${param2}`,
} as const;
```

3. Use in code:
```typescript
throw createError(ErrorCodes.NEW_ERROR_CODE);
// OR
throw createError(ErrorCodes.NEW_ERROR_CODE, 'value1', 42);
```

## Testing Error Handling

**Testing circuit breaker:**
```typescript
// Simulate consecutive errors
for (let i = 0; i < 5; i++) {
  // Trigger error condition
}

const stats = checker.getStatistics();
expect(stats.circuitState).toBe(CircuitState.OPEN);
expect(stats.consecutiveErrors).toBe(5);
```

**Testing error messages:**
```typescript
import { ErrorCodes, formatErrorMessage } from '../errors/index.js';

const message = formatErrorMessage(ErrorCodes.TASK_TIMEOUT, 'task-123', 300);
expect(message).toBe('Task timeout detected: task-123 (timeout: 300s)');
```

## Best Practices

1. **Always use centralized error codes**
   - ✅ `createError(ErrorCodes.AGENT_NOT_FOUND, agentId)`
   - ❌ `new Error('Agent not found: ' + agentId)`

2. **Include comprehensive context in logs**
   - ✅ `logger.error('[Module] Error', { taskId, error, stack })`
   - ❌ `logger.error('Error: ' + error.message)`

3. **Handle errors gracefully**
   - Implement retries with backoff
   - Provide fallback mechanisms
   - Don't let errors crash the system

4. **Use circuit breaker for repeated operations**
   - Detect systematic failures
   - Prevent cascading failures
   - Allow system to recover

5. **Monitor error metrics**
   - Track error rates
   - Alert on systematic failures
   - Analyze error patterns

## Future Enhancements

- [ ] Internationalization (i18n) support
- [ ] External alerting integration (PagerDuty, Slack)
- [ ] Error rate metrics and dashboards
- [ ] Automatic error recovery strategies
- [ ] Error categorization and severity levels
