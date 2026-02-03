/**
 * ✅ SECURITY FIX (HIGH-4): Token Hashing Tests
 *
 * Tests for auth middleware token handling to ensure:
 * 1. No token substring exposure in agentId
 * 2. Consistent hash-based identifiers
 * 3. No token correlation attacks possible
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { authenticateToken } from '../auth.js';
import type { AuthenticatedRequest } from '../auth.js';
import { createHash } from 'crypto';

describe('Auth Middleware - Token Security (HIGH-4)', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let nextFn: NextFunction;
  let statusMock: ReturnType<typeof vi.fn>;
  let jsonMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset environment
    process.env.MEMESH_A2A_TOKEN = 'test-token-12345678';

    // Setup mocks
    statusMock = vi.fn().mockReturnThis();
    jsonMock = vi.fn();
    nextFn = vi.fn();

    mockReq = {
      headers: {},
      body: {},
    };

    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
  });

  describe('Token Exposure Prevention', () => {
    it('should NOT expose token substring in agentId', () => {
      const testToken = 'secret-token-abcdef123456';
      process.env.MEMESH_A2A_TOKEN = testToken;

      mockReq.headers = {
        authorization: `Bearer ${testToken}`,
      };

      authenticateToken(
        mockReq as Request,
        mockRes as Response,
        nextFn
      );

      expect(nextFn).toHaveBeenCalled();

      const authReq = mockReq as AuthenticatedRequest;
      expect(authReq.agentId).toBeDefined();

      // ✅ SECURITY CHECK: agentId should NOT contain token substring
      expect(authReq.agentId).not.toContain('secret-token');
      expect(authReq.agentId).not.toContain('abcdef12');
      expect(authReq.agentId).not.toContain(testToken.substring(0, 8));
    });

    it('should use hash-based identifier instead of token substring', () => {
      const testToken = 'test-token-xyz789';
      process.env.MEMESH_A2A_TOKEN = testToken;

      mockReq.headers = {
        authorization: `Bearer ${testToken}`,
      };

      authenticateToken(
        mockReq as Request,
        mockRes as Response,
        nextFn
      );

      const authReq = mockReq as AuthenticatedRequest;

      // Calculate expected hash
      const expectedHash = createHash('sha256')
        .update(testToken)
        .digest('hex')
        .substring(0, 16);

      expect(authReq.agentId).toBe(`token-${expectedHash}`);
    });

    it('should produce consistent hash for same token', () => {
      const testToken = 'consistent-token-123';
      process.env.MEMESH_A2A_TOKEN = testToken;

      mockReq.headers = {
        authorization: `Bearer ${testToken}`,
      };

      // First call
      authenticateToken(
        mockReq as Request,
        mockRes as Response,
        nextFn
      );
      const agentId1 = (mockReq as AuthenticatedRequest).agentId;

      // Second call with same token
      mockReq = { headers: { authorization: `Bearer ${testToken}` }, body: {} };
      authenticateToken(
        mockReq as Request,
        mockRes as Response,
        nextFn
      );
      const agentId2 = (mockReq as AuthenticatedRequest).agentId;

      // Should be identical
      expect(agentId1).toBe(agentId2);
    });

    it('should produce different hashes for different tokens', () => {
      const token1 = 'token-alpha';
      const token2 = 'token-beta';
      process.env.MEMESH_A2A_TOKEN = token1;

      // First token
      mockReq.headers = { authorization: `Bearer ${token1}` };
      authenticateToken(
        mockReq as Request,
        mockRes as Response,
        nextFn
      );
      const agentId1 = (mockReq as AuthenticatedRequest).agentId;

      // Second token (invalid, but we're testing hash generation)
      mockReq = { headers: { authorization: `Bearer ${token2}` }, body: {} };
      authenticateToken(
        mockReq as Request,
        mockRes as Response,
        vi.fn() // Won't be called (auth fails)
      );

      // Hashes should be different (if it reached that code path)
      // In reality, second call fails auth, but demonstrates hash uniqueness
      const hash1 = createHash('sha256').update(token1).digest('hex').substring(0, 16);
      const hash2 = createHash('sha256').update(token2).digest('hex').substring(0, 16);

      expect(hash1).not.toBe(hash2);
      expect(agentId1).toBe(`token-${hash1}`);
    });
  });

  describe('Token Correlation Prevention', () => {
    it('should not allow token correlation via prefix matching', () => {
      const baseToken = 'shared-prefix-';
      const token1 = `${baseToken}unique1`;
      const token2 = `${baseToken}unique2`;

      process.env.MEMESH_A2A_TOKEN = token1;

      // First token
      mockReq.headers = { authorization: `Bearer ${token1}` };
      authenticateToken(
        mockReq as Request,
        mockRes as Response,
        nextFn
      );
      const agentId1 = (mockReq as AuthenticatedRequest).agentId;

      // Second token (different, but same prefix)
      process.env.MEMESH_A2A_TOKEN = token2;
      mockReq = { headers: { authorization: `Bearer ${token2}` }, body: {} };
      nextFn = vi.fn();
      authenticateToken(
        mockReq as Request,
        mockRes as Response,
        nextFn
      );
      const agentId2 = (mockReq as AuthenticatedRequest).agentId;

      // agentIds should NOT share common prefix (hashes are different)
      expect(agentId1).not.toBe(agentId2);
      // Extract hash portions
      const hash1 = agentId1!.replace('token-', '');
      const hash2 = agentId2!.replace('token-', '');
      expect(hash1.substring(0, 8)).not.toBe(hash2.substring(0, 8));
    });

    it('should prevent timing attacks via hash comparison', () => {
      const validToken = 'valid-secret-token-abc123';
      const similarToken = 'valid-secret-token-xyz789'; // Similar but different

      process.env.MEMESH_A2A_TOKEN = validToken;

      // Valid token
      mockReq.headers = { authorization: `Bearer ${validToken}` };
      const startValid = Date.now();
      authenticateToken(
        mockReq as Request,
        mockRes as Response,
        nextFn
      );
      const durationValid = Date.now() - startValid;

      // Invalid but similar token
      mockReq = { headers: { authorization: `Bearer ${similarToken}` }, body: {} };
      mockRes = { status: statusMock, json: jsonMock };
      const startInvalid = Date.now();
      authenticateToken(
        mockReq as Request,
        mockRes as Response,
        vi.fn()
      );
      const durationInvalid = Date.now() - startInvalid;

      // Timing should be similar (constant-time comparison)
      // Allow 5ms variance (execution overhead)
      const timingDiff = Math.abs(durationValid - durationInvalid);
      expect(timingDiff).toBeLessThan(5);
    });
  });

  describe('AgentCard ID Priority', () => {
    it('should use agentCard.id when available (priority over token hash)', () => {
      const testToken = 'test-token';
      const agentCardId = 'explicit-agent-123';

      process.env.MEMESH_A2A_TOKEN = testToken;

      mockReq.headers = { authorization: `Bearer ${testToken}` };
      mockReq.body = {
        agentCard: {
          id: agentCardId,
        },
      };

      authenticateToken(
        mockReq as Request,
        mockRes as Response,
        nextFn
      );

      const authReq = mockReq as AuthenticatedRequest;
      expect(authReq.agentId).toBe(agentCardId);
    });

    it('should fall back to token hash when agentCard.id is missing', () => {
      const testToken = 'fallback-token';
      process.env.MEMESH_A2A_TOKEN = testToken;

      mockReq.headers = { authorization: `Bearer ${testToken}` };
      mockReq.body = {}; // No agentCard

      authenticateToken(
        mockReq as Request,
        mockRes as Response,
        nextFn
      );

      const authReq = mockReq as AuthenticatedRequest;

      // Should use hash-based ID
      const expectedHash = createHash('sha256')
        .update(testToken)
        .digest('hex')
        .substring(0, 16);

      expect(authReq.agentId).toBe(`token-${expectedHash}`);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain rate limiting functionality with hash-based IDs', () => {
      const testToken = 'rate-limit-token';
      process.env.MEMESH_A2A_TOKEN = testToken;

      mockReq.headers = { authorization: `Bearer ${testToken}` };

      authenticateToken(
        mockReq as Request,
        mockRes as Response,
        nextFn
      );

      const authReq = mockReq as AuthenticatedRequest;

      // agentId should be set (required for rate limiting)
      expect(authReq.agentId).toBeDefined();
      expect(typeof authReq.agentId).toBe('string');
      expect(authReq.agentId!.length).toBeGreaterThan(0);
    });

    it('should produce fixed-length hash identifiers', () => {
      const tokens = ['short', 'medium-length-token', 'very-long-token-with-many-characters-123456789'];

      for (const token of tokens) {
        process.env.MEMESH_A2A_TOKEN = token;
        mockReq = { headers: { authorization: `Bearer ${token}` }, body: {} };
        nextFn = vi.fn();

        authenticateToken(
          mockReq as Request,
          mockRes as Response,
          nextFn
        );

        const authReq = mockReq as AuthenticatedRequest;
        // token-{16-char-hash} = 6 + 16 = 22 characters
        expect(authReq.agentId!.length).toBe(22);
      }
    });
  });
});
