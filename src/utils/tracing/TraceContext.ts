/**
 * Distributed Tracing - Trace Context Management
 *
 * Provides trace context propagation using AsyncLocalStorage for correlating
 * requests across distributed A2A agent communication.
 *
 * Features:
 * - Unique trace ID generation for each request
 * - Trace context propagation across async operations
 * - Support for standard trace headers (W3C traceparent, X-Trace-Id, X-Request-Id)
 * - Parent-child span relationships for nested operations
 *
 * @module utils/tracing
 */

import { AsyncLocalStorage } from 'async_hooks';
import crypto from 'crypto';

/**
 * Trace context containing correlation identifiers
 */
export interface TraceContext {
  /** Unique trace identifier for the entire distributed trace */
  traceId: string;
  /** Current span identifier (unique per operation) */
  spanId: string;
  /** Parent span identifier (for nested operations) */
  parentSpanId?: string;
  /** Sampling decision (true = traced, false = not traced) */
  sampled: boolean;
  /** Additional baggage/context metadata */
  baggage?: Record<string, string>;
}

/**
 * AsyncLocalStorage instance for trace context propagation
 *
 * Provides automatic context propagation across async boundaries without
 * manual parameter passing. Thread-safe and works with Promises, async/await.
 */
const traceStorage = new AsyncLocalStorage<TraceContext>();

/**
 * Generate a unique trace ID
 *
 * Format: trace-{timestamp}-{random}
 * Example: trace-1706580123456-a1b2c3d4e5f6
 *
 * @returns Unique trace ID string
 */
export function generateTraceId(): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(6).toString('hex');
  return `trace-${timestamp}-${random}`;
}

/**
 * Generate a unique span ID
 *
 * Format: span-{random}
 * Example: span-a1b2c3d4
 *
 * @returns Unique span ID string
 */
export function generateSpanId(): string {
  const random = crypto.randomBytes(4).toString('hex');
  return `span-${random}`;
}

/**
 * Validate trace ID format
 *
 * @param traceId - Trace ID to validate
 * @returns true if valid format, false otherwise
 */
export function isValidTraceId(traceId: string): boolean {
  return /^trace-\d{13}-[0-9a-f]{12}$/.test(traceId);
}

/**
 * Validate span ID format
 *
 * @param spanId - Span ID to validate
 * @returns true if valid format, false otherwise
 */
export function isValidSpanId(spanId: string): boolean {
  return /^span-[0-9a-f]{8}$/.test(spanId);
}

/**
 * Parse W3C traceparent header
 *
 * Format: 00-{trace-id}-{parent-id}-{flags}
 * Example: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
 *
 * @param traceparent - W3C traceparent header value
 * @returns Parsed trace context or null if invalid
 */
export function parseW3CTraceparent(
  traceparent: string
): Pick<TraceContext, 'traceId' | 'parentSpanId' | 'sampled'> | null {
  const parts = traceparent.split('-');
  if (parts.length !== 4 || parts[0] !== '00') {
    return null;
  }

  const [, traceId, parentId, flags] = parts;
  const sampled = (parseInt(flags, 16) & 1) === 1;

  return {
    traceId: `trace-${Date.now()}-${traceId.substring(0, 12)}`,
    parentSpanId: `span-${parentId.substring(0, 8)}`,
    sampled,
  };
}

/**
 * Format trace context as W3C traceparent header
 *
 * @param context - Trace context
 * @returns W3C traceparent header value
 */
export function formatW3CTraceparent(context: TraceContext): string {
  // Extract hex portions from our IDs
  const traceHex = context.traceId.split('-')[2] || '000000000000';
  const spanHex = context.spanId.split('-')[1] || '00000000';

  // Pad to required lengths (32 for trace, 16 for span)
  const paddedTrace = traceHex.padEnd(32, '0');
  const paddedSpan = spanHex.padEnd(16, '0');

  const flags = context.sampled ? '01' : '00';

  return `00-${paddedTrace}-${paddedSpan}-${flags}`;
}

/**
 * Extract trace context from headers
 *
 * Supports multiple header formats (priority order):
 * 1. traceparent (W3C Trace Context)
 * 2. X-Trace-Id
 * 3. X-Request-Id
 *
 * @param headers - HTTP headers object
 * @returns Extracted trace context or null if no trace headers found
 */
