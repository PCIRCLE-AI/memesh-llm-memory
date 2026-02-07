/**
 * Distributed Tracing Module
 *
 * Provides distributed tracing capabilities for MCP tool operations.
 * Enables request correlation across task execution and memory operations.
 *
 * @module utils/tracing
 */

export {
  type TraceContext,
  generateTraceId,
  generateSpanId,
  isValidTraceId,
  isValidSpanId,
  parseW3CTraceparent,
  formatW3CTraceparent,
  extractTraceContext,
  injectTraceContext,
  createTraceContext,
  getTraceContext,
  runWithTraceContext,
  createChildSpan,
  withChildSpan,
  withChildSpanAsync,
  extractTraceTimestamp,
} from './TraceContext.js';

export {
  type TracedRequest,
  type TracingMiddlewareOptions,
  tracingMiddleware,
  getRequestTraceContext,
  spanMiddleware,
} from './middleware.js';
