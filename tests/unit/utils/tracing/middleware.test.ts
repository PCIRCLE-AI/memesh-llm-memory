/**
 * Unit Tests: Tracing Middleware
 *
 * Tests for Express middleware that handles distributed tracing.
 */

import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  tracingMiddleware,
  getRequestTraceContext,
  spanMiddleware,
} from '../../../../src/utils/tracing/middleware.js';
import { getTraceContext } from '../../../../src/utils/tracing/TraceContext.js';

describe('Tracing Middleware', () => {
  const createMockRequest = (headers: Record<string, string> = {}): Partial<Request> => ({
    headers,
    method: 'GET',
    path: '/test',
  });

  const createMockResponse = (): Partial<Response> => {
    const res: Partial<Response> = {
      setHeader: vi.fn(),
    };
    return res;
  };

  const createMockNext = (): NextFunction => vi.fn();

  describe('tracingMiddleware', () => {
    it('should create trace context for request without headers', () => {
      const middleware = tracingMiddleware();
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      const context = getRequestTraceContext(req);
      expect(context).toBeDefined();
      expect(context?.traceId).toBeDefined();
      expect(context?.spanId).toBeDefined();
      expect(context?.sampled).toBe(true);
      expect(next).toHaveBeenCalled();
    });

    it('should extract trace context from incoming headers', () => {
      const middleware = tracingMiddleware();
      const traceId = 'trace-1706580123456-a1b2c3d4e5f6';
      const req = createMockRequest({ 'X-Trace-Id': traceId }) as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      const context = getRequestTraceContext(req);
      expect(context?.traceId).toBe(traceId);
      expect(next).toHaveBeenCalled();
    });

    it('should create sampled trace context by default', () => {
      const middleware = tracingMiddleware();
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      // Verify trace context was created and is sampled
      const context = getRequestTraceContext(req);
      expect(context).toBeDefined();
      expect(context?.traceId).toBeDefined();
      expect(context?.spanId).toBeDefined();
      expect(context?.sampled).toBe(true);
      expect(next).toHaveBeenCalled();
    });

    it('should not inject response headers when disabled', () => {
      const middleware = tracingMiddleware({ injectResponseHeaders: false });
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(res.setHeader).not.toHaveBeenCalled();
    });

    it('should respect sampling rate', () => {
      // Set sampling rate to 0 (never sample)
      const middleware = tracingMiddleware({ samplingRate: 0 });
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      const context = getRequestTraceContext(req);
      expect(context?.sampled).toBe(false);
      expect(res.setHeader).not.toHaveBeenCalled(); // Not injected because not sampled
    });

    it('should skip tracing when disabled', () => {
      const middleware = tracingMiddleware({ enabled: false });
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      const context = getRequestTraceContext(req);
      expect(context).toBeUndefined();
      expect(next).toHaveBeenCalled();
    });

    it('should propagate trace context through async operations', () => {
      const middleware = tracingMiddleware();
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;

      let capturedContext: any;
      const next: NextFunction = () => {
        // Capture context inside next() callback which runs within runWithTraceContext
        capturedContext = getTraceContext();
      };

      middleware(req, res, next);

      const requestContext = getRequestTraceContext(req);

      expect(capturedContext).toBeDefined();
      expect(capturedContext?.traceId).toBe(requestContext?.traceId);
    });
  });

  describe('spanMiddleware', () => {
    it('should create child span with name', () => {
      // First create a parent context
      const tracingMw = tracingMiddleware();
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next1 = createMockNext();

      tracingMw(req, res, next1);
      const parentContext = getRequestTraceContext(req);

      // Now apply span middleware
      const spanMw = spanMiddleware('test-operation');
      const next2 = createMockNext();

      spanMw(req, res, next2);

      const childContext = getRequestTraceContext(req);
      expect(childContext?.traceId).toBe(parentContext?.traceId);
      expect(childContext?.baggage?.spanName).toBe('test-operation');
      expect(next2).toHaveBeenCalled();
    });

    it('should continue without error when no parent context', () => {
      const middleware = spanMiddleware('test-operation');
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should preserve parent trace ID in child span', () => {
      const tracingMw = tracingMiddleware();
      const spanMw = spanMiddleware('child-op');

      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;

      tracingMw(req, res, vi.fn());
      const parentTraceId = getRequestTraceContext(req)?.traceId;

      spanMw(req, res, vi.fn());
      const childTraceId = getRequestTraceContext(req)?.traceId;

      expect(childTraceId).toBe(parentTraceId);
    });
  });

  describe('getRequestTraceContext', () => {
    it('should return undefined for request without context', () => {
      const req = createMockRequest() as Request;
      const context = getRequestTraceContext(req);
      expect(context).toBeUndefined();
    });

    it('should return context after middleware execution', () => {
      const middleware = tracingMiddleware();
      const req = createMockRequest() as Request;
      const res = createMockResponse() as Response;
      const next = createMockNext();

      middleware(req, res, next);

      const context = getRequestTraceContext(req);
      expect(context).toBeDefined();
      expect(context?.traceId).toBeDefined();
    });
  });
});
