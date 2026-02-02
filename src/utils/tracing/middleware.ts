/**
 * Distributed Tracing - Express Middleware
 *
 * Automatic trace context injection for Express HTTP requests.
 * Extracts trace IDs from incoming requests and propagates them
 * through the async execution context.
 *
 * @module utils/tracing/middleware
 */

import type { Request, Response, NextFunction } from 'express';
import {
  extractTraceContext,
  createTraceContext,
  runWithTraceContext,
  injectTraceContext,
  type TraceContext,
} from './TraceContext.js';

/**
 * Request with trace context
 */
export interface TracedRequest extends Request {
  traceContext?: TraceContext;
}

/**
 * Tracing middleware options
 */
export interface TracingMiddlewareOptions {
  /** Whether to enable tracing (default: true) */
  enabled?: boolean;
  /** Sampling rate 0.0-1.0 (default: 1.0 = sample all) */
  samplingRate?: number;
  /** Header name for trace ID (default: 'X-Trace-Id') */
  headerName?: string;
  /** Whether to inject trace headers in response (default: true) */
  injectResponseHeaders?: boolean;
}

/**
 * Create Express middleware for distributed tracing
 *
 * Automatically extracts or generates trace context for each request
 * and makes it available via AsyncLocalStorage.
 *
 * Features:
 * - Extracts trace context from incoming headers
 * - Generates new trace context if none provided
 * - Propagates trace context through async operations
 * - Optionally injects trace headers into responses
 * - Configurable sampling for performance
 *
 * @param options - Middleware configuration options
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * import express from 'express';
 * import { tracingMiddleware } from './tracing/middleware.js';
 *
 * const app = express();
 *
 * // Enable tracing for all requests
 * app.use(tracingMiddleware());
 *
 * // Enable tracing with custom options
 * app.use(tracingMiddleware({
 *   samplingRate: 0.1,  // Sample 10% of requests
 *   injectResponseHeaders: true
 * }));
 * ```
 */
export function tracingMiddleware(
  options: TracingMiddlewareOptions = {}
): (req: Request, res: Response, next: NextFunction) => void {
  const {
    enabled = true,
    samplingRate = 1.0,
    injectResponseHeaders = true,
  } = options;

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!enabled) {
      next();
      return;
    }

    // Determine if this request should be sampled
    const shouldSample = Math.random() < samplingRate;

    // Extract or create trace context
    const extracted = extractTraceContext(req.headers);
    const traceContext = createTraceContext(extracted ?? undefined, shouldSample);

    // Attach to request object for convenience
    (req as TracedRequest).traceContext = traceContext;

    // Inject trace headers into response if enabled
    if (injectResponseHeaders && traceContext.sampled) {
      const headers: Record<string, string> = {};
      injectTraceContext(headers, traceContext);

      for (const [key, value] of Object.entries(headers)) {
        res.setHeader(key, value);
      }
    }

    // Run the rest of the request handling with trace context
    runWithTraceContext(traceContext, () => {
      next();
    });
  };
}

/**
 * Get trace context from request object
 *
 * @param req - Express request
 * @returns Trace context or undefined
 */
export function getRequestTraceContext(req: Request): TraceContext | undefined {
  return (req as TracedRequest).traceContext;
}

/**
 * Create middleware for a specific route/endpoint with custom span name
 *
 * @param spanName - Name for the span (e.g., 'send-message', 'get-task')
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * app.post('/a2a/send-message',
 *   spanMiddleware('a2a.send-message'),
 *   async (req, res) => {
 *     // This request will have a child span with name 'a2a.send-message'
 *   }
 * );
 * ```
 */
export function spanMiddleware(
  spanName: string
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parentContext = getRequestTraceContext(req);

    if (!parentContext) {
      // No parent trace context, just continue
      next();
      return;
    }

    // Create child span
    const childContext = createTraceContext(
      {
        ...parentContext,
        spanId: parentContext.spanId,
      },
      parentContext.sampled
    );

    // Add span name to baggage
    childContext.baggage = {
      ...childContext.baggage,
      spanName,
    };

    // Update request trace context
    (req as TracedRequest).traceContext = childContext;

    // Run with child context
    runWithTraceContext(childContext, () => {
      next();
    });
  };
}
