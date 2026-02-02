/**
 * A2A Protocol Phase 1.0 - E2E Failure Scenarios Test
 *
 * Tests error handling and failure cases:
 * 1. Authentication failure (invalid token)
 * 2. Task timeout detection
 * 3. Invalid message format (missing parts)
 * 4. Task not found (invalid taskId)
 * 5. Concurrent task limit (Phase 1.0: max 1 task)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { withE2EResource } from '../utils/e2e-helpers.js';
import { A2AServer } from '../../src/a2a/server/A2AServer.js';
import { logger } from '../../src/utils/logger.js';

describe('A2A Phase 1.0 - E2E Failure Scenarios', () => {
  let server: A2AServer;
  const testPort = 3301; // Different port to avoid conflicts
  const baseUrl = `http://localhost:${testPort}`;
  const validToken = 'test-e2e-token-failure-scenarios';
  const invalidToken = 'invalid-token-12345';
  const agentId = 'test-agent-failure';

  beforeAll(async () => {
    // Set test token
    process.env.MEMESH_A2A_TOKEN = validToken;

    // Create test agent card
    const testAgentCard = {
      id: agentId,
      name: 'Test Failure Agent',
      version: '1.0.0',
      capabilities: {
        delegation: {
          supportsMCPDelegation: true,
          maxConcurrentTasks: 1
        }
      },
      description: 'E2E test agent for failure scenarios'
    };

    // Start server with proper config
    server = new A2AServer({
      agentId: agentId,
      agentCard: testAgentCard,
      port: testPort
    });
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
    delete process.env.MEMESH_A2A_TOKEN;
  });

  it(
    'should reject request with invalid Bearer token',
    withE2EResource(async () => {
      const response = await fetch(`${baseUrl}/a2a/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${invalidToken}`
        },
        body: JSON.stringify({
          message: {
            role: 'user',
            parts: [{ type: 'text', text: 'Test task' }]
          }
        })
      });

      expect(response.status).toBe(401);
      const error = await response.json();
      expect(error.code).toBe('AUTH_INVALID');
      expect(error.error).toContain('Invalid');
    })
  );

  it(
    'should reject request without Authorization header',
    withE2EResource(async () => {
      const response = await fetch(`${baseUrl}/a2a/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: {
            role: 'user',
            parts: [{ type: 'text', text: 'Test task' }]
          }
        })
      });

      expect(response.status).toBe(401);
      const error = await response.json();
      expect(error.code).toBe('AUTH_MISSING');
      expect(error.error).toContain('required');
    })
  );

  it(
    'should reject request with invalid message format (missing parts)',
    withE2EResource(async () => {
      const response = await fetch(`${baseUrl}/a2a/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify({
          message: {
            role: 'user'
            // Missing 'parts' field
          }
        })
      });

      expect(response.status).toBe(400);
      const error = await response.json();
      expect(error.success).toBe(false);
      expect(error.error.code).toBe('INVALID_REQUEST');
      expect(error.error.message).toContain('message.parts');
    })
  );

  it(
    'should return 404 for non-existent task',
    withE2EResource(async () => {
      const fakeTaskId = 'non-existent-task-id-12345';

      const response = await fetch(`${baseUrl}/a2a/tasks/${fakeTaskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${validToken}`
        }
      });

      expect(response.status).toBe(404);
      const error = await response.json();
      expect(error.success).toBe(false);
      expect(error.error.code).toBe('NOT_FOUND');
    })
  );

  it(
    'should handle task timeout detection',
    withE2EResource(async () => {
      // Set very short timeout (1 second)
      const originalTimeout = process.env.MEMESH_A2A_TASK_TIMEOUT;
      process.env.MEMESH_A2A_TASK_TIMEOUT = '1000'; // 1 second

      // Create task
      const sendResponse = await fetch(`${baseUrl}/a2a/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify({
          message: {
            role: 'user',
            parts: [{ type: 'text', text: 'Timeout test task' }]
          }
        })
      });

      expect(sendResponse.status).toBe(200);
      const sendResult = await sendResponse.json();
      const taskId = sendResult.data.taskId;

      // Get delegator and add task (simulating MCP tool behavior)
      const taskQueue = (server as any).taskQueue;
      const delegator = (server as any).delegator;
      const task = taskQueue.getTask(taskId);
      const taskMessage = task?.messages[0];
      const taskText = taskMessage?.parts.find(p => p.type === 'text')?.text || '';
      await delegator.addTask(taskId, taskText, 'high', agentId);

      // Wait for timeout (1.5 seconds)
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Trigger timeout check
      await delegator.checkTimeouts();

      // Verify task was timed out
      const pendingTasks = await delegator.getPendingTasks(agentId);
      expect(pendingTasks).toHaveLength(0); // Task removed from pending

      // Verify task state in TaskQueue
      const timedOutTask = taskQueue.getTask(taskId);
      expect(timedOutTask?.state).toBe('TIMEOUT');
      expect(timedOutTask?.metadata?.error).toContain('timeout');

      // Restore original timeout
      if (originalTimeout) {
        process.env.MEMESH_A2A_TASK_TIMEOUT = originalTimeout;
      } else {
        delete process.env.MEMESH_A2A_TASK_TIMEOUT;
      }
    })
  );

  it(
    'should enforce Phase 1.0 concurrent task limit (max 1)',
    withE2EResource(async () => {
      // Create first task
      const response1 = await fetch(`${baseUrl}/a2a/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify({
          message: {
            role: 'user',
            parts: [{ type: 'text', text: 'First task' }]
          }
        })
      });

      expect(response1.status).toBe(200);
      const result1 = await response1.json();
      const taskId1 = result1.data.taskId;

      // Get components and add first task to delegator
      const taskQueue = (server as any).taskQueue;
      const delegator = (server as any).delegator;
      const task1 = taskQueue.getTask(taskId1);
      const taskMessage1 = task1?.messages[0];
      const taskText1 = taskMessage1?.parts.find(p => p.type === 'text')?.text || '';
      await delegator.addTask(taskId1, taskText1, 'high', agentId);

      // Try to add second task (should fail due to Phase 1.0 limit)
      const response2 = await fetch(`${baseUrl}/a2a/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${validToken}`
        },
        body: JSON.stringify({
          message: {
            role: 'user',
            parts: [{ type: 'text', text: 'Second task' }]
          }
        })
      });

      expect(response2.status).toBe(200); // HTTP request succeeds
      const result2 = await response2.json();
      const taskId2 = result2.data.taskId;

      // But adding to delegator should fail
      const task2 = taskQueue.getTask(taskId2);
      const taskMessage2 = task2?.messages[0];
      const taskText2 = taskMessage2?.parts.find(p => p.type === 'text')?.text || '';

      await expect(
        delegator.addTask(taskId2, taskText2, 'high', agentId)
      ).rejects.toThrow('Agent already processing a task (Phase 1.0 limitation)');

      // Clean up first task
      await delegator.removeTask(taskId1);
    })
  );
});
