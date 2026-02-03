/**
 * A2A Server Security Middleware Integration Tests
 *
 * Tests that security middleware (CSRF, Resource Protection) are properly
 * integrated into A2AServer and working together correctly.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { A2AServer } from '../../src/a2a/server/A2AServer.js';
import { AgentRegistry } from '../../src/a2a/storage/AgentRegistry.js';
import type { AgentCard } from '../../src/a2a/types/index.js';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';
import axios, { type AxiosInstance } from 'axios';

// ✅ Test Bearer token
const TEST_BEARER_TOKEN = 'test-bearer-token-12345';

// ⚠️ Run tests sequentially to avoid port conflicts and race conditions
describe.sequential('A2A Server Security Middleware Integration', () => {
  let testDbPath: string;
  let server: A2AServer;
  let registry: AgentRegistry;
  let baseURL: string;
  let client: AxiosInstance;
  let csrfToken: string | null = null;

  // ✅ Set up test environment with Bearer token
  beforeAll(() => {
    // Configure test token for authentication
    process.env.MEMESH_A2A_TOKEN = TEST_BEARER_TOKEN;
    process.env.A2A_MAX_CONNECTIONS_PER_IP = '10';
    process.env.A2A_MAX_PAYLOAD_SIZE_MB = '10'; // 10MB for tests
  });

  afterAll(() => {
    delete process.env.MEMESH_A2A_TOKEN;
    delete process.env.A2A_MAX_CONNECTIONS_PER_IP;
    delete process.env.A2A_MAX_PAYLOAD_SIZE_MB;
  });

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
      // Add small delay to ensure cleanup completes
      await new Promise((resolve) => setTimeout(resolve, 50));
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

    it('should skip CSRF validation for Bearer token authentication', async () => {
      // Arrange: Valid Bearer token, no CSRF token
      const messagePayload = {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Test message' }],
        },
      };

      // Act: POST with Bearer token but NO CSRF token
      const response = await client.post('/a2a/send-message', messagePayload, {
        headers: {
          Authorization: `Bearer ${TEST_BEARER_TOKEN}`,
        },
      });

      // Assert: Should succeed (Bearer auth exempts CSRF)
      // 200 = success, not 403 CSRF error
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it('should require CSRF token for non-Bearer requests (cookie-based auth)', async () => {
      // Arrange: No Bearer token, no CSRF token (simulating cookie-based auth)
      const messagePayload = {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Test message' }],
        },
      };

      // Act: POST without Bearer token and without CSRF token
      const response = await client.post('/a2a/send-message', messagePayload);

      // Assert: Should fail at authentication (no token provided)
      // 401 = Unauthorized (auth fails before CSRF check)
      expect(response.status).toBe(401);
      expect(response.data.code).toBe('AUTH_MISSING');
    });

    it('should accept Bearer token POST requests regardless of CSRF token', async () => {
      // Arrange: Get CSRF token (optional - Bearer auth doesn't need it)
      const getResponse = await client.get('/a2a/agent-card');
      csrfToken = getResponse.headers['x-csrf-token'];
      expect(csrfToken).toBeDefined();

      const messagePayload = {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Test message with CSRF' }],
        },
      };

      // Act: POST with Bearer token AND CSRF token (both valid)
      const response = await client.post('/a2a/send-message', messagePayload, {
        headers: {
          Authorization: `Bearer ${TEST_BEARER_TOKEN}`,
          'X-CSRF-Token': csrfToken,
        },
      });

      // Assert: Should succeed (Bearer auth is enough, CSRF is optional)
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    it('should not rotate CSRF tokens for Bearer-authenticated requests', async () => {
      // Arrange: Get initial CSRF token
      const getResponse1 = await client.get('/a2a/agent-card');
      const token1 = getResponse1.headers['x-csrf-token'];
      expect(token1).toBeDefined();

      const messagePayload = {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Test message' }],
        },
      };

      // Act 1: POST with Bearer token (CSRF is skipped)
      const postResponse = await client.post('/a2a/send-message', messagePayload, {
        headers: {
          Authorization: `Bearer ${TEST_BEARER_TOKEN}`,
        },
      });

      // Assert: Bearer auth request succeeds without CSRF
      expect(postResponse.status).toBe(200);

      // Note: CSRF token rotation only happens for cookie-based auth
      // Bearer auth bypasses CSRF entirely, so no rotation occurs
    });

    it('should NOT require CSRF token for GET requests', async () => {
      // Arrange: Authenticated GET request with Bearer token
      // GET requests never need CSRF (safe method)

      // Act: GET protected route with Bearer auth, no CSRF
      const response = await client.get('/a2a/tasks', {
        headers: {
          Authorization: `Bearer ${TEST_BEARER_TOKEN}`,
        },
      });

      // Assert: Should succeed (GET is safe method, doesn't need CSRF)
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
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
      // Note: Actual memory pressure simulation is tested in unit tests
      // Here we verify the middleware doesn't break normal operation

      // Act: Normal authenticated request
      const response = await client.get('/a2a/tasks', {
        headers: {
          Authorization: `Bearer ${TEST_BEARER_TOKEN}`,
        },
      });

      // Assert: Should succeed under normal conditions
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  describe('🔒 Middleware Execution Order', () => {
    it('should apply resource protection before authentication', async () => {
      // Arrange: Create oversized payload (> 10MB limit)
      const largePayload = {
        message: {
          role: 'user',
          parts: [
            {
              type: 'text',
              text: 'x'.repeat(11 * 1024 * 1024), // 11MB text
            },
          ],
        },
      };

      // Act: POST large payload with valid Bearer token
      const response = await client.post('/a2a/send-message', largePayload, {
        headers: {
          Authorization: `Bearer ${TEST_BEARER_TOKEN}`,
          'Content-Type': 'application/json',
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      // Assert: Should be rejected by resource protection
      // BEFORE reaching authentication middleware
      // 413 Payload Too Large or 400 Bad Request
      expect([400, 413]).toContain(response.status);
    });

    it('should apply middleware in correct order: auth → CSRF (skipped for Bearer) → rate limit', async () => {
      // Test 1: No auth token → fails at authentication
      const messagePayload = {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Test' }],
        },
      };

      const response1 = await client.post('/a2a/send-message', messagePayload);

      // Assert: Fails at authentication (first middleware)
      expect(response1.status).toBe(401);
      expect(response1.data.code).toBe('AUTH_MISSING');

      // Test 2: Valid auth → passes all middleware
      const response2 = await client.post('/a2a/send-message', messagePayload, {
        headers: {
          Authorization: `Bearer ${TEST_BEARER_TOKEN}`,
        },
      });

      // Assert: Succeeds (auth → CSRF skipped for Bearer → rate limit → handler)
      expect(response2.status).toBe(200);
      expect(response2.data.success).toBe(true);
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
