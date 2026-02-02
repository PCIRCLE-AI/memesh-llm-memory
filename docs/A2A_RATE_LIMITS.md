# A2A Protocol - Rate Limiting

## Overview

A2A Protocol Phase 1.0 implements **per-agent rate limiting** to prevent abuse and ensure fair usage of endpoints. Rate limiting is applied to all protected endpoints using a **token bucket algorithm**.

## Rate Limits

### Default Limits

| Endpoint | Rate Limit | Description |
|----------|-----------|-------------|
| `/a2a/send-message` | 60 requests/minute | Create new tasks and send messages |
| `/a2a/tasks/:taskId` | 120 requests/minute | Get task status and results |
| `/a2a/tasks` | 100 requests/minute | List tasks with filtering |
| `/a2a/tasks/:taskId/cancel` | 60 requests/minute | Cancel running tasks |
| **Default** | 100 requests/minute | Fallback for any endpoint |

### Public Endpoints

Public endpoints are **not rate limited**:
- `/a2a/agent-card` - Agent discovery

## Algorithm: Token Bucket

Rate limiting uses the **token bucket algorithm** which provides:

1. **Consistent rate limiting**: Tokens refill at a constant rate
2. **Burst handling**: Allows short bursts up to bucket capacity
3. **Efficient**: O(1) time complexity per request
4. **Memory efficient**: Only tracks tokens and last refill time

### How It Works

```
Bucket Capacity = Rate Limit (e.g., 60 tokens for 60 RPM)
Refill Rate = Capacity / 60 seconds

For each request:
1. Refill tokens based on elapsed time
2. Check if tokens >= 1
3. If yes: consume 1 token, allow request
4. If no: reject with 429 status
```

## Per-Agent Isolation

Rate limits are **isolated per agent**:

- Agent A exhausting their limit does not affect Agent B
- Each agent has independent token buckets for each endpoint
- Storage key: `${agentId}:${endpoint}`

**Example:**
```
Agent A: /a2a/send-message → 60/60 tokens used ❌
Agent B: /a2a/send-message → 60/60 tokens available ✅
```

## Rate Limit Response

### HTTP Status Code

**429 Too Many Requests**

### Response Format

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 30 seconds.",
    "retryAfter": 30
  }
}
```

### Headers

- `Retry-After`: Number of seconds to wait before retrying

## Configuration

### Environment Variables

Override default rate limits using environment variables:

```bash
# Global default (fallback for all endpoints)
MEMESH_A2A_RATE_LIMIT_DEFAULT=100

# Endpoint-specific overrides (requests per minute)
MEMESH_A2A_RATE_LIMIT_SEND_MESSAGE=60
MEMESH_A2A_RATE_LIMIT_GET_TASK=120
MEMESH_A2A_RATE_LIMIT_LIST_TASKS=100
MEMESH_A2A_RATE_LIMIT_CANCEL_TASK=60
```

### Example: Strict Rate Limiting

```bash
# Allow only 10 requests per minute for send-message
export MEMESH_A2A_RATE_LIMIT_SEND_MESSAGE=10

