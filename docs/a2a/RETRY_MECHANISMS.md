# A2A Retry Mechanisms

**Version**: Phase 1.0
**Last Updated**: 2026-02-03

## Overview

A2A Phase 1.0 implements comprehensive retry mechanisms with exponential backoff to handle transient failures in network operations and database access. This ensures resilient agent-to-agent communication even in the face of temporary service disruptions.

## Features

- **Exponential Backoff**: Delays between retries increase exponentially (1s → 2s → 4s → ...)
- **Jitter**: Random variation prevents thundering herd problems
- **Smart Retry Logic**: Automatically determines which errors are retryable
- **Configurable**: All retry parameters can be configured via environment variables
- **Observable**: Comprehensive logging and metrics for retry attempts

## Architecture

### A2AClient HTTP Retry

All HTTP operations in `A2AClient` automatically retry on transient failures:

- `sendMessage()` - Retry on network/server errors
- `getTask()` - Retry on network/server errors
- `listTasks()` - Retry on network/server errors
- `getAgentCard()` - Retry on network/server errors
- `cancelTask()` - Retry on network/server errors

#### Retryable HTTP Errors

✅ **Will Retry**:
- 5xx server errors (500, 502, 503, 504)
- 429 Too Many Requests (rate limit)
- Network timeouts (ETIMEDOUT, ECONNREFUSED)
- Connection errors (ECONNRESET, ENETUNREACH)

