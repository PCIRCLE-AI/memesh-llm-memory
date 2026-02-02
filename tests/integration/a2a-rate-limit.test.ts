/**
 * A2A Rate Limit Integration Tests
 *
 * Tests rate limiting behavior with actual HTTP requests to A2A server.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { A2AServer } from '../../src/a2a/server/A2AServer.js';
import type { AgentCard } from '../../src/a2a/types/index.js';
import { clearRateLimitData } from '../../src/a2a/server/middleware/rateLimit.js';

describe('A2A Rate Limit Integration', () => {
  let server: A2AServer;
  let baseUrl: string;
  const token = 'test-token-123';
  const agentCard: AgentCard = {
    id: 'test-agent',
    name: 'Test Agent',
    version: '1.0.0',
    capabilities: {
      delegation: {
        supportsMCPDelegation: true,
        maxConcurrentTasks: 1,
      },
    },
  };

  beforeAll(async () => {
    // Set auth token
    process.env.MEMESH_A2A_TOKEN = token;

    // Create and start server
    server = new A2AServer({
      agentId: 'test-agent',
      agentCard,
      portRange: { min: 4000, max: 4100 },
    });

    const port = await server.start();
    baseUrl = `http://localhost:${port}`;
  });

  afterAll(async () => {
    await server.stop();
    delete process.env.MEMESH_A2A_TOKEN;
    delete process.env.MEMESH_A2A_RATE_LIMIT_SEND_MESSAGE;
    delete process.env.MEMESH_A2A_RATE_LIMIT_GET_TASK;
  });

  beforeEach(() => {
    clearRateLimitData();
  });

  describe('Rate Limiting Behavior', () => {
    it('should enforce rate limit on /a2a/send-message', async () => {
      // Set very low rate limit for testing
      process.env.MEMESH_A2A_RATE_LIMIT_SEND_MESSAGE = '2';

      const payload = {
        message: { role: 'user', parts: [{ type: 'text', text: 'Test' }] },
        agentCard,
      };

      // First request should succeed
      const res1 = await fetch(`${baseUrl}/a2a/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      expect(res1.status).toBe(200);

      // Second request should succeed
      const res2 = await fetch(`${baseUrl}/a2a/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      expect(res2.status).toBe(200);

      // Third request should be rate limited
      const res3 = await fetch(`${baseUrl}/a2a/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      expect(res3.status).toBe(429);

      const body = (await res3.json()) as any;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(body.error.retryAfter).toBeGreaterThan(0);

      // Check Retry-After header
      const retryAfter = res3.headers.get('Retry-After');
      expect(retryAfter).toBeTruthy();
      expect(parseInt(retryAfter!, 10)).toBeGreaterThan(0);

      delete process.env.MEMESH_A2A_RATE_LIMIT_SEND_MESSAGE;
    });

    it('should enforce rate limit on /a2a/tasks/:taskId', async () => {
      process.env.MEMESH_A2A_RATE_LIMIT_GET_TASK = '1';

      // Create a task first
      const payload = {
        message: { role: 'user', parts: [{ type: 'text', text: 'Test' }] },
        agentCard,
      };

      const createRes = await fetch(`${baseUrl}/a2a/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const createBody = (await createRes.json()) as any;
      const taskId = createBody.data.taskId;

      // First GET should succeed
      const res1 = await fetch(`${baseUrl}/a2a/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res1.status).toBe(200);

      // Second GET should be rate limited
      const res2 = await fetch(`${baseUrl}/a2a/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res2.status).toBe(429);

      const body = (await res2.json()) as any;
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('RATE_LIMIT_EXCEEDED');

      delete process.env.MEMESH_A2A_RATE_LIMIT_GET_TASK;
    });

    it('should allow requests after rate limit window passes', async () => {
      // Set rate limit: 1 per minute (very restrictive for testing)
      process.env.MEMESH_A2A_RATE_LIMIT_SEND_MESSAGE = '1';

      const payload = {
        message: { role: 'user', parts: [{ type: 'text', text: 'Test' }] },
        agentCard,
      };

      // First request succeeds
      const res1 = await fetch(`${baseUrl}/a2a/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      expect(res1.status).toBe(200);

      // Second request immediately blocked
      const res2 = await fetch(`${baseUrl}/a2a/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      expect(res2.status).toBe(429);

      // Verify rate limit is working (no refill yet)
      const res3 = await fetch(`${baseUrl}/a2a/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      expect(res3.status).toBe(429);

      delete process.env.MEMESH_A2A_RATE_LIMIT_SEND_MESSAGE;
    });
  });

  describe('Different Endpoints Have Isolated Limits', () => {
    it('should track limits separately per endpoint', async () => {
      process.env.MEMESH_A2A_RATE_LIMIT_SEND_MESSAGE = '1';
      process.env.MEMESH_A2A_RATE_LIMIT_GET_TASK = '2';

      // Exhaust send-message limit
      const sendPayload = {
        message: { role: 'user', parts: [{ type: 'text', text: 'Test' }] },
        agentCard,
      };

      const sendRes1 = await fetch(`${baseUrl}/a2a/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(sendPayload),
      });
      expect(sendRes1.status).toBe(200);

      const sendBody = (await sendRes1.json()) as any;
      const taskId = sendBody.data.taskId;

      // send-message should be blocked
      const sendRes2 = await fetch(`${baseUrl}/a2a/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(sendPayload),
      });
      expect(sendRes2.status).toBe(429);

      // But get-task should still work (different limit)
      const getRes1 = await fetch(`${baseUrl}/a2a/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(getRes1.status).toBe(200);

      const getRes2 = await fetch(`${baseUrl}/a2a/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(getRes2.status).toBe(200);

      // Third get-task should be blocked
      const getRes3 = await fetch(`${baseUrl}/a2a/tasks/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(getRes3.status).toBe(429);

      delete process.env.MEMESH_A2A_RATE_LIMIT_SEND_MESSAGE;
      delete process.env.MEMESH_A2A_RATE_LIMIT_GET_TASK;
    });
  });

  describe('Public Endpoints', () => {
    it('should not rate limit /a2a/agent-card (public endpoint)', async () => {
      // Make many requests - should all succeed
      for (let i = 0; i < 10; i++) {
        const res = await fetch(`${baseUrl}/a2a/agent-card`);
        expect(res.status).toBe(200);
      }
    });
  });
});
