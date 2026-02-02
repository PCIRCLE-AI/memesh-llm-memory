import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  rateLimitMiddleware,
  clearRateLimitData,
} from '../../../../src/a2a/server/middleware/rateLimit.js';

/**
 * Test suite for rate limiter race condition fix
 *
 * These tests verify that concurrent requests don't cause
 * double-counting of token refills due to race conditions.
 *
 * Strategy: Instead of waiting for real time, we test the mutex mechanism
 * by verifying concurrent requests are properly serialized.
 */
describe('Rate Limiter - Race Condition Fix', () => {
  let mockRequests: Array<{
    req: Partial<Request> & { agentId?: string };
    res: Partial<Response>;
    next: NextFunction;
  }>;

  beforeEach(() => {
    clearRateLimitData();

    // Set low rate limit for testing
    process.env.MEMESH_A2A_RATE_LIMIT_SEND_MESSAGE = '10'; // 10 requests per minute

    mockRequests = [];
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.MEMESH_A2A_RATE_LIMIT_SEND_MESSAGE;
    clearRateLimitData();
  });

  function createMockRequest(agentId: string, path: string = '/a2a/send-message') {
    const nextSpy = vi.fn();
    const jsonSpy = vi.fn();
    const statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });
    const setHeaderSpy = vi.fn();

    const req = {
      agentId,
      path,
    } as Partial<Request> & { agentId?: string };

    const res = {
      status: statusSpy,
      json: jsonSpy,
      setHeader: setHeaderSpy,
    } as Partial<Response>;

    const next = nextSpy;

    mockRequests.push({ req, res, next });

    return { req, res, next, jsonSpy, statusSpy, setHeaderSpy, nextSpy };
  }

  describe('Token Bucket Concurrency Safety', () => {
    it('should handle concurrent requests without errors', async () => {
      const agentId = 'test-agent';

      // Send 10 concurrent requests (exactly the token limit)
      const concurrent = Array.from({ length: 10 }, () => createMockRequest(agentId));

      // Execute all concurrently
      const promises = concurrent.map((mock) =>
        rateLimitMiddleware(mock.req as any, mock.res as any, mock.next)
      );

      await Promise.all(promises);

      // All 10 should succeed (we have 10 tokens)
      const successCount = concurrent.filter((m) => m.nextSpy.mock.calls.length > 0).length;
      expect(successCount).toBe(10);
    });

    it('should correctly rate limit after tokens exhausted', async () => {
      const agentId = 'test-agent-2';

      // Consume all 10 tokens CONCURRENTLY (to avoid refill between requests)
      const consumeAll = Array.from({ length: 10 }, () => createMockRequest(agentId));
      await Promise.all(
        consumeAll.map((mock) => rateLimitMiddleware(mock.req as any, mock.res as any, mock.next))
      );

      // Verify all consumed successfully
      expect(consumeAll.every((m) => m.nextSpy.mock.calls.length > 0)).toBe(true);

      // Next request should be blocked (no refill time elapsed)
      const blocked = createMockRequest(agentId);
      await rateLimitMiddleware(blocked.req as any, blocked.res as any, blocked.next);
      expect(blocked.statusSpy).toHaveBeenCalledWith(429);
      expect(blocked.nextSpy).not.toHaveBeenCalled();
    });

    it('should maintain separate buckets for different agents', async () => {
      const agent1 = 'agent-1';
      const agent2 = 'agent-2';

      // Agent 1 consumes all tokens CONCURRENTLY
      const consumeAll = Array.from({ length: 10 }, () => createMockRequest(agent1));
      await Promise.all(
        consumeAll.map((mock) => rateLimitMiddleware(mock.req as any, mock.res as any, mock.next))
      );

      // Agent 1 should be rate limited
      const blocked1 = createMockRequest(agent1);
      await rateLimitMiddleware(blocked1.req as any, blocked1.res as any, blocked1.next);
      expect(blocked1.statusSpy).toHaveBeenCalledWith(429);

      // Agent 2 should still have tokens (separate bucket)
      const allowed2 = createMockRequest(agent2);
      await rateLimitMiddleware(allowed2.req as any, allowed2.res as any, allowed2.next);
      expect(allowed2.nextSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle high concurrency without errors', async () => {
      const agentId = 'stress-test-agent';

      // Send 50 concurrent requests (way over the 10 token limit)
      const concurrent = Array.from({ length: 50 }, () => createMockRequest(agentId));

      // Execute all concurrently
      const promises = concurrent.map((mock) =>
        rateLimitMiddleware(mock.req as any, mock.res as any, mock.next)
      );

      // Should not throw errors despite high concurrency
      await expect(Promise.all(promises)).resolves.toBeDefined();

      // Count successes and rate limited
      const successCount = concurrent.filter((m) => m.nextSpy.mock.calls.length > 0).length;
      const rateLimitedCount = concurrent.filter(
        (m) => m.statusSpy.mock.calls.length > 0 && m.statusSpy.mock.calls[0][0] === 429
      ).length;

      // Should have exactly 10 successes (initial tokens)
      expect(successCount).toBe(10);
      // Remaining 40 should be rate limited
      expect(rateLimitedCount).toBe(40);
    });
  });

  describe('Mutex Performance', () => {
    it('should complete quickly even with mutex protection', async () => {
      const agentId = 'performance-test';

      const mock = createMockRequest(agentId);
      const startTime = Date.now();

      await rateLimitMiddleware(mock.req as any, mock.res as any, mock.next);

      const duration = Date.now() - startTime;

      expect(mock.nextSpy).toHaveBeenCalledTimes(1);
      // Rate limiter should complete quickly (< 100ms even with mutex)
      expect(duration).toBeLessThan(100);
    });

    it('should handle rapid sequential requests efficiently', async () => {
      const agentId = 'sequential-test';

      const startTime = Date.now();

      // Send 10 requests sequentially
      for (let i = 0; i < 10; i++) {
        const mock = createMockRequest(agentId);
        await rateLimitMiddleware(mock.req as any, mock.res as any, mock.next);
        expect(mock.nextSpy).toHaveBeenCalledTimes(1);
      }

      const duration = Date.now() - startTime;

      // Should complete all 10 requests in reasonable time (< 500ms)
      expect(duration).toBeLessThan(500);
    });
  });
});