❌ **Will NOT Retry**:
- 4xx client errors (except 429)
- 401 Unauthorized (authentication failure)
- 403 Forbidden (authorization failure)
- 404 Not Found (resource doesn't exist)
- 400 Bad Request (invalid request)

### TaskQueue Database Retry

SQLite operations use built-in busy timeout for automatic retry:

- **WAL Mode**: Write-Ahead Logging for better concurrency
- **Busy Timeout**: Automatic retry when database is locked
- **Default Timeout**: 5 seconds

## Configuration

### Environment Variables

#### A2A HTTP Retry Settings

```bash
# Maximum retry attempts for HTTP operations (default: 3)
A2A_RETRY_MAX_ATTEMPTS=3

# Initial delay before first retry in milliseconds (default: 1000)
A2A_RETRY_INITIAL_DELAY_MS=1000

# Timeout for individual HTTP operations in milliseconds (default: 30000)
A2A_RETRY_TIMEOUT_MS=30000
```

#### Database Retry Settings

```bash
# SQLite busy timeout in milliseconds (default: 5000)
# How long to wait for database lock before giving up
DB_BUSY_TIMEOUT_MS=5000
```

#### Generic Retry Settings

```bash
# For other components using the retry utility
RETRY_MAX_ATTEMPTS=3
RETRY_INITIAL_DELAY_MS=1000
RETRY_MAX_DELAY_MS=30000
RETRY_BACKOFF_MULTIPLIER=2
RETRY_JITTER_MS=1000
```

## Usage Examples

### Basic A2AClient Usage

```typescript
import { A2AClient } from './a2a/client/A2AClient.js';

const client = new A2AClient();

// Automatically retries on transient failures
try {
  const response = await client.sendMessage('agent-2', {
    sourceAgentId: 'agent-1',
    task: 'Process data',
    priority: 'high',
  });
  console.log('Task created:', response.taskId);
} catch (error) {
  // Only throws after all retries exhausted
  console.error('Failed after retries:', error);
}
```

### Custom Retry Configuration

```typescript
import { A2AClient } from './a2a/client/A2AClient.js';

// Override default retry settings
const client = new A2AClient({
  maxRetries: 5,
  baseDelay: 2000,
  timeout: 60000,
});

await client.sendMessage('agent-2', request);
```

### Using Retry Utility Directly

```typescript
import { retryWithBackoff } from './utils/retry.js';

const result = await retryWithBackoff(
  async () => {
    // Your operation here
    return await fetch('https://api.example.com/data');
  },
  {
    operation: 'fetch-external-api',
    maxRetries: 3,
    baseDelay: 1000,
    retryableStatusCodes: [429, 500, 502, 503],
  }
);
```

## Retry Behavior

### Exponential Backoff Formula

```
delay = min(maxDelay, baseDelay * (2 ^ attempt) + random(0, jitter))
```

**Example with defaults** (baseDelay=1000ms, jitter=1000ms):
- Attempt 1: ~1-2 seconds
- Attempt 2: ~2-3 seconds
- Attempt 3: ~4-5 seconds

### Maximum Retry Time

With default settings (3 retries, 1s base delay):
- **Best case**: ~7 seconds total (1s + 2s + 4s)
- **Worst case**: ~10 seconds total (with jitter)

## Observability

### Logging

Retry attempts are logged with full context:

```json
{
  "level": "warn",
  "message": "[Retry] ⚠️ A2A sendMessage to agent-2 failed (attempt 1), retrying in 1234ms",
  "operation": "A2A sendMessage to agent-2",
  "attempt": 1,
  "delay": 1234,
  "totalDelay": 1234,
  "error": "HTTP error 503: Service Unavailable"
}
```

Success after retry:

```json
{
  "level": "info",
  "message": "[Retry] ✅ A2A sendMessage to agent-2 succeeded on attempt 3 after 3500ms delay",
  "operation": "A2A sendMessage to agent-2",
  "attempts": 3,
  "totalDelay": 3500
}
```

### Metrics

(Future enhancement: Prometheus metrics for retry rates, success rates, etc.)

## Testing

Comprehensive test coverage for retry scenarios:

- `tests/unit/a2a/A2AClient.retry.test.ts` - HTTP retry tests
- `tests/unit/a2a/TaskQueue.retry.test.ts` - Database retry tests
- `src/utils/__tests__/retry.attempt-count.test.ts` - Retry utility tests

Run retry-specific tests:

```bash
npm test -- tests/unit/a2a/A2AClient.retry.test.ts
npm test -- tests/unit/a2a/TaskQueue.retry.test.ts
```

## Best Practices

### When to Use Retry

✅ **Good Use Cases**:
- Network operations (HTTP, WebSocket)
- Database operations (especially concurrent writes)
- External API calls
- Cloud service operations

❌ **Bad Use Cases**:
- User input validation (deterministic errors)
- Business logic errors (won't fix on retry)
- Resource not found (404 - won't appear on retry)
- Authentication failures (credentials won't change)

### Choosing Retry Settings

**For fast APIs** (< 100ms response):
```
maxRetries: 3
baseDelay: 500
timeout: 5000
```

**For slow APIs** (> 1s response):
```
maxRetries: 5
baseDelay: 2000
timeout: 60000
```

**For critical operations**:
```
maxRetries: 5
baseDelay: 1000
timeout: 30000
```

**For background tasks**:
```
maxRetries: 10
baseDelay: 5000
timeout: 120000
```

## Troubleshooting

### Too Many Retries

**Symptom**: Operations take too long
**Solution**: Reduce `A2A_RETRY_MAX_ATTEMPTS` or `A2A_RETRY_INITIAL_DELAY_MS`

### Not Enough Retries

**Symptom**: Operations fail too quickly
**Solution**: Increase `A2A_RETRY_MAX_ATTEMPTS` or `A2A_RETRY_TIMEOUT_MS`

### Database Lock Timeouts

**Symptom**: "database is locked" errors
**Solution**: Increase `DB_BUSY_TIMEOUT_MS` (default: 5000ms)

### Thundering Herd

**Symptom**: Multiple agents retry simultaneously
**Solution**: Jitter is enabled by default - no action needed

## Future Enhancements

- [ ] Circuit breaker pattern for persistent failures
- [ ] Adaptive retry (adjust delays based on success rate)
- [ ] Retry budgets (limit total retry time)
- [ ] Prometheus metrics for retry monitoring
- [ ] Per-operation retry configuration
- [ ] Dead letter queue for failed operations

## References

- [Exponential Backoff Algorithm](https://en.wikipedia.org/wiki/Exponential_backoff)
- [AWS Architecture Blog - Timeouts, Retries, and Backoff with Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [Google Cloud - Retry Strategy Best Practices](https://cloud.google.com/architecture/retry-strategy-best-practices)
