# A2A Distributed Tracing

## Overview

Distributed tracing enables request correlation across A2A agent communication, making it easier to debug issues, track requests through the system, and analyze performance.

## Features

- **Automatic Trace ID Generation**: Unique trace IDs for each request
- **Context Propagation**: Trace IDs propagate across HTTP calls and async operations
- **Standard Header Support**: Compatible with W3C Trace Context, X-Trace-Id, X-Request-Id
- **AsyncLocalStorage**: No manual parameter passing required
- **Logger Integration**: Trace IDs automatically included in all logs
- **Configurable Sampling**: Control which requests are traced for performance
- **Parent-Child Spans**: Track nested operations and call hierarchies

## Quick Start

### Server-Side (A2A Server)

Tracing is automatically enabled on all A2A servers:

```typescript
import { A2AServer } from './a2a/server/A2AServer.js';

const server = new A2AServer({
  agentId: 'my-agent',
  agentCard: { /* ... */ }
});

await server.start();
// Tracing is now active for all incoming requests
```

### Client-Side (A2A Client)

Trace context is automatically propagated in outgoing requests:

```typescript
import { A2AClient } from './a2a/client/A2AClient.js';

const client = new A2AClient();

// Trace context will be automatically injected into request headers
const response = await client.sendMessage('target-agent', {
  message: { /* ... */ }
});
```

### Custom Operations

For manual instrumentation of custom operations:

```typescript
import { withChildSpan, getTraceContext } from './utils/tracing/index.js';

// Synchronous operation
const result = withChildSpan('my-operation', () => {
  const context = getTraceContext();
  console.log('Current trace:', context?.traceId);
  // Your code here
  return 'done';
});

// Asynchronous operation
import { withChildSpanAsync } from './utils/tracing/index.js';

const asyncResult = await withChildSpanAsync('async-operation', async () => {
  const context = getTraceContext();
  console.log('Current trace:', context?.traceId);
  // Your async code here
  return 'done';
});
```

## Trace Headers

### Outgoing Requests (Client → Server)

The A2A client automatically injects these headers:

- `traceparent`: W3C Trace Context format (e.g., `00-{trace-id}-{span-id}-01`)
- `X-Trace-Id`: Our trace ID format (e.g., `trace-1706580123456-a1b2c3d4e5f6`)
- `X-Request-Id`: Alias for compatibility

### Incoming Requests (Server)

The A2A server extracts trace context from headers in priority order:

1. `traceparent` (W3C standard)
2. `X-Trace-Id`
3. `X-Request-Id`

If no trace headers are present, a new trace ID is generated.

## Trace ID Format

### Our Format

```
trace-{timestamp}-{random}
```

Example: `trace-1706580123456-a1b2c3d4e5f6`

- `timestamp`: 13-digit Unix timestamp in milliseconds
- `random`: 12 hexadecimal characters

### Span ID Format

```
span-{random}
```

Example: `span-12345678`

- `random`: 8 hexadecimal characters

## Logger Integration

Trace IDs are automatically included in all log entries:

### Console Output

```
2024-02-03 10:30:45 [TraceID: trace-1706580123456-a1b2c3d4e5f6] [SpanID: span-12345678] [info]: Task created
```

### JSON Logs (File Output)

```json
{
  "timestamp": "2024-02-03T10:30:45.123Z",
  "level": "info",
  "message": "Task created",
  "traceId": "trace-1706580123456-a1b2c3d4e5f6",
  "spanId": "span-12345678",
  "parentSpanId": "span-87654321"
}
```

## Configuration

### Sampling Rate

Control which requests are traced to reduce overhead:

```typescript
import { tracingMiddleware } from './utils/tracing/middleware.js';

// Sample 10% of requests
app.use(tracingMiddleware({ samplingRate: 0.1 }));

// Sample all requests (default)
app.use(tracingMiddleware({ samplingRate: 1.0 }));

// Disable sampling
app.use(tracingMiddleware({ samplingRate: 0 }));
```

### Enable/Disable Tracing

```typescript
// Disable tracing entirely
app.use(tracingMiddleware({ enabled: false }));

// Enable (default)
app.use(tracingMiddleware({ enabled: true }));
```

### Response Header Injection

```typescript
// Don't inject trace headers in response (default: inject)
app.use(tracingMiddleware({ injectResponseHeaders: false }));
```

## Advanced Usage

### Manual Context Management

```typescript
import {
  createTraceContext,
  runWithTraceContext,
  getTraceContext,
} from './utils/tracing/index.js';

// Create a new trace context
const context = createTraceContext();

// Run code with trace context
runWithTraceContext(context, () => {
  // All operations here will have access to the trace context
  const current = getTraceContext();
  console.log(current?.traceId); // Same as context.traceId
});
```

### Creating Child Spans

```typescript
import { createChildSpan, runWithTraceContext } from './utils/tracing/index.js';

runWithTraceContext(parentContext, () => {
  const childSpan = createChildSpan('database-query');

  runWithTraceContext(childSpan, async () => {
    // This operation is traced as a child of the parent
    await database.query('SELECT * FROM users');
  });
});
```

### Custom Span Names

```typescript
import { spanMiddleware } from './utils/tracing/middleware.js';

// Apply to specific routes
app.post('/api/special', spanMiddleware('special-operation'), async (req, res) => {
  // This request will have a span with name 'special-operation'
});
```

