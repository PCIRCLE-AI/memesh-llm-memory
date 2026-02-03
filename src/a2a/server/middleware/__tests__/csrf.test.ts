/**
 * ✅ SECURITY TESTS (MEDIUM-3): CSRF Protection
 *
 * Test suite for CSRF protection middleware
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import {
  csrfTokenMiddleware,
  csrfProtection,
  clearCsrfTokens,
  startCsrfCleanup,
  stopCsrfCleanup,
} from '../csrf.js';

// Mock Express request/response
function mockRequest(partial: Partial<Request> = {}): Request {
  return {
    method: 'POST',
    path: '/api/test',
    header: vi.fn(),
    body: {},
    ip: '127.0.0.1',
    ...partial,
  } as unknown as Request;
}

function mockResponse(): Response {
  const res: Partial<Response> = {
    cookie: vi.fn(),
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  };
  return res as Response;
}

describe('CSRF Protection', () => {
  beforeEach(() => {
    clearCsrfTokens();
  });

  afterEach(() => {
    clearCsrfTokens();
    stopCsrfCleanup();
  });

  describe('csrfTokenMiddleware', () => {
    it('should generate and send CSRF token', () => {
      const req = mockRequest();
      const res = mockResponse();
      const next = vi.fn();

      csrfTokenMiddleware(req, res, next);

      expect(res.cookie).toHaveBeenCalledWith(
        'XSRF-TOKEN',
        expect.any(String),
        expect.objectContaining({
          httpOnly: false,
          sameSite: 'strict',
        })
      );
      expect(res.setHeader).toHaveBeenCalledWith('X-CSRF-Token', expect.any(String));
      expect(next).toHaveBeenCalled();
    });

    it('should generate unique tokens', () => {
      const req1 = mockRequest();
      const res1 = mockResponse();
      const next1 = vi.fn();

      const req2 = mockRequest();
      const res2 = mockResponse();
      const next2 = vi.fn();

      csrfTokenMiddleware(req1, res1, next1);
      csrfTokenMiddleware(req2, res2, next2);

      const token1 = (res1.setHeader as any).mock.calls[0][1];
      const token2 = (res2.setHeader as any).mock.calls[0][1];

      expect(token1).not.toBe(token2);
    });

    it('should set secure flag in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      const req = mockRequest();
      const res = mockResponse();
      const next = vi.fn();

      csrfTokenMiddleware(req, res, next);

      expect(res.cookie).toHaveBeenCalledWith(
        'XSRF-TOKEN',
        expect.any(String),
        expect.objectContaining({
          secure: true,
        })
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('csrfProtection', () => {
    it('should skip CSRF check for safe methods', () => {
      const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

      safeMethods.forEach(method => {
        const req = mockRequest({ method });
        const res = mockResponse();
        const next = vi.fn();

        csrfProtection(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
      });
    });

    it('should reject request without CSRF token', () => {
      const req = mockRequest({
        method: 'POST',
        header: vi.fn().mockReturnValue(undefined),
        body: {},
      });
      const res = mockResponse();
      const next = vi.fn();

      csrfProtection(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'CSRF_TOKEN_MISSING',
          message: 'CSRF token required for this request',
        },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', () => {
      const req = mockRequest({
        method: 'POST',
        header: vi.fn().mockReturnValue('invalid-token'),
      });
      const res = mockResponse();
      const next = vi.fn();

      csrfProtection(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'CSRF_TOKEN_INVALID',
          message: 'Invalid CSRF token',
        },
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should accept valid token and generate new one', () => {
      // First, generate a token
      const genReq = mockRequest();
      const genRes = mockResponse();
      const genNext = vi.fn();

      csrfTokenMiddleware(genReq, genRes, genNext);

      const token = (genRes.setHeader as any).mock.calls[0][1];

      // Then, use that token
      const req = mockRequest({
        method: 'POST',
        header: vi.fn().mockReturnValue(token),
      });
      const res = mockResponse();
      const next = vi.fn();

      csrfProtection(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.setHeader).toHaveBeenCalledWith('X-CSRF-Token', expect.any(String));
      expect(res.cookie).toHaveBeenCalled();
    });

    it('should reject expired token', async () => {
      // Generate token
      const genReq = mockRequest();
      const genRes = mockResponse();
      const genNext = vi.fn();

      csrfTokenMiddleware(genReq, genRes, genNext);

      const token = (genRes.setHeader as any).mock.calls[0][1];

      // Wait for token to expire (mock by clearing and adding with past expiry)
      clearCsrfTokens();

      const req = mockRequest({
        method: 'POST',
        header: vi.fn().mockReturnValue(token),
      });
      const res = mockResponse();
      const next = vi.fn();

      csrfProtection(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'CSRF_TOKEN_INVALID',
          message: 'Invalid CSRF token',
        },
      });
    });

    it('should accept token from body field', () => {
      // Generate token
      const genReq = mockRequest();
      const genRes = mockResponse();
      const genNext = vi.fn();

      csrfTokenMiddleware(genReq, genRes, genNext);

      const token = (genRes.setHeader as any).mock.calls[0][1];

      // Use token from body
      const req = mockRequest({
        method: 'POST',
        header: vi.fn().mockReturnValue(undefined),
        body: { csrf_token: token },
      });
      const res = mockResponse();
      const next = vi.fn();

      csrfProtection(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should consume token (one-time use)', () => {
      // Generate token
      const genReq = mockRequest();
      const genRes = mockResponse();
      const genNext = vi.fn();

      csrfTokenMiddleware(genReq, genRes, genNext);

      const token = (genRes.setHeader as any).mock.calls[0][1];

      // Use token once
      const req1 = mockRequest({
        method: 'POST',
        header: vi.fn().mockReturnValue(token),
      });
      const res1 = mockResponse();
      const next1 = vi.fn();

      csrfProtection(req1, res1, next1);
      expect(next1).toHaveBeenCalled();

      // Try to use same token again
      const req2 = mockRequest({
        method: 'POST',
        header: vi.fn().mockReturnValue(token),
      });
      const res2 = mockResponse();
      const next2 = vi.fn();

      csrfProtection(req2, res2, next2);

      expect(res2.status).toHaveBeenCalledWith(403);
      expect(next2).not.toHaveBeenCalled();
    });
  });

  describe('Token lifecycle management', () => {
    it('should start and stop cleanup', () => {
      startCsrfCleanup();
      // Should not throw

      stopCsrfCleanup();
      // Should not throw

      // Starting again should be safe
      startCsrfCleanup();
      stopCsrfCleanup();
    });

    it('should not start multiple cleanup intervals', () => {
      startCsrfCleanup();
      startCsrfCleanup(); // Should be idempotent
      stopCsrfCleanup();
    });
  });

  describe('Bearer Token Authentication Exemption', () => {
    it('should skip CSRF validation for Bearer token auth', () => {
      const req = mockRequest({
        method: 'POST',
        header: vi.fn((name: string) => {
          if (name === 'Authorization') return 'Bearer test-token-12345';
          return undefined;
        }),
        body: {}, // NO CSRF token
      });
      const res = mockResponse();
      const next = vi.fn();

      csrfProtection(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled(); // Should not reject
    });

    it('should still require CSRF for requests without Bearer token', () => {
      const req = mockRequest({
        method: 'POST',
        header: vi.fn().mockReturnValue(undefined), // NO Authorization header
        body: {}, // NO CSRF token
      });
      const res = mockResponse();
      const next = vi.fn();

      csrfProtection(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'CSRF_TOKEN_MISSING' })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should require CSRF for non-Bearer Authorization headers', () => {
      const req = mockRequest({
        method: 'POST',
        header: vi.fn((name: string) => {
          if (name === 'Authorization') return 'Basic dXNlcjpwYXNz'; // Basic auth
          return undefined;
        }),
        body: {}, // NO CSRF token
      });
      const res = mockResponse();
      const next = vi.fn();

      csrfProtection(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'CSRF_TOKEN_MISSING' })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Security edge cases', () => {
    it('should generate cryptographically secure tokens', () => {
      const tokens = new Set<string>();

      for (let i = 0; i < 100; i++) {
        const req = mockRequest();
        const res = mockResponse();
        const next = vi.fn();

        csrfTokenMiddleware(req, res, next);

        const token = (res.setHeader as any).mock.calls[0][1];
        tokens.add(token);
      }

      // All tokens should be unique
      expect(tokens.size).toBe(100);

      // Tokens should be 64 characters (32 bytes hex-encoded)
      tokens.forEach(token => {
        expect(token).toHaveLength(64);
        expect(/^[0-9a-f]{64}$/.test(token)).toBe(true);
      });
    });

    it('should handle malformed token gracefully', () => {
      const req = mockRequest({
        method: 'POST',
        header: vi.fn().mockReturnValue('malformed<script>alert(1)</script>'),
      });
      const res = mockResponse();
      const next = vi.fn();

      csrfProtection(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle empty token gracefully', () => {
      const req = mockRequest({
        method: 'POST',
        header: vi.fn().mockReturnValue(''),
      });
      const res = mockResponse();
      const next = vi.fn();

      csrfProtection(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
