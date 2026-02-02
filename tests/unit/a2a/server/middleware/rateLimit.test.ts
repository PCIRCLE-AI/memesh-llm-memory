/**
 * Rate Limit Middleware Unit Tests
 *
 * Tests token bucket algorithm, rate limiting logic, and cleanup mechanism.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  rateLimitMiddleware,
  getRateLimitStats,
  clearRateLimitData,
  startCleanup,
  stopCleanup,
} from '../../../../../src/a2a/server/middleware/rateLimit.js';

interface AuthenticatedRequest extends Request {
  agentId?: string;
}

describe('Rate Limit Middleware', () => {
  let mockReq: Partial<AuthenticatedRequest>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    clearRateLimitData();

    mockReq = {
      agentId: 'test-agent',
      path: '/a2a/send-message',
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      setHeader: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();
  });

  afterEach(() => {
    stopCleanup();
  });

  describe('Token Bucket Algorithm', () => {
    it('should allow requests within rate limit', () => {
      // First request should pass
      rateLimitMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should block requests exceeding rate limit', () => {
      // Set environment variable for testing (1 request per minute)
      process.env.MEMESH_A2A_RATE_LIMIT_SEND_MESSAGE = '1';

      // First request should pass
      rateLimitMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Second request should be blocked
      mockNext = vi.fn();
      rateLimitMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'RATE_LIMIT_EXCEEDED',
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();

      delete process.env.MEMESH_A2A_RATE_LIMIT_SEND_MESSAGE;
    });

    it.skip('should refill tokens over time', async () => {
      // Note: This test is skipped in unit tests due to timing dependency.
      // Token refill behavior is tested in integration tests instead.
      // See tests/integration/a2a-rate-limit.test.ts for refill verification.
    });

    it('should have correct retry-after header', () => {
      process.env.MEMESH_A2A_RATE_LIMIT_SEND_MESSAGE = '1';

      // Consume token
      rateLimitMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Next request should be blocked with retry-after
      mockNext = vi.fn();
      rateLimitMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Retry-After',
        expect.any(String)
      );

      const jsonCall = (mockRes.json as any).mock.calls[0][0];
      expect(jsonCall.error.retryAfter).toBeGreaterThan(0);
      expect(jsonCall.error.retryAfter).toBeLessThanOrEqual(60);

      delete process.env.MEMESH_A2A_RATE_LIMIT_SEND_MESSAGE;
    });
  });

  describe('Per-Agent Isolation', () => {
    it('should isolate rate limits per agent', () => {
      process.env.MEMESH_A2A_RATE_LIMIT_SEND_MESSAGE = '1';

      // Agent 1 consumes token
      mockReq.agentId = 'agent-1';
      rateLimitMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Agent 1 blocked
      mockNext = vi.fn();
      rateLimitMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );
      expect(mockRes.status).toHaveBeenCalledWith(429);

      // Agent 2 should still have tokens
      mockReq.agentId = 'agent-2';
      mockNext = vi.fn();
      mockRes.status = vi.fn().mockReturnThis();
      rateLimitMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );
      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();

      delete process.env.MEMESH_A2A_RATE_LIMIT_SEND_MESSAGE;
    });
  });

  describe('Endpoint-Specific Limits', () => {
    it('should apply different limits per endpoint', () => {
      process.env.MEMESH_A2A_RATE_LIMIT_SEND_MESSAGE = '1';
      process.env.MEMESH_A2A_RATE_LIMIT_GET_TASK = '2';

      // send-message: 1 request allowed
      mockReq.path = '/a2a/send-message';
      rateLimitMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );
      expect(mockNext).toHaveBeenCalledTimes(1);

      mockNext = vi.fn();
      rateLimitMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );
      expect(mockRes.status).toHaveBeenCalledWith(429);

      // get-task: 2 requests allowed
      mockReq.path = '/a2a/tasks/task-123';
      mockNext = vi.fn();
      mockRes.status = vi.fn().mockReturnThis();
      rateLimitMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );
      expect(mockNext).toHaveBeenCalled();

      mockNext = vi.fn();
      mockRes.status = vi.fn().mockReturnThis();
      rateLimitMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );
      expect(mockNext).toHaveBeenCalled();

      // Third request blocked
      mockNext = vi.fn();
      rateLimitMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );
      expect(mockRes.status).toHaveBeenCalledWith(429);

      delete process.env.MEMESH_A2A_RATE_LIMIT_SEND_MESSAGE;
      delete process.env.MEMESH_A2A_RATE_LIMIT_GET_TASK;
    });

    it('should normalize endpoint paths correctly', () => {
      process.env.MEMESH_A2A_RATE_LIMIT_GET_TASK = '1';

      // First request with task-123
      mockReq.path = '/a2a/tasks/task-123';
      rateLimitMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );
      expect(mockNext).toHaveBeenCalledTimes(1);

      // Second request with task-456 (same normalized endpoint)
      mockReq.path = '/a2a/tasks/task-456';
      mockNext = vi.fn();
      rateLimitMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );
      expect(mockRes.status).toHaveBeenCalledWith(429);

      delete process.env.MEMESH_A2A_RATE_LIMIT_GET_TASK;
    });
  });

  describe('Error Handling', () => {
    it('should handle missing agentId gracefully', () => {
      mockReq.agentId = undefined;

      rateLimitMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INTERNAL_ERROR',
          }),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Statistics Tracking', () => {
    it('should track rate limit statistics', () => {
      process.env.MEMESH_A2A_RATE_LIMIT_SEND_MESSAGE = '1';

      // First request
      rateLimitMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      // Second request (blocked)
      mockNext = vi.fn();
      rateLimitMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );

      const stats = getRateLimitStats();
      expect(stats).toHaveLength(1);
      expect(stats[0]).toMatchObject({
        agentId: 'test-agent',
        endpoint: '/a2a/send-message',
        limitExceeded: 1,
        totalRequests: 2,
      });

      delete process.env.MEMESH_A2A_RATE_LIMIT_SEND_MESSAGE;
    });
  });

  describe('Cleanup Mechanism', () => {
    it('should start and stop cleanup', () => {
      startCleanup();
      // Should not throw or cause issues
      stopCleanup();
    });

    it('should not start cleanup twice', () => {
      startCleanup();
      startCleanup(); // Should be idempotent
      stopCleanup();
    });
  });

  describe('Environment Variable Overrides', () => {
    it('should use default rate limit if no env var set', () => {
      // Default for send-message is 60 RPM
      mockReq.path = '/a2a/send-message';

      // Should allow multiple requests (default is 60)
      for (let i = 0; i < 5; i++) {
        mockNext = vi.fn();
        mockRes.status = vi.fn().mockReturnThis();
        rateLimitMiddleware(
          mockReq as AuthenticatedRequest,
          mockRes as Response,
          mockNext
        );
        expect(mockNext).toHaveBeenCalled();
      }
    });

    it('should respect global default override', () => {
      process.env.MEMESH_A2A_RATE_LIMIT_DEFAULT = '1';
      mockReq.path = '/a2a/unknown-endpoint';

      rateLimitMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );
      expect(mockNext).toHaveBeenCalled();

      mockNext = vi.fn();
      rateLimitMiddleware(
        mockReq as AuthenticatedRequest,
        mockRes as Response,
        mockNext
      );
      expect(mockRes.status).toHaveBeenCalledWith(429);

      delete process.env.MEMESH_A2A_RATE_LIMIT_DEFAULT;
    });
  });
});