# Allow 200 requests per minute for get-task
export MEMESH_A2A_RATE_LIMIT_GET_TASK=200
```

## Client Handling

### Best Practices

1. **Respect Retry-After header**:
   ```typescript
   if (response.status === 429) {
     const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
     await sleep(retryAfter * 1000);
     // Retry request
   }
   ```

2. **Implement exponential backoff**:
   ```typescript
   let retries = 0;
   while (retries < MAX_RETRIES) {
     const response = await sendRequest();
     if (response.status === 429) {
       const backoff = Math.pow(2, retries) * 1000;
       await sleep(backoff);
       retries++;
     } else {
       break;
     }
   }
   ```

3. **Batch requests when possible**: Use `/a2a/tasks` with filtering instead of multiple `/a2a/tasks/:taskId` calls

4. **Cache results**: Avoid redundant requests for task status

### Error Handling

```typescript
try {
  const response = await fetch(`${baseUrl}/a2a/send-message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (response.status === 429) {
    const error = await response.json();
    console.warn('Rate limit exceeded:', error.error.message);
    console.log('Retry after:', error.error.retryAfter, 'seconds');
    // Handle rate limit (wait and retry)
  } else if (!response.ok) {
    // Handle other errors
  }
} catch (err) {
  // Handle network errors
}
```

## Monitoring

### Rate Limit Statistics

The server tracks rate limit metrics:

```typescript
import { getRateLimitStats } from './middleware/rateLimit.js';

const stats = getRateLimitStats();
// [
//   {
//     agentId: 'agent-1',
//     endpoint: '/a2a/send-message',
//     limitExceeded: 5,
//     totalRequests: 150,
//     lastLimitHit: 1704067200000
//   }
// ]
```

### Log Monitoring

Rate limit events are logged:

```
[WARN] [Rate Limit] Limit exceeded {
  agentId: 'agent-1',
  endpoint: '/a2a/send-message',
  totalExceeded: 5,
  totalRequests: 150
}
```

## Memory Management

### Automatic Cleanup

- Expired rate limit entries are cleaned up every **5 minutes**
- Entries unused for **10 minutes** are removed
- Prevents memory leaks from inactive agents

### Manual Cleanup (Testing)

```typescript
import { clearRateLimitData } from './middleware/rateLimit.js';

// Clear all rate limit data
clearRateLimitData();
```

## Implementation Details

### Middleware Order

Rate limiting is applied **after authentication**:

```typescript
app.post('/a2a/send-message',
  authenticateToken,      // 1. Verify bearer token
  rateLimitMiddleware,    // 2. Check rate limit
  handler                 // 3. Process request
);
```

### Token Refill Formula

```typescript
const elapsed = now - lastRefill; // milliseconds
const tokensToAdd = elapsed * refillRate;
tokens = Math.min(maxTokens, tokens + tokensToAdd);
```

**Example** (60 RPM):
- Max tokens: 60
- Refill rate: 60 / 60,000ms = 0.001 tokens/ms
- After 1 second (1000ms): 0.001 × 1000 = 1 token added

## Phase 2.0 Considerations

Future enhancements planned:

1. **Persistent storage**: Redis-backed rate limiting for multi-instance deployments
2. **Dynamic limits**: Adjust limits based on agent tier/subscription
3. **Rate limit headers**: Add `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
4. **Per-IP rate limiting**: Additional layer for public endpoints
5. **Custom rate limit strategies**: Sliding window, fixed window options

## Testing

### Unit Tests

```bash
npm test tests/unit/a2a/server/middleware/rateLimit.test.ts
```

Tests cover:
- Token bucket algorithm correctness
- Per-agent isolation
- Endpoint-specific limits
- Token refill mechanism
- Statistics tracking
- Cleanup mechanism

### Integration Tests

```bash
npm test tests/integration/a2a-rate-limit.test.ts
```

Tests cover:
- Real HTTP requests
- 429 response format
- Retry-After headers
- Multiple endpoints
- Time-based refill

## FAQ

### Q: What happens if I exceed the rate limit?

You'll receive a `429 Too Many Requests` response with a `retryAfter` value indicating how long to wait.

### Q: Are rate limits shared across all agents?

No, each agent has **isolated** rate limits. Agent A cannot exhaust Agent B's quota.

### Q: Can I increase my rate limit?

Yes, use environment variables to override default limits. Contact the administrator for permanent limit increases.

### Q: Does the public `/a2a/agent-card` endpoint have rate limits?

No, public endpoints are not rate limited in Phase 1.0.

### Q: What if I need burst capacity?

The token bucket algorithm allows bursts up to the bucket capacity. For example, with 60 RPM, you can make 60 requests immediately, then 1 request per second after that.

### Q: How do I know when I can retry?

Use the `retryAfter` field in the error response or the `Retry-After` HTTP header.

## See Also

- [A2A Protocol Specification](./A2A_PROTOCOL.md)
- [Authentication Guide](./A2A_AUTHENTICATION.md)
- [API Reference](./A2A_API_REFERENCE.md)
