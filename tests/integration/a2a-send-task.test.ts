/**
 * Integration Test: A2A Send Task Flow
 *
 * Tests the complete send-task flow with authentication:
 * HTTP POST → TaskQueue → Task Creation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import { A2AServer } from '../../src/a2a/server/A2AServer.js';
import type { AgentCard } from '../../src/a2a/types/index.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { unlinkSync } from 'fs';

describe('A2A Send Task Integration', () => {
  let server: A2AServer;
  const testToken = 'integration-test-token-123';
  let dbPath: string;

  const testAgentCard: AgentCard = {
    name: 'Test Agent',
    version: '1.0.0',
    description: 'Test agent for integration tests',
    capabilities: {
      skills: [],
    },
  };

  beforeEach(async () => {
    // Setup test database
    const tempId = randomBytes(8).toString('hex');
    dbPath = join(tmpdir(), `a2a-send-test-${tempId}.db`);

    // Create server
    server = new A2AServer({
      agentId: 'test-agent',
      agentCard: testAgentCard,
      portRange: { min: 3200, max: 3299 },
    });

    // Set test token
    process.env.MEMESH_A2A_TOKEN = testToken;

    // Start server
    await server.start();
  });

  afterEach(async () => {
    delete process.env.MEMESH_A2A_TOKEN;

    // Stop server
    if (server) {
      await server.stop();
    }

    // Cleanup test database
    try {
      unlinkSync(dbPath);
    } catch {
      // Ignore cleanup errors
    }
  });

  it('should create task with valid authentication', async () => {
    const response = await request(`http://localhost:${server.getPort()}`)
      .post('/a2a/send-message')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        message: {
          role: 'user',
          parts: [
            {
              type: 'text',
              text: 'integration test task',
            },
          ],
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.taskId).toBeDefined();
    expect(response.body.data.status).toBe('SUBMITTED');

    // Verify in TaskQueue
    const taskQueue = server.getTaskQueue();
    const task = taskQueue.getTask(response.body.data.taskId);
    expect(task).toBeDefined();
    expect(task?.state).toBe('SUBMITTED');
    expect(task?.messages).toHaveLength(1);
    expect(task?.messages[0].parts[0]).toMatchObject({
      type: 'text',
      text: 'integration test task',
    });
  });

  it('should reject request without token', async () => {
    const response = await request(`http://localhost:${server.getPort()}`)
      .post('/a2a/send-message')
      .send({
        message: {
          role: 'user',
          parts: [
            {
              type: 'text',
              text: 'test',
            },
          ],
        },
      });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('AUTH_MISSING');
  });

  it('should reject request with invalid token', async () => {
    const response = await request(`http://localhost:${server.getPort()}`)
      .post('/a2a/send-message')
      .set('Authorization', 'Bearer invalid-token')
      .send({
        message: {
          role: 'user',
          parts: [
            {
              type: 'text',
              text: 'test',
            },
          ],
        },
      });

    expect(response.status).toBe(401);
    expect(response.body.code).toBe('AUTH_INVALID');
  });

  it('should handle message continuation with existing taskId', async () => {
    // Create initial task
    const firstResponse = await request(`http://localhost:${server.getPort()}`)
      .post('/a2a/send-message')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        message: {
          role: 'user',
          parts: [
            {
              type: 'text',
              text: 'first message',
            },
          ],
        },
      });

    expect(firstResponse.status).toBe(200);
    const taskId = firstResponse.body.data.taskId;

    // Send continuation message
    const secondResponse = await request(`http://localhost:${server.getPort()}`)
      .post('/a2a/send-message')
      .set('Authorization', `Bearer ${testToken}`)
      .send({
        taskId,
        message: {
          role: 'assistant',
          parts: [
            {
              type: 'text',
              text: 'second message',
            },
          ],
        },
      });

    expect(secondResponse.status).toBe(200);
    expect(secondResponse.body.data.taskId).toBe(taskId);

    // Verify task has both messages
    const taskQueue = server.getTaskQueue();
    const task = taskQueue.getTask(taskId);
    expect(task?.messages).toHaveLength(2);
    expect(task?.messages[0].parts[0]).toMatchObject({
      type: 'text',
      text: 'first message',
    });
    expect(task?.messages[1].parts[0]).toMatchObject({
      type: 'text',
      text: 'second message',
    });
  });
});
