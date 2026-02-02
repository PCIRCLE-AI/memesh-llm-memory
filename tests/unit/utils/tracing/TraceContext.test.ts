/**
 * Unit Tests: Trace Context
 *
 * Tests for distributed tracing context management and propagation.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
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
  type TraceContext,
} from '../../../../src/utils/tracing/TraceContext.js';

describe('TraceContext', () => {
  describe('ID Generation', () => {
    it('should generate valid trace ID', () => {
      const traceId = generateTraceId();
      expect(isValidTraceId(traceId)).toBe(true);
      expect(traceId).toMatch(/^trace-\d{13}-[0-9a-f]{12}$/);
    });

    it('should generate unique trace IDs', () => {
      const id1 = generateTraceId();
      const id2 = generateTraceId();
      expect(id1).not.toBe(id2);
    });

    it('should generate valid span ID', () => {
      const spanId = generateSpanId();
      expect(isValidSpanId(spanId)).toBe(true);
      expect(spanId).toMatch(/^span-[0-9a-f]{8}$/);
    });

    it('should generate unique span IDs', () => {
      const id1 = generateSpanId();
      const id2 = generateSpanId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('ID Validation', () => {
    it('should validate correct trace ID format', () => {
      expect(isValidTraceId('trace-1706580123456-a1b2c3d4e5f6')).toBe(true);
    });

    it('should reject invalid trace ID formats', () => {
      expect(isValidTraceId('invalid')).toBe(false);
      expect(isValidTraceId('trace-123-abc')).toBe(false);
      expect(isValidTraceId('span-1706580123456-a1b2c3d4e5f6')).toBe(false);
      expect(isValidTraceId('')).toBe(false);
    });

    it('should validate correct span ID format', () => {
      expect(isValidSpanId('span-a1b2c3d4')).toBe(true);
    });

    it('should reject invalid span ID formats', () => {
      expect(isValidSpanId('invalid')).toBe(false);
      expect(isValidSpanId('span-12')).toBe(false);
      expect(isValidSpanId('trace-a1b2c3d4')).toBe(false);
      expect(isValidSpanId('')).toBe(false);
    });
  });

  describe('W3C Traceparent', () => {
    it('should parse valid W3C traceparent header', () => {
      const traceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
      const parsed = parseW3CTraceparent(traceparent);

      expect(parsed).not.toBeNull();
      expect(parsed?.sampled).toBe(true);
      expect(parsed?.traceId).toMatch(/^trace-\d{13}-4bf92f3577b3$/);
      expect(parsed?.parentSpanId).toMatch(/^span-00f067aa$/);
    });

    it('should parse traceparent with sampled=false', () => {
      const traceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-00';
      const parsed = parseW3CTraceparent(traceparent);

      expect(parsed).not.toBeNull();
      expect(parsed?.sampled).toBe(false);
    });

    it('should reject invalid traceparent format', () => {
      expect(parseW3CTraceparent('invalid')).toBeNull();
      expect(parseW3CTraceparent('00-abc-def')).toBeNull();
      expect(parseW3CTraceparent('01-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01')).toBeNull();
    });

    it('should format trace context as W3C traceparent', () => {
      const context: TraceContext = {
        traceId: 'trace-1706580123456-a1b2c3d4e5f6',
        spanId: 'span-12345678',
        sampled: true,
      };

      const traceparent = formatW3CTraceparent(context);
      expect(traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
    });

    it('should format with sampled=false', () => {
      const context: TraceContext = {
        traceId: 'trace-1706580123456-a1b2c3d4e5f6',
        spanId: 'span-12345678',
        sampled: false,
      };

      const traceparent = formatW3CTraceparent(context);
      expect(traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-00$/);
    });
  });

  describe('Header Extraction', () => {
    it('should extract from W3C traceparent header', () => {
      const headers = {
        'traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      };

      const extracted = extractTraceContext(headers);
      expect(extracted).not.toBeNull();
      expect(extracted?.traceId).toBeDefined();
      expect(extracted?.sampled).toBe(true);
    });

    it('should extract from X-Trace-Id header', () => {
      const traceId = 'trace-1706580123456-a1b2c3d4e5f6';
      const headers = {
        'x-trace-id': traceId,
      };

      const extracted = extractTraceContext(headers);
      expect(extracted).not.toBeNull();
      expect(extracted?.traceId).toBe(traceId);
      expect(extracted?.sampled).toBe(true);
    });

    it('should extract from X-Request-Id header', () => {
      const headers = {
        'x-request-id': 'req-1706580123456-a1b2c3d4',
      };

      const extracted = extractTraceContext(headers);
      expect(extracted).not.toBeNull();
      expect(extracted?.traceId).toBe('trace-1706580123456-a1b2c3d4');
    });

    it('should prioritize traceparent over other headers', () => {
      const headers = {
        'traceparent': '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
        'x-trace-id': 'trace-1706580123456-a1b2c3d4e5f6',
        'x-request-id': 'req-1706580123456-a1b2c3d4',
      };

      const extracted = extractTraceContext(headers);
      expect(extracted).not.toBeNull();
      expect(extracted?.traceId).toMatch(/^trace-\d{13}-4bf92f3577b3$/);
    });

    it('should handle case-insensitive headers', () => {
      const headers = {
        'X-TRACE-ID': 'trace-1706580123456-a1b2c3d4e5f6',
      };

      const extracted = extractTraceContext(headers);
      expect(extracted).not.toBeNull();
      expect(extracted?.traceId).toBe('trace-1706580123456-a1b2c3d4e5f6');
    });

    it('should return null when no trace headers present', () => {
      const headers = {
        'content-type': 'application/json',
      };

      const extracted = extractTraceContext(headers);
      expect(extracted).toBeNull();
    });

    it('should handle array header values', () => {
      const traceId = 'trace-1706580123456-a1b2c3d4e5f6';
      const headers = {
        'x-trace-id': [traceId, 'other-value'],
      };

      const extracted = extractTraceContext(headers);
      expect(extracted).not.toBeNull();
      expect(extracted?.traceId).toBe(traceId);
    });
  });

  describe('Header Injection', () => {
    it('should inject trace context into headers', () => {
      const context: TraceContext = {
        traceId: 'trace-1706580123456-a1b2c3d4e5f6',
        spanId: 'span-12345678',
        sampled: true,
      };

      const headers = injectTraceContext({}, context);

      expect(headers['traceparent']).toBeDefined();
      expect(headers['X-Trace-Id']).toBe(context.traceId);
      expect(headers['X-Request-Id']).toBe(context.traceId);
    });

    it('should preserve existing headers', () => {
      const context: TraceContext = {
        traceId: 'trace-1706580123456-a1b2c3d4e5f6',
        spanId: 'span-12345678',
        sampled: true,
      };

      const headers = injectTraceContext(
        { 'Authorization': 'Bearer token' },
        context
      );

      expect(headers['Authorization']).toBe('Bearer token');
      expect(headers['X-Trace-Id']).toBe(context.traceId);
    });
  });

  describe('Context Creation', () => {
    it('should create new trace context without parent', () => {
      const context = createTraceContext();

      expect(context.traceId).toBeDefined();
      expect(isValidTraceId(context.traceId)).toBe(true);
      expect(context.spanId).toBeDefined();
      expect(isValidSpanId(context.spanId)).toBe(true);
      expect(context.parentSpanId).toBeUndefined();
      expect(context.sampled).toBe(true);
    });

    it('should create trace context with parent', () => {
      const parent: TraceContext = {
        traceId: 'trace-1706580123456-a1b2c3d4e5f6',
        spanId: 'span-12345678',
        sampled: true,
      };

      const context = createTraceContext(parent);

      expect(context.traceId).toBe(parent.traceId);
      expect(context.spanId).not.toBe(parent.spanId);
      expect(context.parentSpanId).toBe(parent.spanId);
      expect(context.sampled).toBe(true);
    });

    it('should respect sampling decision', () => {
      const context = createTraceContext(undefined, false);
      expect(context.sampled).toBe(false);
    });

    it('should inherit baggage from parent', () => {
      const parent: TraceContext = {
        traceId: 'trace-1706580123456-a1b2c3d4e5f6',
        spanId: 'span-12345678',
        sampled: true,
        baggage: { key: 'value' },
      };

      const context = createTraceContext(parent);
      expect(context.baggage).toEqual({ key: 'value' });
    });
  });

  describe('Async Local Storage', () => {
    it('should get undefined context when not set', () => {
      const context = getTraceContext();
      expect(context).toBeUndefined();
    });

    it('should store and retrieve trace context', () => {
      const context: TraceContext = {
        traceId: 'trace-1706580123456-a1b2c3d4e5f6',
        spanId: 'span-12345678',
        sampled: true,
      };

      const result = runWithTraceContext(context, () => {
        const retrieved = getTraceContext();
        expect(retrieved).toEqual(context);
        return 'success';
      });

      expect(result).toBe('success');
    });

    it('should isolate contexts across different executions', () => {
      const context1: TraceContext = {
        traceId: 'trace-1706580123456-a1b2c3d4e5f6',
        spanId: 'span-11111111',
        sampled: true,
      };

      const context2: TraceContext = {
        traceId: 'trace-1706580123457-b2c3d4e5f6a1',
        spanId: 'span-22222222',
        sampled: true,
      };

      runWithTraceContext(context1, () => {
        const retrieved = getTraceContext();
        expect(retrieved?.spanId).toBe('span-11111111');
      });

      runWithTraceContext(context2, () => {
        const retrieved = getTraceContext();
        expect(retrieved?.spanId).toBe('span-22222222');
      });
    });
  });

  describe('Child Spans', () => {
    it('should create child span from current context', () => {
      const parentContext: TraceContext = {
        traceId: 'trace-1706580123456-a1b2c3d4e5f6',
        spanId: 'span-12345678',
        sampled: true,
      };

      runWithTraceContext(parentContext, () => {
        const child = createChildSpan();

        expect(child.traceId).toBe(parentContext.traceId);
        expect(child.spanId).not.toBe(parentContext.spanId);
        expect(child.parentSpanId).toBe(parentContext.spanId);
      });
    });

    it('should add span name to baggage', () => {
      const parentContext: TraceContext = {
        traceId: 'trace-1706580123456-a1b2c3d4e5f6',
        spanId: 'span-12345678',
        sampled: true,
      };

      runWithTraceContext(parentContext, () => {
        const child = createChildSpan('test-operation');
        expect(child.baggage?.spanName).toBe('test-operation');
      });
    });

    it('should execute function with child span', () => {
      const parentContext: TraceContext = {
        traceId: 'trace-1706580123456-a1b2c3d4e5f6',
        spanId: 'span-12345678',
        sampled: true,
      };

      runWithTraceContext(parentContext, () => {
        const result = withChildSpan('child-operation', () => {
          const context = getTraceContext();
          expect(context?.parentSpanId).toBe(parentContext.spanId);
          expect(context?.baggage?.spanName).toBe('child-operation');
          return 'done';
        });

        expect(result).toBe('done');
      });
    });

    it('should execute async function with child span', async () => {
      const parentContext: TraceContext = {
        traceId: 'trace-1706580123456-a1b2c3d4e5f6',
        spanId: 'span-12345678',
        sampled: true,
      };

      await new Promise<void>((resolve) => {
        runWithTraceContext(parentContext, async () => {
          const result = await withChildSpanAsync('async-operation', async () => {
            const context = getTraceContext();
            expect(context?.parentSpanId).toBe(parentContext.spanId);
            return 'async-done';
          });

          expect(result).toBe('async-done');
          resolve();
        });
      });
    });
  });

  describe('Timestamp Extraction', () => {
    it('should extract timestamp from trace ID', () => {
      const traceId = 'trace-1706580123456-a1b2c3d4e5f6';
      const timestamp = extractTraceTimestamp(traceId);

      expect(timestamp).toBe(1706580123456);
    });

    it('should return null for invalid trace ID', () => {
      expect(extractTraceTimestamp('invalid')).toBeNull();
      expect(extractTraceTimestamp('trace-123-abc')).toBeNull();
    });
  });
});