export function extractTraceContext(
  headers: Record<string, string | string[] | undefined>
): Partial<TraceContext> | null {
  // Normalize headers to lowercase for case-insensitive lookup
  const normalizedHeaders: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value !== undefined) {
      normalizedHeaders[key.toLowerCase()] = Array.isArray(value) ? value[0] : value;
    }
  }

  // 1. Try W3C traceparent
  const traceparent = normalizedHeaders['traceparent'];
  if (traceparent) {
    const parsed = parseW3CTraceparent(traceparent);
    if (parsed) {
      return {
        traceId: parsed.traceId,
        parentSpanId: parsed.parentSpanId,
        sampled: parsed.sampled,
      };
    }
  }

  // 2. Try X-Trace-Id
  const xTraceId = normalizedHeaders['x-trace-id'];
  if (xTraceId && isValidTraceId(xTraceId)) {
    return {
      traceId: xTraceId,
      sampled: true,
    };
  }

  // 3. Try X-Request-Id
  const xRequestId = normalizedHeaders['x-request-id'];
  if (xRequestId) {
    // Convert request ID to trace ID format
    return {
      traceId: xRequestId.replace(/^req-/, 'trace-'),
      sampled: true,
    };
  }

  return null;
}

/**
 * Inject trace context into headers
 *
 * Adds the following headers:
 * - traceparent: W3C Trace Context
 * - X-Trace-Id: Our trace ID format
 * - X-Request-Id: Alias for compatibility
 *
 * @param headers - Headers object to inject into
 * @param context - Trace context
 * @returns Updated headers object
 */
export function injectTraceContext(
  headers: Record<string, string>,
  context: TraceContext
): Record<string, string> {
  return {
    ...headers,
    'traceparent': formatW3CTraceparent(context),
    'X-Trace-Id': context.traceId,
    'X-Request-Id': context.traceId,
  };
}

/**
 * Create a new trace context
 *
 * @param parentContext - Optional parent context for nested traces
 * @param sampled - Whether to sample this trace (default: true)
 * @returns New trace context
 */
export function createTraceContext(
  parentContext?: Partial<TraceContext>,
  sampled = true
): TraceContext {
  return {
    traceId: parentContext?.traceId || generateTraceId(),
    spanId: generateSpanId(),
    parentSpanId: parentContext?.spanId,
    sampled,
    baggage: parentContext?.baggage,
  };
}

/**
 * Get current trace context from async local storage
 *
 * @returns Current trace context or undefined if not in a traced operation
 */
export function getTraceContext(): TraceContext | undefined {
  return traceStorage.getStore();
}

/**
 * Set trace context for the current async operation
 *
 * @param context - Trace context to set
 * @param callback - Function to execute with the trace context
 * @returns Result of callback execution
 */
export function runWithTraceContext<T>(
  context: TraceContext,
  callback: () => T
): T {
  return traceStorage.run(context, callback);
}

/**
 * Create a child span context from the current context
 *
 * @param spanName - Optional name for the child span (for debugging)
 * @returns New child trace context
 */
export function createChildSpan(spanName?: string): TraceContext {
  const parent = getTraceContext();
  const context = createTraceContext(parent, parent?.sampled ?? true);

  if (spanName) {
    context.baggage = {
      ...context.baggage,
      spanName,
    };
  }

  return context;
}

/**
 * Execute a function with a new child span
 *
 * @param spanName - Name of the child span
 * @param callback - Function to execute
 * @returns Result of callback execution
 */
export function withChildSpan<T>(spanName: string, callback: () => T): T {
  const childContext = createChildSpan(spanName);
  return runWithTraceContext(childContext, callback);
}

/**
 * Execute an async function with a new child span
 *
 * @param spanName - Name of the child span
 * @param callback - Async function to execute
 * @returns Promise resolving to callback result
 */
export async function withChildSpanAsync<T>(
  spanName: string,
  callback: () => Promise<T>
): Promise<T> {
  const childContext = createChildSpan(spanName);
  return new Promise((resolve, reject) => {
    runWithTraceContext(childContext, () => {
      callback().then(resolve).catch(reject);
    });
  });
}

/**
 * Extract timestamp from trace ID
 *
 * @param traceId - Trace ID
 * @returns Timestamp in milliseconds, or null if invalid format
 */
export function extractTraceTimestamp(traceId: string): number | null {
  const match = traceId.match(/^trace-(\d{13})-[0-9a-f]{12}$/);
  if (!match) {
    return null;
  }
  return parseInt(match[1], 10);
}
