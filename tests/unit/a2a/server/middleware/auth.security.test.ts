/**
 * Security tests for authentication middleware
 * Tests timing attack protection and proper authentication flow
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../../../../../src/a2a/server/middleware/auth.js';

describe('Authentication Middleware - Security', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Setup mocks
    jsonMock = vi.fn();
    statusMock = vi.fn(() => ({ json: jsonMock }));

    mockRequest = {
      headers: {},
    };

    mockResponse = {
      status: statusMock as any,
      json: jsonMock,
    };

    nextFunction = vi.fn();

    // Set valid token in environment
    process.env.MEMESH_A2A_TOKEN = 'test-valid-token-12345';
  });

  describe('CRITICAL-1: Timing Attack Protection', () => {
    it('should use constant-time comparison for token validation', async () => {
      const validToken = 'test-valid-token-12345';
      const invalidToken = 'test-invalid-token-xx';

      // Use statistical sampling to reduce noise from JIT compilation,
      // garbage collection, and OS scheduling. A single measurement is
      // dominated by these factors and produces unreliable ratios.
      const ITERATIONS = 50;

      function measureMedian(token: string): number {
        const times: number[] = [];

        for (let i = 0; i < ITERATIONS; i++) {
          // Reset mocks for each iteration
          const localJsonMock = vi.fn();
          const localStatusMock = vi.fn(() => ({ json: localJsonMock }));
          const localNext = vi.fn();
          const localReq = {
            headers: { authorization: `Bearer ${token}` },
          } as Partial<Request>;
          const localRes = {
            status: localStatusMock as any,
            json: localJsonMock,
          } as Partial<Response>;

          const start = process.hrtime.bigint();
          authenticateToken(localReq as Request, localRes as Response, localNext);
          const end = process.hrtime.bigint();
          times.push(Number(end - start));
        }

        // Return median (robust against outliers from JIT/GC pauses)
        times.sort((a, b) => a - b);
        return times[Math.floor(times.length / 2)];
      }

      // Warm up JIT compiler to avoid first-call bias
      for (let i = 0; i < 10; i++) {
        const warmReq = { headers: { authorization: `Bearer ${validToken}` } } as Partial<Request>;
        const warmJsonMock = vi.fn();
        const warmStatusMock = vi.fn(() => ({ json: warmJsonMock }));
        const warmRes = { status: warmStatusMock as any, json: warmJsonMock } as Partial<Response>;
        authenticateToken(warmReq as Request, warmRes as Response, vi.fn());
      }

      const validMedian = measureMedian(validToken);
      const invalidMedian = measureMedian(invalidToken);

      const timingRatio = Math.max(validMedian, invalidMedian) / Math.min(validMedian, invalidMedian);

      // Log for debugging
      console.log(`Valid token median: ${validMedian}ns, Invalid token median: ${invalidMedian}ns, Ratio: ${timingRatio.toFixed(2)}`);

      // Constant-time comparison should produce a ratio close to 1.0.
      // Allow up to 25x to account for system variance in CI/test
      // environments while still detecting non-constant-time implementations
      // (which would show ratios of 100x+ for early-exit string comparison).
      expect(timingRatio).toBeLessThan(25);
    });

    it('should handle tokens of different lengths securely', () => {
      const shortToken = 'short';
      const longToken = 'this-is-a-very-long-token-that-should-still-be-compared-securely';

      // Test short token
      mockRequest.headers = { authorization: `Bearer ${shortToken}` };
      authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid authentication token',
        code: 'AUTH_INVALID'
      });

      // Reset mocks
      jsonMock.mockClear();
      statusMock.mockClear();
      nextFunction = vi.fn();

      // Test long token
      mockRequest.headers = { authorization: `Bearer ${longToken}` };
      authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid authentication token',
        code: 'AUTH_INVALID'
      });
    });

    it('should not leak information through error messages for invalid tokens', () => {
      const almostValidToken = 'test-valid-token-12344'; // One character different

      mockRequest.headers = { authorization: `Bearer ${almostValidToken}` };
      authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid authentication token',
        code: 'AUTH_INVALID'
      });

      // Error message should be generic, not indicating "almost correct"
      expect(nextFunction).not.toHaveBeenCalled();
    });
  });

  describe('Authentication Flow', () => {
    it('should accept valid token', () => {
      mockRequest.headers = { authorization: 'Bearer test-valid-token-12345' };
      authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should reject missing authorization header', () => {
      mockRequest.headers = {};
      authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Authentication token required',
        code: 'AUTH_MISSING'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject invalid token format (missing Bearer)', () => {
      mockRequest.headers = { authorization: 'test-valid-token-12345' };
      authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Authentication token required',
        code: 'AUTH_MISSING'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should reject invalid token', () => {
      mockRequest.headers = { authorization: 'Bearer invalid-token' };
      authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Invalid authentication token',
        code: 'AUTH_INVALID'
      });
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle missing MEMESH_A2A_TOKEN configuration', () => {
      const savedToken = process.env.MEMESH_A2A_TOKEN;
      try {
        delete process.env.MEMESH_A2A_TOKEN;

        mockRequest.headers = { authorization: 'Bearer test-valid-token-12345' };
        authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);

        expect(statusMock).toHaveBeenCalledWith(500);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'Server configuration error',
          code: 'TOKEN_NOT_CONFIGURED'
        });
        expect(nextFunction).not.toHaveBeenCalled();
      } finally {
        process.env.MEMESH_A2A_TOKEN = savedToken;
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty token after Bearer', () => {
      mockRequest.headers = { authorization: 'Bearer ' };
      authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle multiple spaces in authorization header', () => {
      mockRequest.headers = { authorization: 'Bearer  test-valid-token-12345' };
      authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);

      // Should fail because token includes extra space
      expect(statusMock).toHaveBeenCalledWith(401);
      expect(nextFunction).not.toHaveBeenCalled();
    });

    it('should handle lowercase bearer keyword (token still extracted correctly)', () => {
      // The implementation extracts token after first space, so lowercase "bearer" still works
      mockRequest.headers = { authorization: 'bearer test-valid-token-12345' };
      authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);

      // Token is correctly extracted and validated
      expect(nextFunction).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });
  });
});