## Integration Points

Distributed tracing is integrated at these key points:

1. **HTTP Server** (A2AServer)
   - All incoming HTTP requests
   - Route-specific spans (send-message, get-task, etc.)

2. **HTTP Client** (A2AClient)
   - All outgoing HTTP requests
   - Automatic header injection

3. **Logger**
   - Console output
   - File output (JSON)

4. **Task Lifecycle** (Future)
   - Task creation
   - Task execution
   - Task completion

5. **MCP Tool Calls** (Future)
   - Tool invocation
   - Tool results

6. **Database Operations** (Future)
   - Query execution
   - Transaction management

## Debugging with Trace IDs

### Finding All Logs for a Request

```bash
# Console logs
grep "trace-1706580123456-a1b2c3d4e5f6" logs/combined.log

# JSON logs
cat logs/combined.log | jq 'select(.traceId == "trace-1706580123456-a1b2c3d4e5f6")'
```

### Tracing a Request Across Agents

1. Client initiates request → generates trace ID `T1`
2. Server receives request → extracts trace ID `T1`
3. Server delegates to another agent → propagates trace ID `T1`
4. All logs use the same trace ID `T1`

Search logs across all agents for `T1` to see the complete request flow.

## Performance Considerations

### Overhead

- **Minimal**: AsyncLocalStorage has negligible performance impact
- **Sampling**: Use sampling to reduce overhead in high-traffic scenarios
- **Header Size**: Trace headers add ~150 bytes per request

### Best Practices

1. **Use Sampling in Production**: Sample 1-10% of requests
2. **Enable Full Tracing in Development**: Sample 100% for debugging
3. **Monitor Logger Performance**: If logs are slow, reduce verbosity
4. **Use Span Names Wisely**: Keep span names short and descriptive

## W3C Trace Context Compatibility

Our implementation is compatible with the [W3C Trace Context](https://www.w3.org/TR/trace-context/) standard.

### Header Format

```
traceparent: 00-{trace-id}-{parent-id}-{flags}
```

- Version: `00` (current version)
- Trace ID: 32 hex characters (we convert our format)
- Parent ID: 16 hex characters
- Flags: `01` = sampled, `00` = not sampled

### Example

```
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
X-Trace-Id: trace-1706580123456-a1b2c3d4e5f6
X-Request-Id: trace-1706580123456-a1b2c3d4e5f6
```

## Future Enhancements (Phase 2.0+)

- [ ] Trace visualization dashboard
- [ ] Metrics export (Prometheus, OpenTelemetry)
- [ ] Span events and attributes
- [ ] Distributed tracing across multiple hops
- [ ] Performance analysis and bottleneck detection
- [ ] Integration with APM tools (DataDog, New Relic, etc.)

## Troubleshooting

### Trace IDs Not Appearing in Logs

**Problem**: Logs don't show trace IDs

**Solution**:
1. Verify tracing middleware is installed: `app.use(tracingMiddleware())`
2. Check logger configuration
3. Ensure code runs within trace context (inside HTTP handler or `runWithTraceContext`)

### Trace Context Not Propagating

**Problem**: Child operations don't inherit trace context

**Solution**:
1. Use `withChildSpan` or `withChildSpanAsync` for manual instrumentation
2. Verify AsyncLocalStorage support (Node.js 14+)
3. Check that operations are truly async (not detached)

### Headers Not Being Injected

**Problem**: Outgoing requests don't have trace headers

**Solution**:
1. Verify using A2AClient (automatic injection)
2. For custom HTTP clients, call `injectTraceContext()` manually
3. Check if trace context exists: `getTraceContext()`

## API Reference

See TypeScript source files for complete API documentation:

- `src/utils/tracing/TraceContext.ts` - Core tracing functionality
- `src/utils/tracing/middleware.ts` - Express middleware
- `src/utils/logger.ts` - Logger integration

## Examples

### Complete Request Flow

```typescript
// Client Agent
import { A2AClient } from './a2a/client/A2AClient.js';

const client = new A2AClient();

// This creates trace T1
const response = await client.sendMessage('agent-2', {
  message: { role: 'user', parts: [{ type: 'text', text: 'Hello' }] }
});

// Server Agent (agent-2)
// A2AServer automatically extracts trace T1 from headers
// All logs in the handler will include trace T1

// logs/combined.log on both agents will show:
// [TraceID: trace-1706580123456-a1b2c3d4e5f6] ...
```

### Custom Instrumentation

```typescript
import { withChildSpanAsync, getTraceContext } from './utils/tracing/index.js';

async function processTask(taskId: string) {
  return withChildSpanAsync('process-task', async () => {
    const context = getTraceContext();
    logger.info('Processing task', { taskId, traceId: context?.traceId });

    // Step 1: Load data
    await withChildSpanAsync('load-data', async () => {
      const data = await database.load(taskId);
      return data;
    });

    // Step 2: Process
    await withChildSpanAsync('transform', async () => {
      // ... processing logic
    });

    // All logs above will have the same traceId with different spanIds
  });
}
```

## Related Documentation

- [A2A Protocol Specification](./A2A_PROTOCOL.md)
- [A2A Server Documentation](./A2A_SERVER.md)
- [A2A Client Documentation](./A2A_CLIENT.md)
- [Error Handling](./A2A_ERROR_HANDLING.md)
