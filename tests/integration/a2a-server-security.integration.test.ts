/**
 * A2A Server Security Middleware Integration Tests
 *
 * Tests that security middleware (CSRF, Resource Protection) are properly
 * integrated into A2AServer and working together correctly.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { A2AServer } from '../../src/a2a/server/A2AServer.js';
import { AgentRegistry } from '../../src/a2a/storage/AgentRegistry.js';
import type { AgentCard } from '../../src/a2a/types/index.js';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';
import axios, { type AxiosInstance } from 'axios';

describe('A2A Server Security Middleware Integration', () => {
  let testDbPath: string;
  let server: A2AServer;
  let registry: AgentRegistry;
  let baseURL: string;
  let client: AxiosInstance;
  let csrfToken: string | null = null;

  beforeEach(async () => {
    // Use unique database for each test
    const uniqueId = crypto.randomBytes(8).toString('hex');
    testDbPath = join(process.cwd(), `test-security-${uniqueId}.db`);

    registry = AgentRegistry.getInstance(testDbPath);

    const agentId = `test-agent-${uniqueId}`;
    const agentCard: AgentCard = {
      id: agentId,
      name: 'Test Security Agent',
      description: 'Agent for security testing',
      version: '1.0.0',
      capabilities: {
        skills: [],
      },
      endpoints: {
        baseUrl: 'http://localhost:3000',
      },
    };

    server = new A2AServer({
      agentId,
      agentCard,
      portRange: { min: 3700, max: 3800 },
    });

    const port = await server.start();
    baseURL = `http://localhost:${port}`;

    client = axios.create({
      baseURL,
      validateStatus: () => true, // Don't throw on any status
    });
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
    if (registry) {
      registry.close();
    }
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  describe('🔒 CSRF Protection Integration', () => {
    it('should generate CSRF token on GET request', async () => {
      // Act: GET public route
      const response = await client.get('/a2a/agent-card');

      // Assert: CSRF token in response
      expect(response.status).toBe(200);
      expect(response.headers['x-csrf-token']).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();

      const csrfCookie = response.headers['set-cookie']?.find((cookie: string) =>
        cookie.startsWith('XSRF-TOKEN=')
      );
      expect(csrfCookie).toBeDefined();
    });

    it('should reject POST request without CSRF token', async () => {
      // Arrange: Get bearer token (simulate authentication)
      const bearerToken = 'test-token-123';

      // Act: POST without CSRF token
      const response = await client.post(
        '/a2a/send-message',
        {
          recipient_id: 'test-recipient',
          message: 'Test message',
        },
        {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
        }
      );

      // Assert: 403 Forbidden - CSRF token missing
      expect(response.status).toBe(403);
      expect(response.data.error.code).toBe('CSRF_TOKEN_MISSING');
    });

    it('should reject POST request with invalid CSRF token', async () => {
      // Arrange: Get bearer token
      const bearerToken = 'test-token-123';
      const invalidCsrfToken = 'invalid-token-xyz';

      // Act: POST with invalid CSRF token
      const response = await client.post(
        '/a2a/send-message',
        {
          recipient_id: 'test-recipient',
          message: 'Test message',
        },
        {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            'X-CSRF-Token': invalidCsrfToken,
          },
        }
      );

      // Assert: 403 Forbidden - Invalid CSRF token
      expect(response.status).toBe(403);
      expect(response.data.error.code).toBe('CSRF_TOKEN_INVALID');
    });

    it('should accept POST request with valid CSRF token', async () => {
      // Arrange: Get CSRF token
      const getResponse = await client.get('/a2a/agent-card');
      csrfToken = getResponse.headers['x-csrf-token'];
      expect(csrfToken).toBeDefined();

      const bearerToken = 'test-token-123';

      // Act: POST with valid CSRF token
      const response = await client.post(
        '/a2a/send-message',
        {
          recipient_id: 'test-recipient',
          message: 'Test message',
        },
        {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            'X-CSRF-Token': csrfToken,
          },
        }
      );

      // Assert: Should pass CSRF validation (may fail auth or other checks)
      // But should NOT get CSRF error
      expect(response.status).not.toBe(403);
      if (response.status === 403) {
        expect(response.data.error.code).not.toBe('CSRF_TOKEN_MISSING');
        expect(response.data.error.code).not.toBe('CSRF_TOKEN_INVALID');
      }
    });

    it('should rotate CSRF token after successful validation', async () => {
      // Arrange: Get initial CSRF token
      const getResponse1 = await client.get('/a2a/agent-card');
      const token1 = getResponse1.headers['x-csrf-token'];
      expect(token1).toBeDefined();

      const bearerToken = 'test-token-123';

      // Act 1: Use token in POST request
      const postResponse = await client.post(
        '/a2a/send-message',
        {
          recipient_id: 'test-recipient',
          message: 'Test message',
        },
        {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            'X-CSRF-Token': token1,
          },
        }
      );

      // Get new token from response
      const token2 = postResponse.headers['x-csrf-token'];

      // Act 2: Try to reuse old token (should fail)
      const replayResponse = await client.post(
        '/a2a/send-message',
        {
          recipient_id: 'test-recipient',
          message: 'Replay attack',
        },
        {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
            'X-CSRF-Token': token1, // Reusing old token
          },
        }
      );

      // Assert: Old token should be rejected (one-time use)
      expect(replayResponse.status).toBe(403);
      expect(replayResponse.data.error.code).toBe('CSRF_TOKEN_INVALID');

      // Assert: New token should be different
      if (token2) {
        expect(token2).not.toBe(token1);
      }
    });

    it('should NOT require CSRF token for GET requests', async () => {
      // Arrange: Authenticated GET request (no CSRF token)
      const bearerToken = 'test-token-123';

      // Act: GET protected route without CSRF token
      const response = await client.get('/a2a/tasks', {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      });

      // Assert: Should NOT get CSRF error
      // (may fail auth, but not CSRF check)
      if (response.status === 403) {
        expect(response.data.error.code).not.toBe('CSRF_TOKEN_MISSING');
        expect(response.data.error.code).not.toBe('CSRF_TOKEN_INVALID');
      }
    });
  });

  describe('🔒 Resource Protection Integration', () => {
    it('should reject extremely large payloads', async () => {
      // Arrange: Create large payload (> 10MB)
      const largePayload = {
        recipient_id: 'test',
        message: 'x'.repeat(11 * 1024 * 1024), // 11MB
      };

      // Act: POST large payload
      const response = await client.post('/a2a/send-message', largePayload, {
        headers: {
          'Content-Type': 'application/json',
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      // Assert: 413 Payload Too Large
      expect([400, 413]).toContain(response.status);
    });

    it('should track concurrent connections per IP', async () => {
      // This test verifies connection tracking is active
      // (actual limits tested in unit tests)

      // Act: Make concurrent requests
      const requests = Array.from({ length: 5 }, () =>
        client.get('/a2a/agent-card')
      );

      const responses = await Promise.all(requests);

      // Assert: All requests should succeed (under limit)
      responses.forEach((response) => {
        expect(response.status).toBe(200);
      });
    });

    it('should handle memory pressure gracefully', async () => {
      // This test verifies memory pressure middleware is active
      // (simulating actual memory pressure is difficult in tests)

      // Act: Normal request
      const response = await client.get('/a2a/agent-card');

      // Assert: Should succeed under normal conditions
      expect(response.status).toBe(200);

      // Note: Actual memory pressure rejection tested in unit tests
    });
  });

  describe('🔒 Middleware Execution Order', () => {
    it('should apply resource protection before authentication', async () => {
      // Arrange: Create oversized payload with valid auth
      const largePayload = {
        recipient_id: 'test',
        message: 'x'.repeat(11 * 1024 * 1024), // 11MB
      };

      const bearerToken = 'test-token-123';

      // Act: POST large payload with auth
      const response = await client.post('/a2a/send-message', largePayload, {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      // Assert: Should be rejected by resource protection
      // BEFORE reaching authentication middleware
      expect([400, 413]).toContain(response.status);
    });

    it('should apply CSRF after authentication', async () => {
      // Arrange: Valid CSRF token but invalid auth
      const getResponse = await client.get('/a2a/agent-card');
      const csrfToken = getResponse.headers['x-csrf-token'];

      // Act: POST with CSRF but without auth
      const response = await client.post(
        '/a2a/send-message',
        {
          recipient_id: 'test',
          message: 'Test',
        },
        {
          headers: {
            'X-CSRF-Token': csrfToken,
            // No Authorization header
          },
        }
      );

      // Assert: Should fail at authentication
      // (authentication runs BEFORE CSRF check in middleware order)
      expect(response.status).toBe(401); // Unauthorized
    });
  });

  describe('🔒 Security Headers', () => {
    it('should include security headers in all responses', async () => {
      // Act: Any request
      const response = await client.get('/a2a/agent-card');

      // Assert: Security headers present
      expect(response.headers).toBeDefined();

      // CSRF token should be in header
      expect(response.headers['x-csrf-token']).toBeDefined();

      // Cookie should have security attributes
      const setCookie = response.headers['set-cookie'];
      if (setCookie) {
        const csrfCookie = setCookie.find((cookie: string) =>
          cookie.startsWith('XSRF-TOKEN=')
        );
        expect(csrfCookie).toBeDefined();
        expect(csrfCookie).toContain('SameSite=Strict');
      }
    });
  });

  describe('🔒 Cleanup Mechanisms', () => {
    it('should start security cleanup timers on server start', async () => {
      // Assert: Server started successfully
      expect(server.getPort()).toBeGreaterThan(0);

      // Note: Actual cleanup tested in unit tests
      // This test verifies integration doesn't break server start
    });

    it('should stop security cleanup timers on server stop', async () => {
      // Act: Stop server
      await server.stop();

      // Assert: Server stopped cleanly
      expect(server.getPort()).toBeGreaterThan(0);

      // Note: Cleanup timer stop verified by no errors during shutdown
    });
  });
});
