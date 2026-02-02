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

      // Measure time for valid token comparison
      mockRequest.headers = { authorization: `Bearer ${validToken}` };
      const validStart = process.hrtime.bigint();
      authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);
      const validEnd = process.hrtime.bigint();
      const validTime = Number(validEnd - validStart);

      // Reset mocks
      nextFunction = vi.fn();

      // Measure time for invalid token comparison
      mockRequest.headers = { authorization: `Bearer ${invalidToken}` };
      const invalidStart = process.hrtime.bigint();
      authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);
      const invalidEnd = process.hrtime.bigint();
      const invalidTime = Number(invalidEnd - invalidStart);

      // The timing difference should be negligible (within 10x factor)
      // Note: This is a heuristic test, not a perfect timing attack test
      const timingRatio = Math.max(validTime, invalidTime) / Math.min(validTime, invalidTime);
      
      // Log for debugging
      console.log(`Valid token time: ${validTime}ns, Invalid token time: ${invalidTime}ns, Ratio: ${timingRatio}`);

      // In practice, timing should be very similar due to constant-time comparison
      // Allow 10x difference to account for system variations
      expect(timingRatio).toBeLessThan(10);
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
      delete process.env.MEMESH_A2A_TOKEN;

      mockRequest.headers = { authorization: 'Bearer test-valid-token-12345' };
      authenticateToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Server configuration error',
        code: 'TOKEN_NOT_CONFIGURED'
      });
      expect(nextFunction).not.toHaveBeenCalled();
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
